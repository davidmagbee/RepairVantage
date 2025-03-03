import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'fa-solid fa-gauge-high' },
    { name: 'Projects', path: '/projects', icon: 'fa-solid fa-diagram-project' },
    { name: 'Tasks', path: '/tasks', icon: 'fa-solid fa-list-check' },
    { name: 'Inventory', path: '/inventory', icon: 'fa-solid fa-boxes-stacked' },
    { name: 'Calendar', path: '/calendar', icon: 'fa-solid fa-calendar-days' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="drawer lg:drawer-open">
      <input 
        id="drawer-toggle" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={sidebarOpen}
        onChange={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Page content */}
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <div className="navbar bg-base-100 shadow-md lg:hidden">
          <div className="flex-none">
            <label htmlFor="drawer-toggle" className="btn btn-square btn-ghost drawer-button">
              <i className="fa-solid fa-bars"></i>
            </label>
          </div>
          <div className="flex-1">
            <Link to="/" className="btn btn-ghost normal-case text-xl">RepairVantage</Link>
          </div>
          <div className="flex-none">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <img src={user?.profilePicture || 'https://placehold.co/400x400?text=User'} alt="avatar" />
                </div>
              </label>
              <ul tabIndex={0} className="mt-3 p-2 shadow menu menu-compact dropdown-content bg-base-100 rounded-box w-52">
                <li><a>Profile</a></li>
                <li><a>Settings</a></li>
                <li><a onClick={handleLogout}>Logout</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-base-200">
          <Outlet />
        </main>
      </div>
      
      {/* Sidebar */}
      <div className="drawer-side">
        <label htmlFor="drawer-toggle" className="drawer-overlay"></label> 
        <aside className="bg-base-100 w-64 h-full border-r">
          <div className="px-4 py-6 text-center border-b">
            <Link to="/" className="text-2xl font-bold">RepairVantage</Link>
          </div>
          
          {/* Navigation */}
          <ul className="menu p-4 w-full text-base-content gap-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`flex items-center p-2 rounded-lg ${isActive(item.path) ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={`${item.icon} w-5 h-5`}></i>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          
          {/* User section at bottom */}
          <div className="border-t mt-auto p-4">
            <div className="flex items-center">
              <div className="avatar">
                <div className="w-10 rounded-full">
                  <img src={user?.profilePicture || 'https://placehold.co/400x400?text=User'} alt="avatar" />
                </div>
              </div>
              <div className="ml-3">
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button 
              className="btn btn-sm btn-outline w-full mt-4"
              onClick={handleLogout}
            >
              <i className="fa-solid fa-sign-out-alt mr-2"></i> Logout
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Layout; 