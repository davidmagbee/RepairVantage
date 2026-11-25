import { authenticated, badInput } from '../policy';
import type { Context } from '../policy';

const dayMs = 86_400_000;

function calendarDay(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value;
  const year = Number(value('year'));
  const day = new Date(0);
  // setUTCFullYear preserves years 0–99; Date.UTC would silently reinterpret them as 1900–1999.
  day.setUTCFullYear(value('era') === 'BC' ? 1 - year : year, Number(value('month')) - 1, Number(value('day')));
  return day.getTime() / dayMs;
}

/** Calendar limits count date labels, not 24-hour buckets: DST can make a local day 23 or 25 hours. */
function validateRange(from: Date, to: Date, timeZone?: string | null) {
  const duration = to.getTime() - from.getTime();
  if (duration <= 0) badInput('Choose a schedule range of up to 93 days');
  if (timeZone == null) {
    // Existing callers retain the original elapsed-time contract.
    if (duration > 93 * dayMs) badInput('Choose a schedule range of up to 93 days');
    return;
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, calendar: 'gregory', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit', era: 'short',
    });
  } catch {
    badInput('Choose a valid schedule time zone');
  }
  // The exclusive endpoint must not count the next date when it lands exactly at local midnight.
  const days = calendarDay(new Date(to.getTime() - 1), formatter) - calendarDay(from, formatter) + 1;
  if (days < 1 || days > 93) badInput('Choose a schedule range of up to 93 local calendar days');
}

function dateOverlap(end: 'endDate' | 'dueDate', from: Date, to: Date) {
  const inRange = { gte: from, lt: to };
  return [
    { startDate: { lt: to }, [end]: { gte: from } },
    // Historical rows can have reversed dates. Treat either endpoint as the earlier one.
    { startDate: { gte: from }, [end]: { lt: to } },
    { startDate: inRange, [end]: null },
    { startDate: null, [end]: inRange },
  ];
}

function scheduledDates(start: Date | null, end: Date | null, from: Date, to: Date) {
  const first = start ?? end;
  const last = end ?? start;
  if (!first || !last) return null;
  const [startAt, endAt] = first <= last ? [first, last] : [last, first];
  return startAt < to && endAt >= from ? { startAt, endAt } : null;
}

export const scheduleQueries = {
  schedule: async (_parent: unknown, { from, to, timeZone }: { from: Date; to: Date; timeZone?: string | null }, context: Context) => {
    const userId = authenticated(context).id;
    validateRange(from, to, timeZone);
    const taskWhere = { OR: dateOverlap('dueDate', from, to) };
    const projects = await context.prisma.project.findMany({
      where: { userId, archivedAt: null, OR: [...dateOverlap('endDate', from, to), { tasks: { some: taskWhere } }] },
      select: {
        id: true, name: true, startDate: true, endDate: true,
        tasks: { where: taskWhere, select: { id: true, name: true, startDate: true, dueDate: true, userId: true } },
        members: { where: { userId: { not: userId }, user: { emailVerified: true } }, select: { userId: true, user: { select: { name: true } } } },
        tools: { where: { tool: { userId } }, select: { quantity: true, tool: { select: { name: true } } }, orderBy: { toolId: 'asc' } },
      },
    });
    const entries = projects.flatMap(project => {
      const tools = project.tools.map(({ tool, quantity }) => ({ name: tool.name, quantity }));
      const common = { projectId: project.id, projectName: project.name, tools };
      const members = new Map(project.members.map(({ userId, user }) => [userId, user.name]));
      const tasks = project.tasks.flatMap(task => {
        const dates = scheduledDates(task.startDate, task.dueDate, from, to);
        // A stale assignment and legacy owner metadata both resolve to an empty assignee.
        const assigneeName = task.userId === null ? null : members.get(task.userId) ?? null;
        return dates ? [{ ...common, ...dates, id: task.id, name: task.name, kind: 'TASK', assigneeName }] : [];
      });
      const dates = scheduledDates(project.startDate, project.endDate, from, to);
      return dates ? [{ ...common, ...dates, id: project.id, name: project.name, kind: 'PROJECT', assigneeName: null }, ...tasks] : tasks;
    });
    return entries.sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id));
  },
};
