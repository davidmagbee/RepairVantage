import { useEffect, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { privateOperation } from '../graphql/client';

const ACCEPT_PROJECT_INVITE = gql`
  mutation AcceptProjectInvite($token: String!) {
    acceptProjectInvite(token: $token) { id }
  }
`;

const HANDOFF_KEY = 'repairvantage:invitation-handoff';
const HANDOFF_TTL_MS = 15 * 60 * 1000;
const INVITE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
let pendingToken: string | null | undefined;

function readHandoffToken(): string | null {
  try {
    const value = sessionStorage.getItem(HANDOFF_KEY);
    if (!value) return null;
    const { token, expiresAt } = JSON.parse(value);
    return typeof token === 'string' && INVITE_TOKEN.test(token) && expiresAt > Date.now()
      ? token
      : null;
  } catch {
    return null;
  }
}

function clearHandoffToken() {
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    // The browser may block storage. The original invitation can be reopened after sign-in.
  }
}

function saveSignInHandoff(token: string) {
  try {
    // OAuth leaves the app. Keep this one-time token in the current tab briefly across the redirect.
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ token, expiresAt: Date.now() + HANDOFF_TTL_MS }));
  } catch {
    // In-app navigation still has the token in memory.
  }
}

/** Show an invitation without making a request until its recipient confirms. */
export default function AcceptInvitation() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { loading: checkingSession, error: sessionError, retry, user } = useAuth();
  const [restoredToken] = useState(readHandoffToken);
  const [acceptedProjectId, setAcceptedProjectId] = useState<string | null>(null);
  const [failedToken, setFailedToken] = useState<string | null>(null);
  const [accept, { loading: accepting }] = useMutation<
    { acceptProjectInvite: { id: string } },
    { token: string }
  >(ACCEPT_PROJECT_INVITE, { context: privateOperation, fetchPolicy: 'no-cache' });

  const fragmentToken = /^#token=([A-Za-z0-9_-]{43})$/.exec(hash)?.[1] ?? null;
  const token = hash ? fragmentToken : (pendingToken === undefined ? restoredToken : pendingToken);

  useEffect(() => {
    if (hash) {
      // Replace the original entry so later navigation and route state omit the secret.
      pendingToken = fragmentToken;
      clearHandoffToken();
      navigate('/invite', { replace: true });
    } else {
      if (user) pendingToken = token;
      if (user || !token) clearHandoffToken();
    }
  }, [fragmentToken, hash, navigate, token, user]);

  async function acceptInvitation() {
    if (!token || !user || accepting) return;
    setFailedToken(null);

    try {
      const result = await accept({ variables: { token } });
      const projectId = result.data?.acceptProjectInvite.id;
      if (!projectId) {
        setFailedToken(token);
        return;
      }

      if (pendingToken === token) pendingToken = null;
      setAcceptedProjectId(projectId);
    } catch {
      // Raw GraphQL errors can expose details the recipient has no right to see.
      setFailedToken(token);
    }
  }

  if (acceptedProjectId) {
    return <Navigate to={`/projects/${encodeURIComponent(acceptedProjectId)}`} replace />;
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <section aria-labelledby="invitation-heading" className="rounded-box border border-base-300 bg-base-100 p-6 shadow">
        <h1 id="invitation-heading" className="text-2xl font-bold">Project invitation</h1>
        {!token ? (
          <p className="mt-4">Open the original invitation link or ask the project owner for a new one.</p>
        ) : checkingSession ? (
          <p role="status" className="mt-4">Checking your sign-in…</p>
        ) : sessionError ? (
          <>
            <p role="alert" className="mt-4">Couldn’t check your sign-in. Try again.</p>
            <button type="button" className="btn btn-outline mt-5" onClick={retry}>Try again</button>
          </>
        ) : user ? (
          <>
            <p className="mt-4">Accept this invitation with <strong className="break-all">{user.email}</strong>.</p>
            {failedToken === token && (
              <p role="alert" className="alert alert-error mt-4">
                Couldn’t accept this invitation. Check that you’re using the invited email address, or ask the project owner for a new link.
              </p>
            )}
            <button type="button" className="btn btn-primary mt-5" disabled={accepting} onClick={acceptInvitation}>
              {accepting ? 'Accepting invitation…' : 'Accept invitation'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-4">Sign in or create an account with the invited email address.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="btn btn-primary" to="/login" state={{ returnTo: '/invite' }} onClick={() => saveSignInHandoff(token)}>Sign in</Link>
              <Link className="btn btn-outline" to="/register" state={{ returnTo: '/invite' }} onClick={() => saveSignInHandoff(token)}>Create account</Link>
            </div>
            <p className="mt-4 text-sm">If sign-in opens a new tab, reopen the original invitation link after signing in.</p>
          </>
        )}
        <Link
          to="/"
          className="link mt-5 inline-block"
          onClick={() => {
            pendingToken = null;
            clearHandoffToken();
          }}
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
