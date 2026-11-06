import { Prisma, PrismaClient } from '../generated/prisma/client';
import { GraphQLError } from 'graphql';

export interface Context {
  prisma: PrismaClient;
  user: { id: string; email: string; emailVerified: boolean } | null;
}

export function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export function authenticated({ user }: Context) {
  if (!user) throw new GraphQLError('Sign in to continue', { extensions: { code: 'UNAUTHENTICATED' } });
  if (!user.emailVerified) throw new GraphQLError('Verify your email to continue', { extensions: { code: 'FORBIDDEN' } });
  return user;
}

export function visibleProject(userId: string) {
  return { OR: [{ userId }, { members: { some: { userId } } }] } satisfies Prisma.ProjectWhereInput;
}

// Shared reads select these fields explicitly so future private columns stay private by default.
export const sharedProjectFields = {
  id: true,
  userId: true,
  name: true,
  description: true,
  status: true,
  priority: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export function projectNotFound(): never {
  throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } });
}

export function missingProject(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2018', 'P2003'].includes(error.code)) {
    projectNotFound();
  }
  throw error;
}
