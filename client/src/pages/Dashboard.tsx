import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_DATA } from '../graphql/queries';
import { format } from 'date-fns';

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
  const { loading, error, data } = useQuery(GET_DASHBOARD_DATA);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="ml-3">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="alert alert-error shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Error loading dashboard data: {error.message}</span>
          </div>
        </div>
      </div>
    );
  }

  const { 
    totalProjects, 
    completedProjects, 
    upcomingDeadlines, 
    projectsByStatus, 
    recentProjects 
  } = data.dashboardData;

  // Calculate completion percentage
  const completionPercentage = totalProjects > 0 
    ? Math.round((completedProjects / totalProjects) * 100) 
    : 0;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="stats shadow w-full mb-8">
        <StatCard 
          title="Total Projects" 
          value={totalProjects} 
          icon="fa-clipboard-list" 
          color="bg-primary" 
        />
        <StatCard 
          title="Completed Projects" 
          value={completedProjects} 
          icon="fa-check-circle" 
          color="bg-success" 
        />
        <StatCard 
          title="Completion Rate" 
          value={`${completionPercentage}%`} 
          icon="fa-chart-line" 
          color="bg-info" 
        />
      </div>
      
      {/* Project Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="card shadow-lg compact bg-base-100">
          <div className="card-body">
            <h2 className="card-title text-lg">Project Status Distribution</h2>
            <div className="flex flex-col gap-2 mt-3">
              {projectsByStatus.map((statusItem: { status: string; count: number }) => (
                <div key={statusItem.status} className="flex justify-between items-center">
                  <span className="text-sm">{statusItem.status.replace('_', ' ')}</span>
                  <div className="flex items-center">
                    <span className="badge badge-primary">{statusItem.count}</span>
                    <div className="w-24 h-2 ml-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(statusItem.count / totalProjects) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Upcoming Deadlines */}
        <div className="card shadow-lg compact bg-base-100">
          <div className="card-body">
            <h2 className="card-title text-lg">Upcoming Deadlines</h2>
            {upcomingDeadlines.length > 0 ? (
              <div className="overflow-x-auto mt-3">
                <table className="table table-compact w-full">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingDeadlines.map((task: any) => (
                      <tr key={task.id}>
                        <td>{task.name}</td>
                        <td>
                          <div className="badge badge-ghost">{task.project.name}</div>
                        </td>
                        <td>{format(new Date(task.dueDate), 'MMM d, yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No upcoming deadlines!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Projects */}
      <div className="card shadow-lg compact bg-base-100 mb-8">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-lg">Recent Projects</h2>
            <a href="/projects" className="btn btn-sm btn-outline btn-primary">View All</a>
          </div>
          {recentProjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Tasks</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project: any) => (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>
                        <div className={`badge ${
                          project.status === 'COMPLETED' ? 'badge-success' : 
                          project.status === 'IN_PROGRESS' ? 'badge-warning' : 
                          'badge-ghost'
                        }`}>
                          {project.status.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        {project.tasks.length} Task{project.tasks.length !== 1 ? 's' : ''}
                      </td>
                      <td>{format(new Date(project.updatedAt), 'MMM d, yyyy')}</td>
                      <td>
                        <a href={`/projects/${project.id}`} className="btn btn-xs btn-ghost">
                          Details
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No projects yet! <a href="/projects/new" className="link link-primary">Create your first project</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 