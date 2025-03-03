import { PrismaClient } from '@prisma/client';
import { GraphQLScalarType, Kind } from 'graphql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';

// Custom scalar for DateTime
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Context type
interface Context {
  prisma: PrismaClient;
  user: { id: string; email: string; role: string } | null;
}

// Helper to check if user is authenticated
const ensureAuthenticated = (context: Context) => {
  if (!context.user) {
    throw new AuthenticationError('You must be logged in to perform this action');
  }
  return context.user;
};

// Helper to check if user is admin
const ensureAdmin = (context: Context) => {
  const user = ensureAuthenticated(context);
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }
  return user;
};

export const resolvers = {
  // Custom scalar
  DateTime: dateTimeScalar,

  // Query resolvers
  Query: {
    // User queries
    me: (_: any, __: any, context: Context) => {
      const user = ensureAuthenticated(context);
      return context.prisma.user.findUnique({
        where: { id: user.id },
      });
    },
    
    user: (_: any, { id }: { id: string }, context: Context) => {
      ensureAuthenticated(context);
      return context.prisma.user.findUnique({
        where: { id },
      });
    },
    
    users: (_: any, __: any, context: Context) => {
      ensureAdmin(context);
      return context.prisma.user.findMany();
    },
    
    // Project queries
    project: (_: any, { id }: { id: string }, context: Context) => {
      ensureAuthenticated(context);
      return context.prisma.project.findUnique({
        where: { id },
      });
    },
    
    projects: (_: any, { userId }: { userId?: string }, context: Context) => {
      const user = ensureAuthenticated(context);
      
      // If userId is provided and the requester is an admin, return that user's projects
      // Otherwise, return the authenticated user's projects
      const queryUserId = userId && user.role === 'ADMIN' ? userId : user.id;
      
      return context.prisma.project.findMany({
        where: { userId: queryUserId },
        include: {
          tasks: true,
        },
      });
    },
    
    // Task queries
    task: (_: any, { id }: { id: string }, context: Context) => {
      ensureAuthenticated(context);
      return context.prisma.task.findUnique({
        where: { id },
      });
    },
    
    tasks: (_: any, 
           { projectId, userId, status }: { projectId?: string, userId?: string, status?: string }, 
           context: Context) => {
      ensureAuthenticated(context);
      
      const where: any = {};
      
      if (projectId) {
        where.projectId = projectId;
      }
      
      if (userId) {
        where.userId = userId;
      }
      
      if (status) {
        where.status = status;
      }
      
      return context.prisma.task.findMany({
        where,
        include: {
          project: true,
          user: true,
        },
      });
    },
    
    // Dashboard data
    dashboardData: async (_: any, __: any, context: Context) => {
      const user = ensureAuthenticated(context);
      
      const totalProjects = await context.prisma.project.count({
        where: { userId: user.id },
      });
      
      const completedProjects = await context.prisma.project.count({
        where: { 
          userId: user.id,
          status: 'COMPLETED',
        },
      });
      
      const upcomingDeadlines = await context.prisma.task.findMany({
        where: {
          project: { userId: user.id },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
          status: { not: 'COMPLETED' },
        },
        include: {
          project: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 5,
      });
      
      const projectStatuses = await context.prisma.$queryRaw`
        SELECT "status", COUNT(*) as "count"
        FROM "Project"
        WHERE "userId" = ${user.id}
        GROUP BY "status"
      `;
      
      const recentProjects = await context.prisma.project.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          tasks: {
            select: {
              id: true,
              name: true,
              status: true,
            }
          }
        }
      });
      
      return {
        totalProjects,
        completedProjects,
        upcomingDeadlines,
        projectsByStatus: projectStatuses,
        recentProjects,
      };
    },
  },

  // Mutation resolvers
  Mutation: {
    // Auth mutations
    register: async (_: any, { input }: { input: any }, context: Context) => {
      const { email, password, name, profilePicture } = input;
      
      // Check if user already exists
      const existingUser = await context.prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        throw new UserInputError('User with this email already exists');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await context.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          profilePicture,
        },
      });
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );
      
      return {
        token,
        user,
      };
    },
    
    login: async (_: any, { input }: { input: any }, context: Context) => {
      const { email, password } = input;
      
      // Find user
      const user = await context.prisma.user.findUnique({
        where: { email },
      });
      
      if (!user) {
        throw new UserInputError('Invalid email or password');
      }
      
      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        throw new UserInputError('Invalid email or password');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );
      
      return {
        token,
        user,
      };
    },
    
    // Project mutations
    createProject: async (_: any, { input }: { input: any }, context: Context) => {
      const user = ensureAuthenticated(context);
      
      return context.prisma.project.create({
        data: {
          ...input,
          userId: user.id,
        },
      });
    },
    
    updateProject: async (_: any, { id, input }: { id: string, input: any }, context: Context) => {
      const user = ensureAuthenticated(context);
      
      // Check if project exists and belongs to user
      const project = await context.prisma.project.findUnique({
        where: { id },
      });
      
      if (!project) {
        throw new UserInputError('Project not found');
      }
      
      if (project.userId !== user.id && user.role !== 'ADMIN') {
        throw new ForbiddenError('You do not have permission to update this project');
      }
      
      return context.prisma.project.update({
        where: { id },
        data: input,
      });
    },
    
    deleteProject: async (_: any, { id }: { id: string }, context: Context) => {
      const user = ensureAuthenticated(context);
      
      // Check if project exists and belongs to user
      const project = await context.prisma.project.findUnique({
        where: { id },
      });
      
      if (!project) {
        throw new UserInputError('Project not found');
      }
      
      if (project.userId !== user.id && user.role !== 'ADMIN') {
        throw new ForbiddenError('You do not have permission to delete this project');
      }
      
      await context.prisma.project.delete({
        where: { id },
      });
      
      return true;
    },
    
    // Task mutations
    createTask: async (_: any, { input }: { input: any }, context: Context) => {
      const user = ensureAuthenticated(context);
      
      // Check if project exists and belongs to user
      const project = await context.prisma.project.findUnique({
        where: { id: input.projectId },
      });
      
      if (!project) {
        throw new UserInputError('Project not found');
      }
      
      if (project.userId !== user.id && user.role !== 'ADMIN') {
        throw new ForbiddenError('You do not have permission to add tasks to this project');
      }
      
      return context.prisma.task.create({
        data: {
          ...input,
          userId: input.userId || user.id,
        },
      });
    },
  },

  // Type resolvers
  Project: {
    tasks: (parent: any, _: any, context: Context) => {
      return context.prisma.task.findMany({
        where: { projectId: parent.id },
      });
    },
    parts: (parent: any, _: any, context: Context) => {
      return context.prisma.partProject.findMany({
        where: { projectId: parent.id },
        include: { part: true },
      });
    },
    tools: (parent: any, _: any, context: Context) => {
      return context.prisma.toolProject.findMany({
        where: { projectId: parent.id },
        include: { tool: true },
      });
    },
    events: (parent: any, _: any, context: Context) => {
      return context.prisma.calendarEvent.findMany({
        where: { projectId: parent.id },
      });
    },
    user: (parent: any, _: any, context: Context) => {
      return context.prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },
  
  Task: {
    project: (parent: any, _: any, context: Context) => {
      return context.prisma.project.findUnique({
        where: { id: parent.projectId },
      });
    },
    user: (parent: any, _: any, context: Context) => {
      if (!parent.userId) return null;
      return context.prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
    parts: (parent: any, _: any, context: Context) => {
      return context.prisma.partTask.findMany({
        where: { taskId: parent.id },
        include: { part: true },
      });
    },
    tools: (parent: any, _: any, context: Context) => {
      return context.prisma.toolTask.findMany({
        where: { taskId: parent.id },
        include: { tool: true },
      });
    },
    dependencies: (parent: any, _: any, context: Context) => {
      return context.prisma.dependency.findMany({
        where: { dependentTaskId: parent.id },
      });
    },
    dependsOn: (parent: any, _: any, context: Context) => {
      return context.prisma.dependency.findMany({
        where: { dependencyTaskId: parent.id },
      });
    },
    events: (parent: any, _: any, context: Context) => {
      return context.prisma.calendarEvent.findMany({
        where: { taskId: parent.id },
      });
    },
  },
}; 