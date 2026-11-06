export const inventoryTypeFields = `
  enum InventoryKind { PART TOOL }

  type InventoryItem {
    id: ID!
    kind: InventoryKind!
    name: String!
    onHand: Int!
    """Whole units required across the owner's non-archived, planned, in-progress, or on-hold projects."""
    required: Float!
    """Whole units missing after comparing required units with stock on hand."""
    shortfall: Float!
  }

  type ProjectRequirement {
    itemId: ID!
    kind: InventoryKind!
    name: String!
    quantity: Int!
  }
`;

export const inventoryQueryFields = `
    inventory: [InventoryItem!]!
    projectRequirements(projectId: ID!): [ProjectRequirement!]!
`;

export const inventoryMutationFields = `
    createInventoryItem(kind: InventoryKind!, name: String!, onHand: Int!): InventoryItem!
    updateInventoryItem(kind: InventoryKind!, id: ID!, name: String!, onHand: Int!): InventoryItem!
    setProjectRequirement(projectId: ID!, kind: InventoryKind!, itemId: ID!, quantity: Int!): ProjectRequirement!
    removeProjectRequirement(projectId: ID!, kind: InventoryKind!, itemId: ID!): Boolean!
`;
