import { taskMutationFields, taskQueryFields, taskTypeFields } from './tasks';
import { inventoryMutationFields, inventoryQueryFields, inventoryTypeFields } from './inventory';
import { reportingMutationFields, reportingQueryFields, reportingTypeFields } from './reporting';
import { scheduleQueryFields, scheduleTypeFields } from './schedule';

// The API exposes supported operations. Remaining Prisma models are reserved for later slices.
export const typeDefs = `
  scalar DateTime

  enum Role { USER ADMIN }
  enum ProjectStatus { PLANNED IN_PROGRESS ON_HOLD COMPLETED CANCELLED }
  enum Priority { LOW MEDIUM HIGH CRITICAL }

  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
    profilePicture: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Project {
    id: ID!
    name: String!
    description: String
    status: ProjectStatus!
    priority: Priority!
    startDate: DateTime
    endDate: DateTime
    notes: String
    budget: Float
    archivedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    tasks: [Task!]!
    canManage: Boolean!
    showcase: ShowcaseProject
    comments: [ProjectComment!]!
  }

  ${taskTypeFields}
  ${inventoryTypeFields}
  ${reportingTypeFields}
  ${scheduleTypeFields}
  type DashboardData {
    totalProjects: Int!
    completedProjects: Int!
    upcomingDeadlines: [Task!]!
    projectsByStatus: [StatusCount!]!
    recentProjects: [Project!]!
  }
  type StatusCount { status: ProjectStatus!, count: Int! }
  type ShowcaseProject {
    slug: String!
    title: String!
    summary: String!
    status: ProjectStatus!
    publishedAt: DateTime!
  }
  type ProjectMemberUser { id: ID!, email: String!, name: String! }
  type ProjectMember { user: ProjectMemberUser!, addedAt: DateTime! }
  type ProjectInvite { id: ID!, email: String!, expiresAt: DateTime! }
  type ProjectInvitation { invite: ProjectInvite!, token: String! }
  type CommentAuthor { name: String! }
  type ProjectComment { id: ID!, body: String!, createdAt: DateTime!, author: CommentAuthor! }

  input ProjectInput {
    name: String!
    description: String
    status: ProjectStatus
    priority: Priority
    startDate: DateTime
    endDate: DateTime
    notes: String
    budget: Float
  }
  input ProjectUpdateInput {
    name: String
    description: String
    status: ProjectStatus
    priority: Priority
    startDate: DateTime
    endDate: DateTime
    notes: String
    budget: Float
  }
  type Query {
    me: User!
    project(id: ID!): Project
    projects: [Project!]!
    sharedProjects: [Project!]!
    projectMembers(projectId: ID!): [ProjectMember!]!
    projectInvites(projectId: ID!): [ProjectInvite!]!
    showcaseProject(slug: String!): ShowcaseProject
    ${taskQueryFields}
    ${inventoryQueryFields}
    ${reportingQueryFields}
    ${scheduleQueryFields}
    dashboardData: DashboardData!
  }
  type Mutation {
    createProject(input: ProjectInput!): Project!
    updateProject(id: ID!, input: ProjectUpdateInput!): Project!
    archiveProject(id: ID!): Project!
    restoreProject(id: ID!): Project!
    deleteProject(id: ID!): Boolean!
    ${taskMutationFields}
    ${inventoryMutationFields}
    ${reportingMutationFields}
    inviteToProject(projectId: ID!, email: String!): ProjectInvitation!
    acceptProjectInvite(token: String!): Project!
    revokeProjectInvite(projectId: ID!, id: ID!): Boolean!
    removeProjectMember(projectId: ID!, userId: ID!): Boolean!
    publishProject(projectId: ID!, title: String!, summary: String!): ShowcaseProject!
    unpublishProject(projectId: ID!): Boolean!
    addProjectComment(projectId: ID!, body: String!): ProjectComment!
  }
`;
