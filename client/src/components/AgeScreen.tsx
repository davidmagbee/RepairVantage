import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { postEligibility, useEligibility } from '../context/eligibility';

/** Screen every authentication entry point because sign-in also supports implicit account creation. */
export default function AgeScreen({ children, refreshKey }: { children: ReactNode; refreshKey: number }) {
  const { status, error, refresh } = useEligibility(refreshKey);
  const [age, setAge] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function screen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      await postEligibility('screen', { age: Number(age) });
    } catch {
      setFailed(true);
    } finally {
      // An under-age response sets a rejection cookie; re-read it instead of offering an immediate retry.
      refresh();
      setBusy(false);
    }
  }

  if (error) return <div className="space-y-3"><p role="alert">Could not load account eligibility.</p><button className="btn btn-outline" onClick={refresh}>Retry eligibility</button></div>;
  if (!status) return <p role="status">Checking account eligibility…</p>;
  if (status.blocked) return <p role="alert">Account access is unavailable. RepairVantage accounts are for people aged {status.minimumAge} or older.</p>;
  if (status.screened) return children;
  return (
    <form className="space-y-4" onSubmit={event => void screen(event)}>
      <p>Before continuing, enter your age in years. Your exact age is not retained.</p>
      {failed && <p role="alert">Could not check eligibility. Try again.</p>}
      <label className="form-control gap-1">
        <span>Age in years</span>
        <input className="input input-bordered" type="number" inputMode="numeric" min="0" max="130" step="1" value={age} onChange={event => setAge(event.target.value)} required />
      </label>
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
    </form>
  );
}
