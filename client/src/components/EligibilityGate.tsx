import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../context/auth-client';
import { postEligibility, useEligibility } from '../context/eligibility';
import { Link } from 'react-router-dom';

/** Existing sessions must affirm the current policy too; rendering this gate is supplementary to API denial. */
export default function EligibilityGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { status, error, refresh } = useEligibility(0, Boolean(user));
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);
  const accepted = status?.policyVersion === acceptedVersion;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted || !status) return;
    setBusy(true);
    setMessage('');
    try {
      await postEligibility('acknowledgment', { policyVersion: status.policyVersion, accepted: true });
      refresh();
    } catch {
      setMessage('Could not save your acknowledgment. Reload the policy and try again.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setMessage('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw result.error;
    } catch {
      setMessage('Could not sign out. Try again.');
    } finally {
      setBusy(false);
    }
  }
  if (!user) return children;
  if (status?.acknowledged && !status.blocked) return children;
  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-12">
      <section className="card bg-base-100 shadow"><div className="card-body gap-4">
        <h1 className="text-2xl font-bold">Account eligibility</h1>
        <p className="break-all">Signed in as {user.email}</p>
        <Link className="link" to="/privacy">Privacy and data requests</Link>
        {message && <p role="alert">{message}</p>}
        {error ? <><p role="alert">Could not load account eligibility.</p><button className="btn btn-outline" onClick={refresh}>Retry eligibility</button></>
          : !status ? <p role="status">Checking account eligibility…</p>
          : status.blocked ? <p role="alert">Account access is unavailable. You can sign out below.</p>
          : <form className="space-y-4" onSubmit={event => void confirm(event)}>
            <p>RepairVantage is currently intended for the United States market.</p>
            <label className="flex items-start gap-3"><input className="checkbox mt-1" type="checkbox" checked={accepted} onChange={event => setAcceptedVersion(event.target.checked ? status.policyVersion : null)} required /><span>{status.statement}</span></label>
            <p className="text-sm">Your acknowledgment is recorded with its policy version and time. This is an age declaration.</p>
            <button className="btn btn-primary" disabled={!accepted || busy}>{busy ? 'Saving…' : 'Confirm and continue'}</button>
            {message && <button className="btn btn-outline ml-2" type="button" onClick={() => { setAcceptedVersion(null); refresh(); }}>Reload policy</button>}
          </form>}
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void signOut()}>Sign out</button>
      </div></section>
    </main>
  );
}
