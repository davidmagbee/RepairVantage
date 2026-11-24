import { gql } from '@apollo/client';

export type InventoryKind = 'PART' | 'TOOL';
export type InventoryItem = { id: string; kind: InventoryKind; name: string; onHand: number; required: number; shortfall: number };
export type ProjectRequirement = { itemId: string; kind: InventoryKind; name: string; quantity: number };

const ITEM_FIELDS = gql`
  fragment InventoryItemFields on InventoryItem { id kind name onHand required shortfall }
`;
const REQUIREMENT_FIELDS = gql`
  fragment ProjectRequirementFields on ProjectRequirement { itemId kind name quantity }
`;

export const GET_INVENTORY = gql`
  query GetInventory { inventory { ...InventoryItemFields } }
  ${ITEM_FIELDS}
`;
export const CREATE_INVENTORY_ITEM = gql`
  mutation CreateInventoryItem($kind: InventoryKind!, $name: String!, $onHand: Int!) {
    createInventoryItem(kind: $kind, name: $name, onHand: $onHand) { ...InventoryItemFields }
  }
  ${ITEM_FIELDS}
`;
export const UPDATE_INVENTORY_ITEM = gql`
  mutation UpdateInventoryItem($id: ID!, $kind: InventoryKind!, $name: String!, $onHand: Int!) {
    updateInventoryItem(id: $id, kind: $kind, name: $name, onHand: $onHand) { ...InventoryItemFields }
  }
  ${ITEM_FIELDS}
`;
export const GET_PROJECT_REQUIREMENTS = gql`
  query GetProjectRequirements($projectId: ID!) {
    projectRequirements(projectId: $projectId) { ...ProjectRequirementFields }
  }
  ${REQUIREMENT_FIELDS}
`;
export const SET_PROJECT_REQUIREMENT = gql`
  mutation SetProjectRequirement($projectId: ID!, $kind: InventoryKind!, $itemId: ID!, $quantity: Int!) {
    setProjectRequirement(projectId: $projectId, kind: $kind, itemId: $itemId, quantity: $quantity) { ...ProjectRequirementFields }
  }
  ${REQUIREMENT_FIELDS}
`;
export const REMOVE_PROJECT_REQUIREMENT = gql`
  mutation RemoveProjectRequirement($projectId: ID!, $kind: InventoryKind!, $itemId: ID!) {
    removeProjectRequirement(projectId: $projectId, kind: $kind, itemId: $itemId)
  }
`;
