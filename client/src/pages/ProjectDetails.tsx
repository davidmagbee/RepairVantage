import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Project Details</h1>
      <p>Details for project ID: {id}</p>
    </div>
  );
};

export default ProjectDetails; 