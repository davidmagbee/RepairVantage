import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # Scalar types
  scalar DateTime

  # Enums
  enum Role {
    USER
    ADMIN
  }

  enum ProjectStatus {
    PLANNED
    IN_PROGRESS
    ON_HOLD
    COMPLETED
    CANCELLED
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    REVIEW
    COMPLETED
    BLOCKED
  }

  # User types
  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
    profilePicture: String
    createdAt: DateTime!
    updatedAt: DateTime!
    projects: [Project!]!
    tasks: [Task!]!
  }

  input UserInput {
    email: String!
    password: String!
    name: String!
    profilePicture: String
  }

  input UserUpdateInput {
    email: String
    password: String
    name: String
    profilePicture: String
    role: Role
  }

  # Project types
  type Project {
    id: ID!
    name: String!
    description: String
    startDate: DateTime
    endDate: DateTime
    status: ProjectStatus!
    priority: Priority!
    notes: String
    budget: Float
    createdAt: DateTime!
    updatedAt: DateTime!
    tasks: [Task!]!
    parts: [PartProject!]!
    tools: [ToolProject!]!
    events: [CalendarEvent!]!
    user: User!
  }

  input ProjectInput {
    name: String!
    description: String
    startDate: DateTime
    endDate: DateTime
    status: ProjectStatus
    priority: Priority
    notes: String
    budget: Float
  }

  input ProjectUpdateInput {
    name: String
    description: String
    startDate: DateTime
    endDate: DateTime
    status: ProjectStatus
    priority: Priority
    notes: String
    budget: Float
  }

  # Task types
  type Task {
    id: ID!
    name: String!
    description: String
    estimatedHours: Float
    actualHours: Float
    status: TaskStatus!
    startDate: DateTime
    dueDate: DateTime
    completedDate: DateTime
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project!
    user: User
    parts: [PartTask!]!
    tools: [ToolTask!]!
    dependencies: [Dependency!]!
    dependsOn: [Dependency!]!
    events: [CalendarEvent!]!
  }

  input TaskInput {
    name: String!
    description: String
    estimatedHours: Float
    actualHours: Float
    status: TaskStatus
    startDate: DateTime
    dueDate: DateTime
    completedDate: DateTime
    notes: String
    projectId: ID!
    userId: ID
  }

  input TaskUpdateInput {
    name: String
    description: String
    estimatedHours: Float
    actualHours: Float
    status: TaskStatus
    startDate: DateTime
    dueDate: DateTime
    completedDate: DateTime
    notes: String
    projectId: ID
    userId: ID
  }

  # Part types
  type Part {
    id: ID!
    name: String!
    description: String
    price: Float
    url: String
    notes: String
    imageUrl: String
    createdAt: DateTime!
    updatedAt: DateTime!
    projects: [PartProject!]!
    tasks: [PartTask!]!
    dependencies: [Dependency!]!
    requiredFor: [Dependency!]!
  }

  type PartProject {
    part: Part!
    project: Project!
    quantity: Int!
    assignedAt: DateTime!
  }

  type PartTask {
    part: Part!
    task: Task!
    quantity: Int!
    assignedAt: DateTime!
  }

  input PartInput {
    name: String!
    description: String
    price: Float
    url: String
    notes: String
    imageUrl: String
  }

  input PartUpdateInput {
    name: String
    description: String
    price: Float
    url: String
    notes: String
    imageUrl: String
  }

  input PartProjectInput {
    partId: ID!
    projectId: ID!
    quantity: Int
  }

  input PartTaskInput {
    partId: ID!
    taskId: ID!
    quantity: Int
  }

  # Tool types
  type Tool {
    id: ID!
    name: String!
    description: String
    price: Float
    url: String
    notes: String
    imageUrl: String
    createdAt: DateTime!
    updatedAt: DateTime!
    projects: [ToolProject!]!
    tasks: [ToolTask!]!
    dependencies: [Dependency!]!
  }

  type ToolProject {
    tool: Tool!
    project: Project!
    quantity: Int!
    assignedAt: DateTime!
  }

  type ToolTask {
    tool: Tool!
    task: Task!
    quantity: Int!
    assignedAt: DateTime!
  }

  input ToolInput {
    name: String!
    description: String
    price: Float
    url: String
    notes: String
    imageUrl: String
  }

  input ToolUpdateInput {
    name: String
    description: String
    price: Float
    url: String
    notes: String
    imageUrl: String
  }

  input ToolProjectInput {
    toolId: ID!
    projectId: ID!
    quantity: Int
  }

  input ToolTaskInput {
    toolId: ID!
    taskId: ID!
    quantity: Int
  }

  # Dependency types
  type Dependency {
    id: ID!
    dependentTask: Task
    dependencyTask: Task
    dependentPart: Part
    requiredPart: Part
    requiredTool: Tool
    notes: String
  }

  input DependencyInput {
    dependentTaskId: ID
    dependencyTaskId: ID
    dependentPartId: ID
    requiredPartId: ID
    requiredToolId: ID
    notes: String
  }

  # Calendar Event types
  type CalendarEvent {
    id: ID!
    title: String!
    description: String
    startDate: DateTime!
    endDate: DateTime!
    allDay: Boolean!
    location: String
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project
    task: Task
  }

  input CalendarEventInput {
    title: String!
    description: String
    startDate: DateTime!
    endDate: DateTime!
    allDay: Boolean
    location: String
    projectId: ID
    taskId: ID
  }

  input CalendarEventUpdateInput {
    title: String
    description: String
    startDate: DateTime
    endDate: DateTime
    allDay: Boolean
    location: String
    projectId: ID
    taskId: ID
  }

  # Auth types
  type AuthPayload {
    token: String!
    user: User!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  # Query and Mutation types
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users: [User!]!
    
    # Project queries
    project(id: ID!): Project
    projects(userId: ID): [Project!]!
    projectsByStatus(status: ProjectStatus): [Project!]!
    
    # Task queries
    task(id: ID!): Task
    tasks(projectId: ID, userId: ID, status: TaskStatus): [Task!]!
    
    # Part queries
    part(id: ID!): Part
    parts: [Part!]!
    
    # Tool queries
    tool(id: ID!): Tool
    tools: [Tool!]!
    
    # Dependency queries
    dependency(id: ID!): Dependency
    dependencies: [Dependency!]!
    
    # Calendar Event queries
    calendarEvent(id: ID!): CalendarEvent
    calendarEvents(projectId: ID, taskId: ID, startDate: DateTime, endDate: DateTime): [CalendarEvent!]!
    
    # Dashboard data
    dashboardData: DashboardData!
  }

  type DashboardData {
    totalProjects: Int!
    completedProjects: Int!
    upcomingDeadlines: [Task!]!
    projectsByStatus: [StatusCount!]!
    recentProjects: [Project!]!
  }

  type StatusCount {
    status: String!
    count: Int!
  }

  type Mutation {
    # Auth mutations
    register(input: UserInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    
    # User mutations
    updateUser(id: ID!, input: UserUpdateInput!): User!
    deleteUser(id: ID!): Boolean!
    
    # Project mutations
    createProject(input: ProjectInput!): Project!
    updateProject(id: ID!, input: ProjectUpdateInput!): Project!
    deleteProject(id: ID!): Boolean!
    
    # Task mutations
    createTask(input: TaskInput!): Task!
    updateTask(id: ID!, input: TaskUpdateInput!): Task!
    deleteTask(id: ID!): Boolean!
    
    # Part mutations
    createPart(input: PartInput!): Part!
    updatePart(id: ID!, input: PartUpdateInput!): Part!
    deletePart(id: ID!): Boolean!
    
    # Part association mutations
    addPartToProject(input: PartProjectInput!): PartProject!
    removePartFromProject(partId: ID!, projectId: ID!): Boolean!
    addPartToTask(input: PartTaskInput!): PartTask!
    removePartFromTask(partId: ID!, taskId: ID!): Boolean!
    
    # Tool mutations
    createTool(input: ToolInput!): Tool!
    updateTool(id: ID!, input: ToolUpdateInput!): Tool!
    deleteTool(id: ID!): Boolean!
    
    # Tool association mutations
    addToolToProject(input: ToolProjectInput!): ToolProject!
    removeToolFromProject(toolId: ID!, projectId: ID!): Boolean!
    addToolToTask(input: ToolTaskInput!): ToolTask!
    removeToolFromTask(toolId: ID!, taskId: ID!): Boolean!
    
    # Dependency mutations
    createDependency(input: DependencyInput!): Dependency!
    deleteDependency(id: ID!): Boolean!
    
    # Calendar Event mutations
    createCalendarEvent(input: CalendarEventInput!): CalendarEvent!
    updateCalendarEvent(id: ID!, input: CalendarEventUpdateInput!): CalendarEvent!
    deleteCalendarEvent(id: ID!): Boolean!
  }
`; 