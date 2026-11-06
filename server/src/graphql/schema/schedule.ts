export const scheduleTypeFields = `
  enum ScheduleKind { PROJECT TASK }

  type ScheduleTool { name: String!, quantity: Int! }
  type ScheduleEntry {
    id: ID!
    kind: ScheduleKind!
    projectId: ID!
    projectName: String!
    name: String!
    startAt: DateTime!
    endAt: DateTime!
    assigneeName: String
    tools: [ScheduleTool!]!
  }
`;

export const scheduleQueryFields = `
    """Owned work overlapping the range. The start is inclusive and the end is exclusive."""
    schedule(from: DateTime!, to: DateTime!): [ScheduleEntry!]!
`;
