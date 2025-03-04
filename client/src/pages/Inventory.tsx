import React from 'react';

const Inventory = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <p className="text-lg">Inventory management interface will be implemented here.</p>
          <p className="text-sm text-gray-500 mt-4">Features will include:</p>
          <ul className="list-disc ml-6 mt-2 text-sm text-gray-500">
            <li>Parts and tools tracking</li>
            <li>Inventory levels</li>
            <li>Cost management</li>
            <li>Part-to-project assignments</li>
            <li>Low stock alerts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Inventory; 