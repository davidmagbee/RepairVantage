import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'tailwindcss/tailwind.css';

const Layout = () => {
  const [theme, setTheme] = useState('repairvantage');
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    // Save theme preference
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'repairvantage' ? 'dark' : 'repairvantage');
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <header className="navbar bg-primary text-primary-content shadow-lg">
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/projects">Projects</Link></li>
              <li><Link to="/tasks">Tasks</Link></li>
              <li><Link to="/inventory">Inventory</Link></li>
              <li><Link to="/calendar">Calendar</Link></li>
            </ul>
          </div>
          <Link to="/" className="btn btn-ghost normal-case text-xl">RepairVantage</Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link to="/" className={isActive('/') ? 'active' : ''}>Dashboard</Link></li>
            <li><Link to="/projects" className={isActive('/projects') ? 'active' : ''}>Projects</Link></li>
            <li><Link to="/tasks" className={isActive('/tasks') ? 'active' : ''}>Tasks</Link></li>
            <li><Link to="/inventory" className={isActive('/inventory') ? 'active' : ''}>Inventory</Link></li>
            <li><Link to="/calendar" className={isActive('/calendar') ? 'active' : ''}>Calendar</Link></li>
          </ul>
        </div>
        <div className="navbar-end">
          <button className="btn btn-ghost btn-circle" onClick={toggleTheme}>
            {theme === 'repairvantage' 
              ? <i className="fa-solid fa-moon"></i> 
              : <i className="fa-solid fa-sun"></i>
            }
          </button>
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary-focus text-primary-content flex items-center justify-center">
                <span>{user?.name?.charAt(0) || 'U'}</span>
              </div>
            </label>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li><a>Profile</a></li>
              <li><a>Settings</a></li>
              <li><a onClick={() => logout()}>Logout</a></li>
            </ul>
          </div>
        </div>
      </header>
      
      <main className="flex-grow p-4">
        <Outlet />
      </main>
      
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <div>
          <p>Copyright © 2025 - RepairVantage Project Management</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 