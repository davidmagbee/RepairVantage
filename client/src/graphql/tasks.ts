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
  estimatedHours: number | null;
  actualHours: number | null;
};

export interface Task extends TaskInput {
  id: string;
  completedDate: string | null;
  assignee: { id: string; name: string } | null;
}

export type ProjectTaskMember = { user: { id: string; name: string; email: string } };

const TASK_FIELDS = gql`
  fragment TaskFields on Task {
    id
    name
    description
    status
    dueDate
    estimatedHours
    actualHours
    completedDate
    assignee { id name }
  }
`;

export const GET_PROJECT_TASKS = gql`
  query GetProjectTasks($projectId: ID!, $canManage: Boolean!) {
    tasks(projectId: $projectId) { ...TaskFields }
    projectMembers(projectId: $projectId) @include(if: $canManage) {
      user { id name email }
    }
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

export const SET_PROJECT_TASK_ASSIGNEE = gql`
  mutation SetProjectTaskAssignee($id: ID!, $userId: ID) {
    setTaskAssignee(id: $id, userId: $userId) { id assignee { id name } }
  }
`;
