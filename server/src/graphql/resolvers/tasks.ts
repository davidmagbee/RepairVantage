import { GraphQLError } from 'graphql';
import { Prisma, TaskStatus } from '../../generated/prisma/client';
import type { Project, Task } from '../../generated/prisma/client';
import {
  authenticated, badInput, lockProject, missingProject, nameInput, requireActiveOwnedProject,
  requireActiveProject, sharedProjectFields,
} from '../policy';
import type { Context } from '../policy';

type TaskFields = {
  description?: string | null;
  status?: TaskStatus | null;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
};
type TaskInput = TaskFields & { projectId: string; name: string };
type TaskUpdateInput = TaskFields & { name?: string | null };
type TaskFilters = { projectId?: string | null; status?: TaskStatus | null };
type TaskWriteTarget = Prisma.TaskWhereUniqueInput & { projectId: string };

const taskOrder = [{ createdAt: 'asc' }, { id: 'asc' }] satisfies Prisma.TaskOrderByWithRelationInput[];

function validatedFields({ description, status, dueDate, estimatedHours, actualHours }: TaskFields) {
  if (description && description.length > 2000) badInput('Description must be at most 2,000 characters');
  if (status === null) badInput('Status cannot be null');
  // Omission preserves the existing value and explicit null clears it.
  for (const hours of [estimatedHours, actualHours]) {
    if (hours != null && (!Number.isFinite(hours) || hours < 0)) badInput('Task hours must be finite and nonnegative');
  }
  return { description, status, dueDate, estimatedHours, actualHours };
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

function verifiedMember(userId: string) {
  return { userId, user: { emailVerified: true } };
}

function visibleTasks(userId: string) {
  // An assignee must still be a verified member of this task's project.
  return {
    OR: [
      { project: { userId } },
      { userId, project: { members: { some: verifiedMember(userId) } } },
    ],
  } satisfies Prisma.TaskWhereInput;
}

function mutateTask<T>(
  context: Context,
  id: string,
  ownerOnly: boolean,
  write: (prisma: Prisma.TransactionClient, where: TaskWriteTarget, previous: TaskStatus) => Promise<T>,
) {
  const { id: userId } = authenticated(context);
  const access = ownerOnly ? { project: { userId } } : visibleTasks(userId);
  return context.prisma.$transaction(async prisma => {
    const task = await prisma.task.findUnique({
      where: { id, ...access },
      select: { projectId: true },
    });
    if (!task) taskNotFound();
    const project = await lockProject(prisma, task.projectId, ownerOnly ? userId : undefined);
    if (!project) taskNotFound();
    // Recheck assignment and membership after the lock. Removal and reassignment take the same lock.
    const where = { id, projectId: task.projectId, ...access };
    const current = await prisma.task.findUniqueOrThrow({ where, select: { status: true } });
    requireActiveProject(project);
    return write(prisma, where, current.status);
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') taskNotFound();
    throw error;
  });
}

export const taskQueries = {
  task: (_parent: unknown, { id }: { id: string }, context: Context) =>
    context.prisma.task.findUnique({ where: { id, ...visibleTasks(authenticated(context).id) } }),
  tasks: (_parent: unknown, { projectId, status }: TaskFilters, context: Context) =>
    context.prisma.task.findMany({
      where: { projectId: projectId ?? undefined, status: status ?? undefined, ...visibleTasks(authenticated(context).id) },
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
        data: { ...fields, name, projectId, completedDate: completionDate(fields.status) },
      });
    }).catch(missingProject);
  },
  updateTask: (_parent: unknown, { id, input }: { id: string; input: TaskUpdateInput }, context: Context) =>
    mutateTask(context, id, false, (prisma, where, previous) => {
      const fields = validatedFields(input);
      if (input.name === null) badInput('Name is required');
      const name = input.name === undefined ? undefined : nameInput(input.name);
      return prisma.task.update({
        where,
        data: { ...fields, name, completedDate: completionDate(fields.status, previous) },
      });
    }),
  deleteTask: (_parent: unknown, { id }: { id: string }, context: Context) =>
    mutateTask(context, id, true, async (prisma, where) => {
      await prisma.task.delete({ where });
      return true;
    }),
  setTaskAssignee: (_parent: unknown, { id, userId }: { id: string; userId?: string | null }, context: Context) =>
    mutateTask(context, id, true, async (prisma, where) => {
      if (userId != null && (userId === authenticated(context).id || !await prisma.projectMember.findFirst({
        where: { projectId: where.projectId, ...verifiedMember(userId) },
        select: { userId: true },
      }))) badInput('Select a verified project member');
      return prisma.task.update({ where, data: { userId: userId ?? null } });
    }),
};

export const taskProjectFields = {
  tasks: (project: Pick<Project, 'id'>, _args: unknown, context: Context) =>
    taskQueries.tasks(project, { projectId: project.id }, context),
};

export const taskResolvers = {
  assignee: async (task: Task, _args: unknown, context: Context) => {
    if (task.userId === null) return null;
    // Earlier tasks stored the owner in userId. That was ownership metadata, not a member assignment.
    const member = await context.prisma.projectMember.findFirst({
      where: { projectId: task.projectId, ...verifiedMember(task.userId), project: { userId: { not: task.userId } } },
      select: { user: { select: { id: true, name: true } } },
    });
    return member?.user ?? null;
  },
  project: async (task: Task, _args: unknown, context: Context) => {
    const { id: userId } = authenticated(context);
    const owned = await context.prisma.project.findUnique({ where: { id: task.projectId, userId } });
    // A nested project selected through an assigned task exposes the same fields as a shared project.
    return owned ?? context.prisma.project.findUniqueOrThrow({
      where: { id: task.projectId, members: { some: verifiedMember(userId) }, tasks: { some: { id: task.id, userId } } },
      select: sharedProjectFields,
    });
  },
};
