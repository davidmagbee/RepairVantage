import { gql } from '@apollo/client';

export const taskStatusLabels = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
} as const;

export type TaskStatus = keyof typeof taskStatusLabels;
export const taskStatuses = Object.keys(taskStatusLabels) as TaskStatus[];

export type TaskInput = {
  name: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
};

export interface Task extends TaskInput {
  id: string;
  completedDate: string | null;
}

const TASK_FIELDS = gql`
  fragment TaskFields on Task {
    id
    name
    description
    status
    dueDate
    completedDate
  }
`;

export const GET_PROJECT_TASKS = gql`
  query GetProjectTasks($projectId: ID!) {
    tasks(projectId: $projectId) { ...TaskFields }
  }
  ${TASK_FIELDS}
`;

export const CREATE_PROJECT_TASK = gql`
  mutation CreateProjectTask($input: TaskInput!) {
    createTask(input: $input) { ...TaskFields }
  }
  ${TASK_FIELDS}
`;

export const UPDATE_PROJECT_TASK = gql`
  mutation UpdateProjectTask($id: ID!, $input: TaskUpdateInput!) {
    updateTask(id: $id, input: $input) { ...TaskFields }
  }
  ${TASK_FIELDS}
`;

export const DELETE_PROJECT_TASK = gql`
  mutation DeleteProjectTask($id: ID!) {
    deleteTask(id: $id)
  }
`;
