import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import Dashboard from './Dashboard';
import { GET_DASHBOARD_DATA } from '../graphql/queries';
import { AuthProvider } from '../context/AuthContext';

// Mock the authentication context
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', name: 'Test User' },
    isAuthenticated: true,
    loading: false
  })
}));

// Create mock data for the GraphQL query
const mocks = [
  {
    request: {
      query: GET_DASHBOARD_DATA
    },
    result: {
      data: {
        dashboardData: {
          totalProjects: 5,
          completedProjects: 2,
          upcomingDeadlines: [
            {
              id: '1',
              name: 'Complete kitchen renovation',
              dueDate: '2023-12-25T00:00:00.000Z',
              status: 'IN_PROGRESS',
              project: { id: '101', name: 'Kitchen Remodel' }
            }
          ],
          projectsByStatus: [
            { status: 'PLANNED', count: 1 },
            { status: 'IN_PROGRESS', count: 2 },
            { status: 'COMPLETED', count: 2 }
          ],
          recentProjects: [
            {
              id: '101',
              name: 'Kitchen Remodel',
              status: 'IN_PROGRESS',
              updatedAt: '2023-12-10T00:00:00.000Z',
              tasks: [{ id: '1', name: 'Demolition', status: 'COMPLETED' }]
            }
          ]
        }
      }
    }
  }
];

describe('Dashboard Component', () => {
  it('renders loading state initially', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Dashboard />
      </MockedProvider>
    );
    
    expect(screen.getByText(/Loading dashboard data/i)).toBeInTheDocument();
  });
  
  it('renders dashboard data after loading', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Dashboard />
      </MockedProvider>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard data/i)).not.toBeInTheDocument();
    });
    
    // Check for summary statistics
    expect(screen.getByText(/5/)).toBeInTheDocument(); // Total projects
    expect(screen.getByText(/2/)).toBeInTheDocument(); // Completed projects
    
    // Check for upcoming deadlines
    expect(screen.getByText(/Complete kitchen renovation/i)).toBeInTheDocument();
    
    // Check for recent projects
    expect(screen.getByText(/Kitchen Remodel/i)).toBeInTheDocument();
  });
  
  it('shows error message when data fetch fails', async () => {
    const errorMock = [
      {
        request: {
          query: GET_DASHBOARD_DATA
        },
        error: new Error('Failed to load dashboard data')
      }
    ];
    
    render(
      <MockedProvider mocks={errorMock} addTypename={false}>
        <Dashboard />
      </MockedProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading dashboard data/i)).toBeInTheDocument();
    });
  });
}); 