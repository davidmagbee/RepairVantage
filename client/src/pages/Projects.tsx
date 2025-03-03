import React from 'react';
import { Link } from 'react-router-dom';

const Projects: React.FC = () => {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link to="/projects/new" className="btn btn-primary">
          <i className="fa-solid fa-plus mr-2"></i> New Project
        </Link>
      </div>
      
      <div className="card shadow-lg bg-base-100">
        <div className="card-body">
          <p className="text-center text-gray-500 py-8">
            Project listings will appear here. This page is under development.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Projects; 