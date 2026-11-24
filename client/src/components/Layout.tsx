import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../context/auth-client';

export default function Layout() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const identity = user?.name || user?.email || '';
  const initials = identity.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw result.error;
    } catch {
      setSignOutError(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="workspace-shell min-h-screen" data-theme="repairvantage">
      <a className="workspace-skip-link print:hidden" href="#workspace-main">Skip to content</a>
      <header className="workspace-header print:hidden">
        <div className="workspace-header__inner">
          <nav aria-label="Workspace" className="workspace-nav">
            <Link to="/" className="workspace-brand">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              RepairVantage
            </Link>
            <div className="workspace-nav__links">
              <NavLink to="/projects/dashboard" className="workspace-nav__link">Dashboard</NavLink>
              {/* Exact matching keeps Projects inactive on Inventory, Schedule, and Dashboard. */}
              <NavLink to="/projects" end className="workspace-nav__link">Projects</NavLink>
              <NavLink to="/projects/inventory" className="workspace-nav__link">Inventory</NavLink>
              <NavLink to="/projects/schedule" className="workspace-nav__link">Schedule</NavLink>
            </div>
          </nav>
          <div className="workspace-account">
            <span className="workspace-avatar" aria-hidden="true">{initials}</span>
            <span className="workspace-identity" title={user?.email}>
              <span>{identity}</span>
              {user?.name && user.name !== user.email && <span className="workspace-identity__email">{user.email}</span>}
            </span>
            <button type="button" className="btn btn-sm workspace-signout" disabled={signingOut} onClick={() => void signOut()}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main id="workspace-main" tabIndex={-1} className="workspace-content">
        {signOutError && <p className="alert alert-error mb-4" role="alert">Could not sign out. Try again.</p>}
        <Outlet />
      </main>
    </div>
  );
}
