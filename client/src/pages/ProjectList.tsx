import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Sample project data
const mockProjects = [
  { 
    id: '1', 
    name: 'Kitchen Renovation', 
    status: 'In Progress', 
    progress: 45, 
    dueDate: '2023-08-30',
    client: 'John Smith',
    budget: 15000
  },
  { 
    id: '2', 
    name: 'Bathroom Remodel', 
    status: 'Planning', 
    progress: 15, 
    dueDate: '2023-09-15',
    client: 'Sarah Johnson',
    budget: 8500
  },
  { 
    id: '3', 
    name: 'Deck Repair', 
    status: 'In Progress', 
    progress: 60, 
    dueDate: '2023-07-25',
    client: 'Michael Brown',
    budget: 4200
  },
  { 
    id: '4', 
    name: 'Basement Finishing', 
    status: 'Not Started', 
    progress: 0, 
    dueDate: '2023-10-10',
    client: 'Jessica Davis',
    budget: 22000
  },
  { 
    id: '5', 
    name: 'Roof Replacement', 
    status: 'Completed', 
    progress: 100, 
    dueDate: '2023-06-15',
    client: 'Robert Wilson',
    budget: 12800
  }
];

const statusColors: Record<string, string> = {
  'In Progress': 'badge-primary',
  'Planning': 'badge-secondary',
  'Not Started': 'badge-warning',
  'Completed': 'badge-success',
  'On Hold': 'badge-error'
};

const ProjectList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  
  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || project.status === filter;
    return matchesSearch && matchesFilter;
  });
  
  return (
    <div className="p-6 space-y-8 animate-fadein">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-500">Manage and track all your renovation projects</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link to="/projects/new" className="btn btn-primary btn-animate">
            <i className="fa-solid fa-plus mr-2"></i> Create Project
          </Link>
        </div>
      </header>
      
      {/* Filter and search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-base-100 p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilter('All')} 
            className={`btn btn-sm ${filter === 'All' ? 'btn-primary' : 'btn-ghost'}`}
          >All</button>
          <button 
            onClick={() => setFilter('In Progress')} 
            className={`btn btn-sm ${filter === 'In Progress' ? 'btn-primary' : 'btn-ghost'}`}
          >In Progress</button>
          <button 
            onClick={() => setFilter('Planning')} 
            className={`btn btn-sm ${filter === 'Planning' ? 'btn-primary' : 'btn-ghost'}`}
          >Planning</button>
          <button 
            onClick={() => setFilter('Completed')} 
            className={`btn btn-sm ${filter === 'Completed' ? 'btn-primary' : 'btn-ghost'}`}
          >Completed</button>
        </div>
        <div className="form-control w-full md:w-auto">
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="input input-bordered" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-square">
              <i className="fa-solid fa-search"></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* Projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <Link to={`/projects/${project.id}`} key={project.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-all">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h2 className="card-title">{project.name}</h2>
                <span className={`badge ${statusColors[project.status]}`}>{project.status}</span>
              </div>
              
              <p className="text-sm text-gray-500">Client: {project.client}</p>
              
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={project.progress} 
                  max="100"
                ></progress>
              </div>
              
              <div className="flex justify-between mt-4 text-sm">
                <div className="flex items-center">
                  <i className="fa-solid fa-calendar-day mr-2 text-primary"></i>
                  <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-semibold">${project.budget.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="card-actions justify-end mt-4">
                <button className="btn btn-sm btn-primary">View Details</button>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {filteredProjects.length === 0 && (
        <div className="bg-base-100 p-8 text-center rounded-lg shadow">
          <i className="fa-solid fa-folder-open text-5xl text-gray-300 mb-4"></i>
          <h3 className="text-xl font-bold">No projects found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          <button 
            className="btn btn-primary mt-4"
            onClick={() => {setSearchTerm(''); setFilter('All');}}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectList; 