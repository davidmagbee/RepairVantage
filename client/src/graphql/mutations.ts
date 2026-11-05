import { gql } from '@apollo/client';
import { COMMENT_FIELDS, PROJECT_FIELDS } from './queries';

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

export const UPDATE_PROJECT_STATUS = gql`
  mutation UpdateProjectStatus($id: ID!, $status: ProjectStatus!) {
    updateProject(id: $id, input: { status: $status }) {
      ...ProjectFields
    }
  }
  ${PROJECT_FIELDS}
`;

export const ADD_PROJECT_COMMENT = gql`
  mutation AddProjectComment($projectId: ID!, $body: String!) {
    addProjectComment(projectId: $projectId, body: $body) {
      ...CommentFields
    }
  }
  ${COMMENT_FIELDS}
`;
