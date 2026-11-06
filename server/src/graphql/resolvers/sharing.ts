import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma, Project } from '../../generated/prisma/client';
import { GraphQLError } from 'graphql';
import { authenticated, badInput, Context, missingProject, projectNotFound, sharedProjectFields, visibleProject } from '../policy';

const invitationDurationMs = 7 * 24 * 60 * 60 * 1000;
const inviteFields = { id: true, email: true, expiresAt: true } as const;
const showcaseFields = {
  slug: true, title: true, summary: true, publishedAt: true, project: { select: { status: true } },
} as const;
const commentFields = {
  id: true, body: true, createdAt: true, author: { select: { name: true } },
} as const;

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function textInput(value: string, label: string, maximum: number) {
  const text = value.trim();
  if (!text || text.length > maximum) badInput(`${label} must be 1–${maximum} characters`);
  return text;
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function unavailableInvite(): never {
  throw new GraphQLError('This invitation is unavailable for your account', { extensions: { code: 'INVITE_UNAVAILABLE' } });
}

async function ownedProject(projectId: string, context: Context) {
  const userId = authenticated(context).id;
  if (!await context.prisma.project.findUnique({ where: { id: projectId, userId }, select: { id: true } })) {
    projectNotFound();
  }
  return userId;
}

async function lockProject(prisma: Prisma.TransactionClient, projectId: string, ownerId?: string) {
  const ownership = ownerId === undefined ? Prisma.empty : Prisma.sql`AND "userId" = ${ownerId}`;
  // Serialize invitation and membership changes on the project row, even when no invite/member row exists yet.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "public"."Project" WHERE "id" = ${projectId} ${ownership} FOR UPDATE
  `;
  return rows.length === 1;
}

function showcaseProjection(record: Prisma.ProjectShowcaseGetPayload<{ select: typeof showcaseFields }> | null) {
  if (!record) return null;
  const { project, ...copy } = record;
  return { ...copy, status: project.status };
}

export const sharingQueries = {
  sharedProjects: (_parent: unknown, _args: unknown, context: Context) => {
    const userId = authenticated(context).id;
    return context.prisma.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: sharedProjectFields,
    });
  },
  projectMembers: async (_parent: unknown, { projectId }: { projectId: string }, context: Context) => {
    const userId = await ownedProject(projectId, context);
    return context.prisma.projectMember.findMany({
      where: { projectId, project: { userId } },
      orderBy: { addedAt: 'asc' },
      select: { addedAt: true, user: { select: { id: true, name: true, email: true } } },
    });
  },
  projectInvites: async (_parent: unknown, { projectId }: { projectId: string }, context: Context) => {
    const userId = await ownedProject(projectId, context);
    return context.prisma.projectInvite.findMany({
      where: { projectId, project: { userId }, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
      select: inviteFields,
    });
  },
  showcaseProject: async (_parent: unknown, { slug }: { slug: string }, context: Context) => {
    if (!/^[\w-]{32}$/.test(slug)) return null;
    return showcaseProjection(await context.prisma.projectShowcase.findUnique({
      where: { slug },
      select: showcaseFields,
    }));
  },
};

export const sharingMutations = {
  inviteToProject: async (_parent: unknown, args: { projectId: string; email: string }, context: Context) => {
    const user = authenticated(context);
    const { projectId } = args;
    const email = normalizedEmail(args.email);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) badInput('Enter a valid email address');
    if (email === normalizedEmail(user.email)) badInput('You already own this project');
    // Each reissue invalidates the older link. Return the plaintext only in this response.
    const token = randomBytes(32).toString('base64url');
    const data = { id: randomUUID(), tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + invitationDurationMs) };
    return context.prisma.$transaction(async prisma => {
      if (!await lockProject(prisma, projectId, user.id)) projectNotFound();
      const member = await prisma.projectMember.findFirst({
        where: { projectId, user: { email: { equals: email, mode: 'insensitive' } } },
        select: { userId: true },
      });
      if (member) badInput('This email already has project access');
      const invite = await prisma.projectInvite.upsert({
        where: { projectId_email: { projectId, email } },
        create: { projectId, email, ...data },
        update: data,
        select: inviteFields,
      });
      return { invite, token };
    });
  },
  acceptProjectInvite: (_parent: unknown, { token }: { token: string }, context: Context) => {
    const user = authenticated(context);
    if (!/^[\w-]{43}$/.test(token)) unavailableInvite();
    const now = new Date();
    return context.prisma.$transaction(async prisma => {
      const invite = await prisma.projectInvite.findUnique({
        where: { tokenHash: tokenHash(token), email: normalizedEmail(user.email), expiresAt: { gt: now } },
        select: { id: true, projectId: true },
      });
      if (!invite || !await lockProject(prisma, invite.projectId)) unavailableInvite();
      // The delete claims the invite exactly once. A failed membership write rolls it back.
      const consumed = await prisma.projectInvite.deleteMany({ where: { id: invite.id, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) unavailableInvite();
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
        update: {},
        create: { projectId: invite.projectId, userId: user.id },
      });
      return prisma.project.findUniqueOrThrow({ where: { id: invite.projectId }, select: sharedProjectFields });
    });
  },
  revokeProjectInvite: async (_parent: unknown, { projectId, id }: { projectId: string; id: string }, context: Context) => {
    const userId = authenticated(context).id;
    return context.prisma.$transaction(async prisma => {
      if (!await lockProject(prisma, projectId, userId)) projectNotFound();
      const result = await prisma.projectInvite.deleteMany({ where: { id, projectId } });
      return result.count > 0;
    });
  },
  removeProjectMember: async (_parent: unknown, args: { projectId: string; userId: string }, context: Context) => {
    const ownerId = authenticated(context).id;
    return context.prisma.$transaction(async prisma => {
      if (!await lockProject(prisma, args.projectId, ownerId)) projectNotFound();
      const where = { projectId_userId: args };
      const member = await prisma.projectMember.findUnique({ where, select: { user: { select: { email: true } } } });
      if (!member) return false;
      // Clear any older invitation for the same mailbox before removing access.
      await prisma.projectInvite.deleteMany({ where: { projectId: args.projectId, email: normalizedEmail(member.user.email) } });
      await prisma.projectMember.delete({ where });
      return true;
    });
  },
  publishProject: async (_parent: unknown, args: { projectId: string; title: string; summary: string }, context: Context) => {
    const { projectId } = args;
    await ownedProject(projectId, context);
    const copy = { title: textInput(args.title, 'Title', 120), summary: textInput(args.summary, 'Summary', 2000) };
    const record = await context.prisma.projectShowcase.upsert({
      where: { projectId },
      create: { projectId, slug: randomBytes(24).toString('base64url'), ...copy },
      update: copy,
      select: showcaseFields,
    }).catch(missingProject);
    return showcaseProjection(record);
  },
  unpublishProject: async (_parent: unknown, { projectId }: { projectId: string }, context: Context) => {
    const userId = await ownedProject(projectId, context);
    const result = await context.prisma.projectShowcase.deleteMany({ where: { projectId, project: { userId } } });
    return result.count > 0;
  },
  addProjectComment: (_parent: unknown, args: { projectId: string; body: string }, context: Context) => {
    const userId = authenticated(context).id;
    return context.prisma.projectComment.create({
      data: {
        body: textInput(args.body, 'Comment', 2000),
        project: { connect: { id: args.projectId, ...visibleProject(userId) } },
        author: { connect: { id: userId } },
      },
      select: commentFields,
    }).catch(missingProject);
  },
};

export const sharingProjectFields = {
  showcase: async (project: Project, _args: unknown, context: Context) => {
    if (project.userId !== authenticated(context).id) return null;
    return showcaseProjection(await context.prisma.projectShowcase.findUnique({
      where: { projectId: project.id },
      select: showcaseFields,
    }));
  },
  comments: async (project: Project, _args: unknown, context: Context) => {
    const userId = authenticated(context).id;
    const comments = await context.prisma.projectComment.findMany({
      where: { projectId: project.id, project: visibleProject(userId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: commentFields,
    });
    return comments.reverse();
  },
};
