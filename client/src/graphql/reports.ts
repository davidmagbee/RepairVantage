import { gql } from '@apollo/client';

export type ProjectExpense = {
  id: string;
  description: string;
  amountCents: number;
  createdAt: string;
};

export type ProjectReportTotals = {
  estimatedHours: number;
  actualHours: number;
  totalExpenseCents: number;
  expenses: ProjectExpense[];
};

const EXPENSE_FIELDS = gql`
  fragment ProjectExpenseFields on ProjectExpense {
    id
    description
    amountCents
    createdAt
  }
`;

export const GET_PROJECT_REPORT = gql`
  query GetProjectReport($projectId: ID!) {
    project(id: $projectId) { id name archivedAt }
    projectReport(projectId: $projectId) {
      estimatedHours
      actualHours
      totalExpenseCents
      expenses { ...ProjectExpenseFields }
    }
  }
  ${EXPENSE_FIELDS}
`;

export const ADD_PROJECT_EXPENSE = gql`
  mutation AddProjectExpense($projectId: ID!, $description: String!, $amountCents: Int!) {
    addProjectExpense(projectId: $projectId, description: $description, amountCents: $amountCents) {
      ...ProjectExpenseFields
    }
  }
  ${EXPENSE_FIELDS}
`;
