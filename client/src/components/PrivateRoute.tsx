import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { returnPath } from '../context/return-path';

// Render the pending or failed snapshot the route guard already selected.
function SessionStatus({ loading, retry }: { loading: boolean; retry: () => void }) {
  if (loading) return <p className="p-8 text-center" role="status">Checking your session…</p>;
  return (
    <div className="mx-auto max-w-md space-y-4 p-8">
      <p role="alert">Could not verify your session.</p>
      <button className="btn btn-primary" onClick={retry}>Try again</button>
    </div>
  );
}

export default function PrivateRoute() {
  const { user, loading, error, retry } = useAuth();
  const { pathname } = useLocation();
  if (loading || error) return <SessionStatus loading={loading} retry={retry} />;
  if (!user) return <Navigate to="/login" state={{ returnTo: pathname }} replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading, error, retry } = useAuth();
  const { state, search } = useLocation();
  if (loading || error) return <SessionStatus loading={loading} retry={retry} />;
  if (user) return <Navigate to={returnPath(state?.returnTo ?? new URLSearchParams(search).get('returnTo'))} replace />;
  return <Outlet />;
}
