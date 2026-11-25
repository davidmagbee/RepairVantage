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
    """Owned work overlapping [from, to). An optional timeZone limits the range to 93 local calendar dates; otherwise the limit is 93 elapsed days."""
    schedule(from: DateTime!, to: DateTime!, timeZone: String): [ScheduleEntry!]!
`;
