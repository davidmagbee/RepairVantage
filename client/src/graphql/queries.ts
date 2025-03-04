import { gql } from '@apollo/client';

export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    dashboardData {
      totalProjects
      completedProjects
      upcomingDeadlines {
        id
        name
        dueDate
      }
    }
  }
`;

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      status
      progress
      dueDate
      client
      budget
    }
  }
`;

export const GET_PROJECT_DETAILS = gql`
  query GetProjectDetails($id: ID!) {
    project(id: $id) {
      id
      name
      description
      startDate
      endDate
      status
      priority
      notes
      budget
      tasks {
        id
        name
        status
        dueDate
      }
      parts {
        part {
          id
          name
          price
        }
        quantity
      }
      tools {
        tool {
          id
          name
        }
      }
    }
  }
`;

// Additional queries will be added as needed 