export const taskTypeFields = `
  enum TaskStatus { TODO IN_PROGRESS REVIEW COMPLETED BLOCKED }
  type TaskAssignee { id: ID!, name: String! }

  type Task {
    id: ID!
    name: String!
    description: String
    status: TaskStatus!
    dueDate: DateTime
    """Completion time recorded when the task enters COMPLETED. Older completed tasks may have no recorded time."""
    completedDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    project: Project!
    assignee: TaskAssignee
  }

  input TaskInput {
    name: String!
    description: String
    status: TaskStatus
    dueDate: DateTime
    projectId: ID!
  }

  input TaskUpdateInput {
    name: String
    description: String
    status: TaskStatus
    dueDate: DateTime
  }
`;

export const taskQueryFields = `
    task(id: ID!): Task
    tasks(projectId: ID, status: TaskStatus): [Task!]!
`;

export const taskMutationFields = `
    createTask(input: TaskInput!): Task!
    updateTask(id: ID!, input: TaskUpdateInput!): Task!
    deleteTask(id: ID!): Boolean!
    """Assign to a verified project member. Null or an omitted userId clears the assignment."""
    setTaskAssignee(id: ID!, userId: ID): Task!
`;
