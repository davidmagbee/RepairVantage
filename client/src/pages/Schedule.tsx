import { gql, useQuery } from '@apollo/client';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { privateOperation } from '../graphql/client';
import { useTimeZone } from '../context/TimeZoneContext';
import { addCalendarDaysISO, calendarDateRange, civilDayDistance, dateInput, dayOfWeek, formatDateTime, monthDateRange } from '../time/date-time';

const GET_SCHEDULE = gql`
  query GetSchedule($from: DateTime!, $to: DateTime!, $timeZone: String) {
    schedule(from: $from, to: $to, timeZone: $timeZone) {
      id kind projectId projectName name startAt endAt assigneeName tools { name quantity }
    }
  }
`;

type Entry = {
  id: string; kind: 'PROJECT' | 'TASK'; projectId: string; projectName: string; name: string;
  startAt: string; endAt: string; assigneeName: string | null; tools: { name: string; quantity: number }[];
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function EntryDetails({ entry, timeZone }: { entry: Entry; timeZone: string }) {
  const first = formatDateTime(entry.startAt, timeZone);
  const last = formatDateTime(entry.endAt, timeZone);
  return (
    <div className="space-y-1 text-sm">
      <Link className="link link-hover font-semibold" to={`/projects/${entry.projectId}`}>{entry.name}</Link>
      <p>{entry.kind === 'TASK' ? `Task · ${entry.projectName}` : 'Project'} · {first}{first !== last && ` – ${last}`}</p>
      {entry.assigneeName && <p>Assignee: {entry.assigneeName}</p>}
      {entry.tools.length > 0 && <p>Project tools: {entry.tools.map(tool => `${tool.name} × ${tool.quantity}`).join(', ')}</p>}
    </div>
  );
}

export default function Schedule() {
  const { timeZone } = useTimeZone();
  const [range, setRange] = useState(() => monthDateRange(timeZone));
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar');
  const [rangeError, setRangeError] = useState(false);
  const bounds = calendarDateRange(range.start, range.end, timeZone);
  const count = bounds.ok ? bounds.count : 0;
  const { data, loading, error, refetch } = useQuery<{ schedule: Entry[] }>(GET_SCHEDULE, {
    context: privateOperation, fetchPolicy: 'network-only', skip: !bounds.ok,
    variables: bounds.ok ? { from: bounds.from, to: bounds.to, timeZone } : undefined,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const start = String(fields.get('start'));
    const end = String(fields.get('end'));
    const valid = calendarDateRange(start, end, timeZone).ok;
    setRangeError(!valid);
    if (valid) setRange({ start, end });
  }

  const entries = data?.schedule.map(entry => ({
    entry,
    // Position by civil date, not elapsed 24-hour divisions: daylight-saving days can have 23 or 25 hours.
    firstDay: Math.max(0, civilDayDistance(range.start, dateInput(entry.startAt, timeZone))),
    lastDay: Math.min(count - 1, civilDayDistance(range.start, dateInput(entry.endAt, timeZone))),
  }));

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Schedule</h1>
      <p>Dates are shown in {timeZone.replace(/_/g, ' ')}. The calendar places each item on its first visible day. Timeline shows its full visible span.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <label className="form-control gap-1">From date<input className="input input-bordered" name="start" type="date" defaultValue={range.start} required /></label>
        <label className="form-control gap-1">Through date<input className="input input-bordered" name="end" type="date" defaultValue={range.end} required /></label>
        <button type="submit" className="btn btn-primary">Apply range</button>
      </form>
      {(rangeError || !bounds.ok) && <p role="alert" className="alert alert-error">Choose a date range from 1 to 93 calendar days.</p>}
      <div className="flex gap-2" role="group" aria-label="Schedule view">
        <button type="button" className="btn btn-outline" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</button>
        <button type="button" className="btn btn-outline" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</button>
      </div>
      {loading && <p role="status">Loading schedule…</p>}
      {error && <div className="space-y-2">
        <p role="alert" className="alert alert-error">Could not load schedule.</p>
        <button type="button" className="btn btn-outline" onClick={() => { void refetch().catch(() => {}); }}>Retry schedule</button>
      </div>}
      {bounds.ok && !loading && !error && entries && (entries.length === 0 ? <p>No scheduled work in this range.</p> : view === 'calendar' ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-7 gap-2" aria-hidden="true">
            {weekdays.map(day => <span key={day} className="font-semibold">{day}</span>)}
          </div>
          <ol aria-label="Calendar dates" className="grid min-w-[42rem] grid-cols-7 gap-2">
            {Array.from({ length: count }, (_, index) => {
              const day = addCalendarDaysISO(range.start, index);
              return (
                <li key={day} style={index === 0 ? { gridColumnStart: dayOfWeek(range.start) + 1 } : undefined}
                  className="min-h-16 space-y-2 rounded-box border border-base-300 bg-base-100 p-2">
                  <time dateTime={day} className="text-sm font-semibold">{day}</time>
                  {entries.filter(({ firstDay }) => firstDay === index).map(({ entry }) => (
                    <EntryDetails key={`${entry.kind}:${entry.id}`} entry={entry} timeZone={timeZone} />
                  ))}
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <ol aria-label="Timeline rows" className="space-y-3">
          <li className="flex justify-between text-sm font-semibold">
            <time dateTime={range.start}>{range.start}</time>
            <time dateTime={range.end}>{range.end}</time>
          </li>
          {entries.map(({ entry, firstDay, lastDay }) => (
            <li key={`${entry.kind}:${entry.id}`} className="space-y-2 rounded-box bg-base-100 p-3">
              <EntryDetails entry={entry} timeZone={timeZone} />
              <div aria-hidden="true" className="relative h-3 rounded bg-base-300">
                <div className="absolute h-full rounded bg-primary" style={{ left: `${firstDay / count * 100}%`, width: `${(lastDay - firstDay + 1) / count * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ))}
    </section>
  );
}
