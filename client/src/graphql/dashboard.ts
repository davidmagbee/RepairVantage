import { gql } from '@apollo/client';

// Request real owner data only; the dashboard has no fallback fixtures or synthesized activity.
export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    dashboardData {
      totalProjects
      completedProjects
      projectsByStatus { status count }
      recentProjects { id name status updatedAt }
      upcomingDeadlines { id name dueDate project { id name } }
    }
  }
`;

export interface DashboardData {
  totalProjects: number;
  completedProjects: number;
  projectsByStatus: { status: string; count: number }[];
  recentProjects: { id: string; name: string; status: string; updatedAt: string }[];
  upcomingDeadlines: { id: string; name: string; dueDate: string | null; project: { id: string; name: string } }[];
}
