import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authClient } from '../context/auth-client';
import { returnPath } from '../context/return-path';

interface Providers {
  google: boolean;
  emailOtp: boolean;
}

export default function Login({ createAccount = false }: { createAccount?: boolean }) {
  const { state, search } = useLocation();
  const params = new URLSearchParams(search);
  const destination = returnPath(state?.returnTo ?? params.get('returnTo'));
  const [providers, setProviders] = useState<Providers | null>(null);
  const [providerError, setProviderError] = useState(false);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const googleError = params.get('error');
  const [message, setMessage] = useState(googleError === 'google_email_not_authoritative'
    ? 'Use an email code to sign in with this address.'
    : googleError ? 'Google sign-in could not be completed. Try again or use an email code.' : '');

  useEffect(() => {
    const request = new AbortController();
    async function loadProviders() {
      try {
        const response = await fetch('/api/auth/providers', { signal: request.signal });
        if (!response.ok) throw new Error('Provider discovery failed');
        const result: Providers = await response.json();
        setProviders(result);
      } catch {
        if (!request.signal.aborted) setProviderError(true);
      }
    }
    void loadProviders();
    return () => request.abort();
  }, []);

  async function requestCode(address: string) {
    setBusy(true);
    setMessage('');
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email: address, type: 'sign-in' });
      if (result.error) throw result.error;
      setSentTo(address);
      setCode('');
    } catch {
      setMessage('Could not send a code. Check the email address or try again later.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentTo) {
      await requestCode(email.trim());
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const result = await authClient.signIn.emailOtp({ email: sentTo, otp: code.trim() });
      if (result.error) throw result.error;
    } catch {
      setMessage('Could not verify that code. Try again or request a new code.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage('');
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: destination,
        errorCallbackURL: `/login?${new URLSearchParams({ returnTo: destination })}`,
      });
      if (result.error) throw result.error;
    } catch {
      setMessage('Google sign-in could not be completed. Try again.');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-12">
      <Link to="/" className="link">RepairVantage</Link>
      <div className="card bg-base-100 shadow">
        <div className="card-body gap-4">
          <h1 className="text-3xl font-bold">{createAccount ? 'Create an account' : 'Sign in'}</h1>
          <p>{createAccount ? 'Start tracking your repair projects.' : 'Open your repair projects.'}</p>
          {message && <p role="alert" className="alert alert-error">{message}</p>}
          {providerError && <p role="alert">Could not load sign-in options. Reload to try again.</p>}
          {!providerError && !providers && <p role="status">Loading sign-in options…</p>}
          {providers && !providers.google && !providers.emailOtp && (
            <p role="status">Sign-in is currently unavailable.</p>
          )}
          {providers?.google && (
            <button className="btn btn-outline w-full" type="button" disabled={busy} onClick={() => void signInWithGoogle()}>
              Continue with Google
            </button>
          )}
          {providers?.google && providers.emailOtp && <div className="divider my-0">or</div>}
          {providers?.emailOtp && (
            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              {!sentTo ? (
                <label className="form-control gap-1">
                  <span>Email address</span>
                  <input
                    className="input input-bordered"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
              ) : (
                <>
                  <p role="status">Check {sentTo} for a one-time code.</p>
                  <label className="form-control gap-1">
                    <span>One-time code</span>
                    <input
                      className="input input-bordered"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      required
                    />
                  </label>
                </>
              )}
              <button className="btn btn-primary w-full" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : sentTo ? 'Verify code' : 'Email me a code'}
              </button>
              {sentTo && (
                <div className="flex flex-wrap gap-3">
                  <button className="link" type="button" disabled={busy} onClick={() => void requestCode(sentTo)}>
                    Send a new code
                  </button>
                  <button className="link" type="button" disabled={busy} onClick={() => { setSentTo(''); setMessage(''); }}>
                    Change email
                  </button>
                </div>
              )}
            </form>
          )}
          {createAccount ? (
            <p>Already registered? <Link to="/login" state={{ returnTo: destination }} className="link">Sign in</Link></p>
          ) : (
            <p>New to RepairVantage? <Link to="/register" state={{ returnTo: destination }} className="link">Create an account</Link></p>
          )}
        </div>
      </div>
    </main>
  );
}
