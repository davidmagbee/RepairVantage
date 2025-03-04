import React from 'react';

const Tasks = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Tasks</h1>
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <p className="text-lg">Task management interface will be implemented here.</p>
          <p className="text-sm text-gray-500 mt-4">Features will include:</p>
          <ul className="list-disc ml-6 mt-2 text-sm text-gray-500">
            <li>Task creation and editing</li>
            <li>Task assignments</li>
            <li>Deadline management</li>
            <li>Status tracking</li>
            <li>Drag-and-drop functionality</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Tasks; 