import { gql } from '@apollo/client';

export interface ShowcaseProject {
  slug: string;
  title: string;
  summary: string;
  status: string;
}

interface ProjectInvite {
  id: string;
  email: string;
  expiresAt: string;
}

export interface ProjectSharingData {
  project: { showcase: ShowcaseProject | null } | null;
  projectInvites: ProjectInvite[];
  projectMembers: { user: { id: string; name: string; email: string } }[];
}

export interface InvitationData {
  inviteToProject: { token: string };
}

// Showcase has its own type and projection. It never requests workspace fields.
const SHOWCASE_FIELDS = gql`
  fragment ShowcaseFields on ShowcaseProject { slug title summary status }
`;

export const GET_SHOWCASE = gql`
  query ShowcaseProject($slug: String!) {
    showcaseProject(slug: $slug) { ...ShowcaseFields }
  }
  ${SHOWCASE_FIELDS}
`;

export const GET_PROJECT_SHARING = gql`
  query ProjectSharing($projectId: ID!) {
    project(id: $projectId) { showcase { ...ShowcaseFields } }
    projectInvites(projectId: $projectId) { id email expiresAt }
    projectMembers(projectId: $projectId) { user { id name email } }
  }
  ${SHOWCASE_FIELDS}
`;

export const PUBLISH_PROJECT = gql`
  mutation PublishProject($projectId: ID!, $title: String!, $summary: String!) {
    publishProject(projectId: $projectId, title: $title, summary: $summary) { slug }
  }
`;

export const UNPUBLISH_PROJECT = gql`
  mutation UnpublishProject($projectId: ID!) { unpublishProject(projectId: $projectId) }
`;

export const INVITE_TO_PROJECT = gql`
  mutation InviteToProject($projectId: ID!, $email: String!) {
    inviteToProject(projectId: $projectId, email: $email) { token }
  }
`;

export const REVOKE_PROJECT_INVITE = gql`
  mutation RevokeProjectInvite($projectId: ID!, $id: ID!) {
    revokeProjectInvite(projectId: $projectId, id: $id)
  }
`;

export const REMOVE_PROJECT_MEMBER = gql`
  mutation RemoveProjectMember($projectId: ID!, $userId: ID!) {
    removeProjectMember(projectId: $projectId, userId: $userId)
  }
`;
