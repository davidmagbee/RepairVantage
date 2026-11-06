import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Public entry point. It describes the workflow without reading workspace data. */
export default function Landing() {
  const { user, loading, error, retry } = useAuth();
  // A pending or failed session lookup cannot distinguish a visitor from a signed-in user.
  const sessionResolved = !loading && !error;

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
        <Link to="/" className="text-lg font-bold tracking-tight text-base-content">RepairVantage</Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          {loading && <p role="status" className="text-sm">Checking your session…</p>}
          {!loading && error && (
            <>
              <p role="alert" className="text-sm">Could not verify your session.</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={retry}>Try again</button>
            </>
          )}
          {sessionResolved && (user ? (
            <Link to="/projects" className="btn btn-primary btn-sm">Projects</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Create account</Link>
            </>
          ))}
        </nav>
      </header>

      <main>
        <section className="border-y border-base-300 bg-base-200">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <p className="mb-4 font-semibold text-primary">Repair project workspace</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Keep repair projects organized and people informed.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed">
              Track a repair from planning to completion. Keep project details in one place and give the people involved a clear view of its status.
            </p>
            {sessionResolved && (
              <Link to={user ? '/projects/new' : '/register'} className="btn btn-primary mt-7">Start a project</Link>
            )}
          </div>
        </section>

        <section aria-labelledby="workflow-heading" className="mx-auto max-w-6xl px-6 py-14">
          <h2 id="workflow-heading" className="text-2xl font-bold tracking-tight">How it works</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            <li className="rounded-box border border-base-300 p-5">
              <h3 className="font-bold">Track the work</h3>
              <p className="mt-2">Create a private project and keep its scope and status together.</p>
            </li>
            <li className="rounded-box border border-base-300 p-5">
              <h3 className="font-bold">Invite people</h3>
              <p className="mt-2">Give selected people access to the project so they can follow its progress.</p>
            </li>
            <li className="rounded-box border border-base-300 p-5">
              <h3 className="font-bold">Share a showcase</h3>
              <p className="mt-2">Publish a separate project summary when you want others to see the work.</p>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
