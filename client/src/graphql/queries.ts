import { gql } from '@apollo/client';

export const PROJECT_FIELDS = gql`
  fragment ProjectFields on Project {
    id
    name
    description
    status
    priority
    canManage
  }
`;

export const COMMENT_FIELDS = gql`
  fragment CommentFields on ProjectComment {
    id
    body
    createdAt
    author { name }
  }
`;

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      ...ProjectFields
      archivedAt
    }
    sharedProjects {
      ...ProjectFields
      archivedAt
    }
  }
  ${PROJECT_FIELDS}
`;

export const GET_PROJECT_DETAILS = gql`
  query GetProjectDetails($id: ID!) {
    project(id: $id) {
      ...ProjectFields
      archivedAt
      startDate
      endDate
      comments {
        ...CommentFields
      }
    }
  }
  ${PROJECT_FIELDS}
  ${COMMENT_FIELDS}
`;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  canManage: boolean;
  archivedAt: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ProjectComment {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string };
}

export interface ProjectWithComments extends Project {
  comments: ProjectComment[];
}
