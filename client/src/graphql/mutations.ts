import { gql } from '@apollo/client';

export const LOGIN_USER = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        name
        email
        role
        profilePicture
      }
    }
  }
`;

export const REGISTER_USER = gql`
  mutation Register($input: UserInput!) {
    register(input: $input) {
      token
      user {
        id
        name
        email
        role
        profilePicture
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
      startDate
      endDate
      status
      priority
      notes
      budget
    }
  }
`;

// Other mutations will be added as needed 