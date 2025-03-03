import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Project Details</h1>
      
      <div className="card shadow-lg bg-base-100">
        <div className="card-body">
          <p className="text-center text-gray-500 py-8">
            Details for project ID: {id}. This page is under development.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails; 