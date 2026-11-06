import { GraphQLError } from 'graphql';
import { Prisma, TaskStatus } from '../../generated/prisma/client';
import type { Project, Task } from '../../generated/prisma/client';
import { authenticated, badInput, missingProject, nameInput, requireActiveOwnedProject } from '../policy';
import type { Context } from '../policy';

type TaskFields = { description?: string | null; status?: TaskStatus | null; dueDate?: Date | null };
type TaskInput = TaskFields & { projectId: string; name: string };
type TaskUpdateInput = TaskFields & { name?: string | null };
type TaskFilters = { projectId?: string | null; status?: TaskStatus | null };

const taskOrder = [{ createdAt: 'asc' }, { id: 'asc' }] satisfies Prisma.TaskOrderByWithRelationInput[];

function validatedFields({ description, status, dueDate }: TaskFields) {
  if (description && description.length > 2000) badInput('Description must be at most 2,000 characters');
  if (status === null) badInput('Status cannot be null');
  return { description, status, dueDate };
}

function completionDate(next: TaskStatus | undefined, previous?: TaskStatus) {
  // Repeating completion keeps the original timestamp, including an unknown legacy date.
  if (next === undefined || next === previous) return undefined;
  if (next === TaskStatus.COMPLETED) return new Date();
  return previous === TaskStatus.COMPLETED ? null : undefined;
}

function taskNotFound(): never {
  throw new GraphQLError('Task not found', { extensions: { code: 'NOT_FOUND' } });
}

function mutateOwnedTask<T>(
  context: Context,
  id: string,
  write: (prisma: Prisma.TransactionClient, where: Prisma.TaskWhereUniqueInput) => Promise<T>,
) {
  const { id: userId } = authenticated(context);
  return context.prisma.$transaction(async prisma => {
    const task = await prisma.task.findUnique({
      where: { id, project: { userId } },
      select: { projectId: true },
    });
    if (!task) taskNotFound();
    // Resolve the owner before taking the shared parent lock. Read mutable task state only after the lock.
    await requireActiveOwnedProject(prisma, task.projectId, userId);
    return write(prisma, { id, projectId: task.projectId });
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') taskNotFound();
    throw error;
  });
}

export const taskQueries = {
  task: (_parent: unknown, { id }: { id: string }, context: Context) =>
    context.prisma.task.findUnique({ where: { id, project: { userId: authenticated(context).id } } }),
  tasks: (_parent: unknown, { projectId, status }: TaskFilters, context: Context) =>
    context.prisma.task.findMany({
      where: { projectId: projectId ?? undefined, status: status ?? undefined, project: { userId: authenticated(context).id } },
      orderBy: taskOrder,
    }),
};

export const taskMutations = {
  createTask: (_parent: unknown, { input }: { input: TaskInput }, context: Context) => {
    const { id: userId } = authenticated(context);
    const { projectId } = input;
    const fields = validatedFields(input);
    const name = nameInput(input.name);
    return context.prisma.$transaction(async prisma => {
      await requireActiveOwnedProject(prisma, projectId, userId);
      return prisma.task.create({
        data: { ...fields, name, projectId, userId, completedDate: completionDate(fields.status) },
      });
    }).catch(missingProject);
  },
  updateTask: (_parent: unknown, { id, input }: { id: string; input: TaskUpdateInput }, context: Context) =>
    mutateOwnedTask(context, id, async (prisma, where) => {
      const fields = validatedFields(input);
      if (input.name === null) badInput('Name is required');
      const name = input.name === undefined ? undefined : nameInput(input.name);
      const previous = await prisma.task.findUniqueOrThrow({ where, select: { status: true } });
      return prisma.task.update({
        where,
        data: { ...fields, name, completedDate: completionDate(fields.status, previous.status) },
      });
    }),
  deleteTask: (_parent: unknown, { id }: { id: string }, context: Context) =>
    mutateOwnedTask(context, id, async (prisma, where) => {
      await prisma.task.delete({ where });
      return true;
    }),
};

export const taskProjectFields = {
  // Shared project membership does not grant task access in the owner-only workflow.
  tasks: (project: Pick<Project, 'id'>, _args: unknown, context: Context) =>
    taskQueries.tasks(project, { projectId: project.id }, context),
};

export const taskResolvers = {
  project: (task: Task, _args: unknown, context: Context) =>
    context.prisma.project.findUniqueOrThrow({ where: { id: task.projectId, userId: authenticated(context).id } }),
};
