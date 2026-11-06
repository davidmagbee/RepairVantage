import { Prisma } from '../../generated/prisma/client';
import { authenticated, badInput, projectNotFound, requireActiveOwnedProject } from '../policy';
import type { Context } from '../policy';

export const reportingQueries = {
  projectReport: (_parent: unknown, { projectId }: { projectId: string }, context: Context) => {
    const { id: userId } = authenticated(context);
    return context.prisma.$transaction(async prisma => {
      if (!await prisma.project.findUnique({ where: { id: projectId, userId }, select: { id: true } })) projectNotFound();
      // A consistent snapshot keeps the displayed expense rows and total aligned with the task-hour totals.
      const { _sum } = await prisma.task.aggregate({
        where: { projectId }, _sum: { estimatedHours: true, actualHours: true },
      });
      const expenses = await prisma.projectExpense.findMany({
        where: { projectId }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      const totalExpenseCents = expenses.reduce((total, { amountCents }) => total + amountCents, 0);
      if (!Number.isSafeInteger(totalExpenseCents)) badInput('Project expense total exceeds the exact reporting range');
      return {
        estimatedHours: _sum.estimatedHours ?? 0,
        actualHours: _sum.actualHours ?? 0,
        totalExpenseCents,
        expenses,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  },
};

export const reportingMutations = {
  addProjectExpense: (
    _parent: unknown,
    { projectId, description, amountCents }: { projectId: string; description: string; amountCents: number },
    context: Context,
  ) => {
    const { id: userId } = authenticated(context);
    const label = description.trim();
    if (!label || label.length > 120) badInput('Expense description must be 1–120 characters');
    if (amountCents <= 0) badInput('Expense amount must be positive whole cents');
    return context.prisma.$transaction(async prisma => {
      await requireActiveOwnedProject(prisma, projectId, userId);
      return prisma.projectExpense.create({ data: { projectId, description: label, amountCents } });
    });
  },
};
