import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../context/auth-client';

export default function Layout() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

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
    <div className="min-h-screen bg-base-200 text-base-content">
      <header className="border-b border-base-300 bg-base-100 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav aria-label="Workspace" className="flex flex-wrap items-center gap-4">
            <Link to="/" className="text-lg font-bold">RepairVantage</Link>
            <Link to="/projects" className="link link-hover">Projects</Link>
            <Link to="/projects/inventory" className="link link-hover">Inventory</Link>
            <Link to="/projects/schedule" className="link link-hover">Schedule</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">{user?.name || user?.email}</span>
            <button type="button" className="btn btn-sm btn-outline" disabled={signingOut} onClick={() => void signOut()}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {signOutError && <p className="alert alert-error mb-4" role="alert">Could not sign out. Try again.</p>}
        <Outlet />
      </main>
    </div>
  );
}
