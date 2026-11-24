import { GraphQLError } from 'graphql';
import { Prisma, ProjectStatus } from '../../generated/prisma/client';
import { authenticated, badInput, nameInput, projectNotFound, requireActiveOwnedProject } from '../policy';
import type { Context } from '../policy';

type InventoryKind = 'PART' | 'TOOL';
type ItemInput = { kind: InventoryKind; name: string; onHand: number };
type RequirementKey = { projectId: string; kind: InventoryKind; itemId: string };
type NamedItem = { id: string; name: string };
type CatalogItem = NamedItem & { onHand: number; projects: { quantity: number }[] };

const itemFields = { id: true, name: true } as const;
const activeStatus = { in: [ProjectStatus.PLANNED, ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD] };

function inventoryItemNotFound(): never {
  throw new GraphQLError('Inventory item not found', { extensions: { code: 'NOT_FOUND' } });
}

function catalogFields(userId: string) {
  return {
    ...itemFields,
    onHand: true,
    projects: { where: { project: { userId, archivedAt: null, status: activeStatus } }, select: { quantity: true } },
  } as const;
}

function inventoryItem(kind: InventoryKind, { projects, ...item }: CatalogItem) {
  // Requirements express demand. Adding one never changes stock or reserves a unit.
  const required = projects.reduce((sum, { quantity }) => sum + quantity, 0);
  return { ...item, kind, required, shortfall: Math.max(required - item.onHand, 0) };
}

function requirement(kind: InventoryKind, { id: itemId, name }: NamedItem, quantity: number) {
  return { itemId, kind, name, quantity };
}

function stockInput({ name, onHand }: ItemInput) {
  if (onHand < 0) badInput('On-hand quantity must be nonnegative');
  return { name: nameInput(name), onHand };
}

export const inventoryQueries = {
  inventory: async (_parent: unknown, _args: unknown, context: Context) => {
    const userId = authenticated(context).id;
    const where = { userId };
    const select = catalogFields(userId);
    const [parts, tools] = await Promise.all([
      context.prisma.part.findMany({ where, select, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      context.prisma.tool.findMany({ where, select, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
    ]);
    return [...parts.map(part => inventoryItem('PART', part)), ...tools.map(tool => inventoryItem('TOOL', tool))];
  },
  projectRequirements: async (_parent: unknown, { projectId }: { projectId: string }, context: Context) => {
    const userId = authenticated(context).id;
    // Scope both ends so legacy or inconsistent cross-owner links never expose inventory.
    const project = await context.prisma.project.findUnique({
      where: { id: projectId, userId },
      select: {
        parts: { where: { part: { userId } }, select: { quantity: true, part: { select: itemFields } }, orderBy: { partId: 'asc' } },
        tools: { where: { tool: { userId } }, select: { quantity: true, tool: { select: itemFields } }, orderBy: { toolId: 'asc' } },
      },
    });
    if (!project) projectNotFound();
    return [
      ...project.parts.map(({ part, quantity }) => requirement('PART', part, quantity)),
      ...project.tools.map(({ tool, quantity }) => requirement('TOOL', tool, quantity)),
    ];
  },
};

export const inventoryMutations = {
  createInventoryItem: async (_parent: unknown, input: ItemInput, context: Context) => {
    const userId = authenticated(context).id;
    const data = { ...stockInput(input), userId };
    const select = catalogFields(userId);
    const item = await (input.kind === 'PART' ? context.prisma.part.create({ data, select }) : context.prisma.tool.create({ data, select }));
    return inventoryItem(input.kind, item);
  },
  updateInventoryItem: async (_parent: unknown, input: ItemInput & { id: string }, context: Context) => {
    const userId = authenticated(context).id;
    const args = { where: { id: input.id, userId }, data: stockInput(input), select: catalogFields(userId) };
    try {
      const item = await (input.kind === 'PART' ? context.prisma.part.update(args) : context.prisma.tool.update(args));
      return inventoryItem(input.kind, item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') inventoryItemNotFound();
      throw error;
    }
  },
  setProjectRequirement: (_parent: unknown, { projectId, kind, itemId, quantity }: RequirementKey & { quantity: number }, context: Context) => {
    const userId = authenticated(context).id;
    if (quantity < 1) badInput('Required quantity must be positive');
    return context.prisma.$transaction(async prisma => {
      await requireActiveOwnedProject(prisma, projectId, userId);
      const lookup = { where: { id: itemId, userId }, select: itemFields };
      if (kind === 'PART') {
        const item = await prisma.part.findUnique(lookup);
        if (!item) inventoryItemNotFound();
        const key = { projectId, partId: itemId };
        await prisma.partProject.upsert({ where: { partId_projectId: key }, create: { ...key, quantity }, update: { quantity } });
        return requirement(kind, item, quantity);
      }
      const item = await prisma.tool.findUnique(lookup);
      if (!item) inventoryItemNotFound();
      const key = { projectId, toolId: itemId };
      await prisma.toolProject.upsert({ where: { toolId_projectId: key }, create: { ...key, quantity }, update: { quantity } });
      return requirement(kind, item, quantity);
    });
  },
  removeProjectRequirement: (_parent: unknown, { projectId, kind, itemId }: RequirementKey, context: Context) => {
    const userId = authenticated(context).id;
    return context.prisma.$transaction(async prisma => {
      await requireActiveOwnedProject(prisma, projectId, userId);
      const result = await (kind === 'PART'
        ? prisma.partProject.deleteMany({ where: { projectId, partId: itemId, part: { userId } } })
        : prisma.toolProject.deleteMany({ where: { projectId, toolId: itemId, tool: { userId } } }));
      return result.count !== 0;
    });
  },
};
