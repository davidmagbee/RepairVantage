import { Prisma, Project, Task, TaskStatus } from '@prisma/client';
import { GraphQLScalarType, Kind } from 'graphql';
import { authenticated, badInput, Context, missingProject, sharedProjectFields } from '../policy';
import { sharingMutations, sharingProjectFields, sharingQueries } from './sharing';

export type { Context } from '../policy';

type ProjectInput = Omit<Prisma.ProjectUncheckedCreateInput, 'userId' | 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'parts' | 'tools' | 'events'>;
type ProjectUpdateInput = Partial<ProjectInput>;
type TaskInput = { projectId: string; name: string; description?: string | null; status?: TaskStatus; dueDate?: Date | null };

function dateValue(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) badInput('Expected an ISO 8601 date and time');
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) badInput('Invalid date and time');
  return date;
}

function ownerId(context: Context) {
  return authenticated(context).id;
}

function nameInput(name: string) {
  const normalized = name.trim();
  if (!normalized || normalized.length > 120) badInput('Name must be 1–120 characters');
  return normalized;
}

function validateProject(input: ProjectUpdateInput) {
  if (input.name !== undefined && typeof input.name !== 'string') badInput('Name is required');
  if (input.description && input.description.length > 2000) badInput('Description must be at most 2,000 characters');
  if (input.notes && input.notes.length > 5000) badInput('Notes must be at most 5,000 characters');
  if (input.budget != null && input.budget < 0) badInput('Budget must be nonnegative');
  if (input.status === null || input.priority === null) badInput('Status and priority cannot be null');
}

export const resolvers = {
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    serialize: value => {
      if (!(value instanceof Date)) throw new TypeError('Expected a Date result');
      return value.toISOString();
    },
    parseValue: dateValue,
    parseLiteral: ast => dateValue(ast.kind === Kind.STRING ? ast.value : null),
  }),

  Query: {
    ...sharingQueries,
    me: (_parent: unknown, _args: unknown, context: Context) =>
      context.prisma.user.findUniqueOrThrow({
        where: { id: ownerId(context) },
        select: { id: true, name: true, email: true, role: true, profilePicture: true, createdAt: true, updatedAt: true },
      }),
    project: async (_parent: unknown, { id }: { id: string }, context: Context) => {
      const userId = ownerId(context);
      const owned = await context.prisma.project.findUnique({ where: { id, userId } });
      return owned ?? context.prisma.project.findUnique({
        where: { id, members: { some: { userId } } },
        select: sharedProjectFields,
      });
    },
    projects: (_parent: unknown, _args: unknown, context: Context) =>
      context.prisma.project.findMany({ where: { userId: ownerId(context) }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] }),
    task: (_parent: unknown, { id }: { id: string }, context: Context) =>
      context.prisma.task.findUnique({ where: { id, project: { userId: ownerId(context) } } }),
    tasks: (_parent: unknown, { projectId, status }: { projectId?: string; status?: TaskStatus }, context: Context) =>
      context.prisma.task.findMany({ where: { projectId, status, project: { userId: ownerId(context) } } }),
    dashboardData: async (_parent: unknown, _args: unknown, context: Context) => {
      const userId = ownerId(context);
      const now = new Date();
      const [statuses, recentProjects, upcomingDeadlines] = await Promise.all([
        context.prisma.project.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
        context.prisma.project.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 5 }),
        context.prisma.task.findMany({
          where: {
            project: { userId },
            dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) },
            status: { not: 'COMPLETED' },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
        }),
      ]);
      const projectsByStatus = statuses.map(({ status, _count }) => ({ status, count: _count._all }));
      return {
        totalProjects: projectsByStatus.reduce((total, status) => total + status.count, 0),
        completedProjects: projectsByStatus.find(({ status }) => status === 'COMPLETED')?.count ?? 0,
        projectsByStatus,
        recentProjects,
        upcomingDeadlines,
      };
    },
  },

  Mutation: {
    ...sharingMutations,
    createProject: (_parent: unknown, { input }: { input: ProjectInput }, context: Context) => {
      const userId = ownerId(context);
      validateProject(input);
      return context.prisma.project.create({ data: { ...input, name: nameInput(input.name), userId } });
    },
    updateProject: (_parent: unknown, { id, input }: { id: string; input: ProjectUpdateInput }, context: Context) => {
      const userId = ownerId(context);
      validateProject(input);
      return context.prisma.project.update({
        // Scope the write itself so authorization cannot be invalidated between lookup and mutation.
        where: { id, userId },
        data: { ...input, name: input.name === undefined ? undefined : nameInput(input.name) },
      }).catch(missingProject);
    },
    deleteProject: async (_parent: unknown, { id }: { id: string }, context: Context) => {
      await context.prisma.project.delete({ where: { id, userId: ownerId(context) } }).catch(missingProject);
      return true;
    },
    createTask: (_parent: unknown, { input }: { input: TaskInput }, context: Context) => {
      const userId = ownerId(context);
      const { projectId, ...fields } = input;
      if (fields.description && fields.description.length > 2000) badInput('Description must be at most 2,000 characters');
      if (fields.status === null) badInput('Status cannot be null');
      return context.prisma.task.create({
        data: {
          ...fields,
          name: nameInput(input.name),
          project: { connect: { id: projectId, userId } },
          user: { connect: { id: userId } },
        },
      }).catch(missingProject);
    },
  },

  Project: {
    ...sharingProjectFields,
    // Member reads omit private scalar fields at the database boundary. Scope nested tasks here.
    canManage: (project: Project, _args: unknown, context: Context) => project.userId === ownerId(context),
    tasks: (project: Project, _args: unknown, context: Context) =>
      context.prisma.task.findMany({ where: { projectId: project.id, project: { userId: ownerId(context) } } }),
  },
  Task: {
    project: (task: Task, _args: unknown, context: Context) =>
      context.prisma.project.findUniqueOrThrow({ where: { id: task.projectId, userId: ownerId(context) } }),
  },
};
