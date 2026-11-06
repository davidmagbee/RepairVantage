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

// Return each editor's own fields so a late response cannot overwrite another editor's cache entry.
export const UPDATE_PROJECT_STATUS = gql`
  mutation UpdateProjectStatus($id: ID!, $status: ProjectStatus!) {
    updateProject(id: $id, input: { status: $status }) {
      id
      status
    }
  }
`;

export const UPDATE_PROJECT_DETAILS = gql`
  mutation UpdateProjectDetails($id: ID!, $input: ProjectUpdateInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      description
    }
  }
`;

export const ADD_PROJECT_COMMENT = gql`
  mutation AddProjectComment($projectId: ID!, $body: String!) {
    addProjectComment(projectId: $projectId, body: $body) {
      ...CommentFields
    }
  }
  ${COMMENT_FIELDS}
`;
