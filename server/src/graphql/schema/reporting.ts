export const reportingTypeFields = `
  type ProjectExpense {
    id: ID!
    description: String!
    amountCents: Int!
    createdAt: DateTime!
  }

  type ProjectReport {
    estimatedHours: Float!
    actualHours: Float!
    """Whole USD cents. Float preserves integer totals beyond the GraphQL Int range."""
    totalExpenseCents: Float!
    expenses: [ProjectExpense!]!
  }
`;

export const reportingQueryFields = `
    projectReport(projectId: ID!): ProjectReport!
`;

export const reportingMutationFields = `
    addProjectExpense(projectId: ID!, description: String!, amountCents: Int!): ProjectExpense!
`;
