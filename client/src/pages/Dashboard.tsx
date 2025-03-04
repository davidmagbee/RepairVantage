import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_DATA } from '../graphql/queries';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

// Dashboard stats card component
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className={`stat shadow ${color}`}>
    <div className="stat-figure text-white">
      <i className={`fa-solid ${icon} text-3xl`}></i>
    </div>
    <div className="stat-title text-white opacity-80">{title}</div>
    <div className="stat-value text-white">{value}</div>
  </div>
);

const Dashboard: React.FC = () => {
  const { loading, error, data } = useQuery(GET_DASHBOARD_DATA, {
    // Skip the query until backend is ready
    skip: true,
  });

  // Mock data
  const mockData = {
    totalProjects: 5,
    completedProjects: 2,
    upcomingDeadlines: [
      { id: '1', name: 'Kitchen Renovation', dueDate: '2023-07-30' },
      { id: '2', name: 'Bathroom Remodel', dueDate: '2023-08-15' }
    ],
    recentActivity: [
      { id: '1', description: 'Added new part: Kitchen Sink', timestamp: '2023-07-25T10:30:00Z' },
      { id: '2', description: 'Completed task: Wall Framing', timestamp: '2023-07-24T15:45:00Z' },
      { id: '3', description: 'Created new project: Deck Repair', timestamp: '2023-07-23T09:15:00Z' },
    ],
    projectsBreakdown: [
      { status: 'Not Started', count: 1, color: '#818cf8' },
      { status: 'In Progress', count: 2, color: '#22c55e' },
      { status: 'On Hold', count: 0, color: '#f97316' },
      { status: 'Completed', count: 2, color: '#3b82f6' },
    ]
  };

  // Use data from query if available, otherwise use mock data
  const dashboardData = data?.dashboardData || mockData;
  const completionPercentage = Math.round((dashboardData.completedProjects / dashboardData.totalProjects) * 100);
  
  return (
    <div className="p-6 space-y-8 animate-fadein">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome to your project management hub</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link to="/projects/new" className="btn btn-primary btn-animate">
            <i className="fa-solid fa-plus mr-2"></i> New Project
          </Link>
        </div>
      </header>
      
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stats-card p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold opacity-80">Total Projects</h3>
              <p className="text-4xl font-bold mt-2">{dashboardData.totalProjects}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <i className="fa-solid fa-diagram-project text-2xl"></i>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs opacity-80">Project completion</div>
            <div className="w-full bg-white/30 rounded-full h-2.5 mt-1">
              <div 
                className="bg-white h-2.5 rounded-full" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <div className="text-xs mt-1">{completionPercentage}% Complete</div>
          </div>
        </div>
        
        <div className="stats-card from-secondary/90 to-secondary-focus p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold opacity-80">Active Projects</h3>
              <p className="text-4xl font-bold mt-2">{dashboardData.totalProjects - dashboardData.completedProjects}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <i className="fa-solid fa-list-check text-2xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-xs opacity-80">Next deadline</div>
              <div className="font-medium">
                {dashboardData.upcomingDeadlines.length > 0 
                  ? format(new Date(dashboardData.upcomingDeadlines[0].dueDate), 'MMM d, yyyy')
                  : 'No deadlines'
                }
              </div>
            </div>
            <Link to="/tasks" className="text-xs underline">View tasks</Link>
          </div>
        </div>
        
        <div className="stats-card from-accent/90 to-accent-focus p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold opacity-80">Completed</h3>
              <p className="text-4xl font-bold mt-2">{dashboardData.completedProjects}</p>
            </div>
            <div className="rounded-full bg-white/20 p-3">
              <i className="fa-solid fa-check-circle text-2xl"></i>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs opacity-80">Completion rate</div>
            <div className="text-2xl font-medium">
              {dashboardData.totalProjects > 0 
                ? Math.round((dashboardData.completedProjects / dashboardData.totalProjects) * 100)
                : 0}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming deadlines */}
        <div className="card bg-base-100 shadow-lg card-hover">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title text-xl">
                <i className="fa-solid fa-calendar-days text-primary mr-2"></i>
                Upcoming Deadlines
              </h2>
              <span className="badge badge-primary">{dashboardData.upcomingDeadlines.length}</span>
            </div>
            
            {dashboardData.upcomingDeadlines.length > 0 ? (
              <ul className="space-y-3">
                {dashboardData.upcomingDeadlines.map((task: any) => (
                  <li key={task.id} className="p-3 bg-base-200 rounded-lg flex justify-between items-center hover:bg-base-300 transition-colors">
                    <div className="flex items-center">
                      <i className="fa-solid fa-clock-rotate-left text-primary mr-3"></i>
                      <span>{task.name}</span>
                    </div>
                    <span className="badge badge-primary">
                      {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-gray-500">No upcoming deadlines</div>
            )}
            
            <div className="card-actions justify-end mt-4">
              <Link to="/calendar" className="btn btn-sm btn-outline">View Calendar</Link>
            </div>
          </div>
        </div>
        
        {/* Recent activity */}
        <div className="card bg-base-100 shadow-lg card-hover">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title text-xl">
                <i className="fa-solid fa-bolt text-secondary mr-2"></i>
                Recent Activity
              </h2>
            </div>
            
            <ul className="space-y-2">
              {mockData.recentActivity.map((activity: any) => (
                <li key={activity.id} className="p-3 border-b border-base-200 flex items-start">
                  <div className="bg-base-200 rounded-full p-2 mr-3">
                    <i className="fa-solid fa-history text-primary"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-sm btn-outline">View All Activity</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Project status breakdown */}
      <div className="card bg-base-100 shadow-lg card-hover">
        <div className="card-body">
          <h2 className="card-title text-xl mb-6">
            <i className="fa-solid fa-chart-pie text-primary mr-2"></i>
            Project Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {mockData.projectsBreakdown.map((status) => (
              <div key={status.status} className="stat bg-base-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="stat-figure text-primary">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                </div>
                <div className="stat-title text-xs">{status.status}</div>
                <div className="stat-value text-2xl">{status.count}</div>
              </div>
            ))}
          </div>
          
          <div className="card-actions justify-end mt-6">
            <Link to="/projects" className="btn btn-primary">
              Manage Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 