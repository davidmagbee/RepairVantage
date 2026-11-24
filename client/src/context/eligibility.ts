import { useEffect, useReducer, useState } from 'react';

export interface EligibilityStatus {
  policyVersion: string;
  minimumAge: number;
  statement: string;
  market: string;
  geographicRestriction: boolean;
  screened: boolean;
  blocked: boolean;
  acknowledged: boolean;
}

export const ELIGIBILITY_REQUIRED_EVENT = 'repairvantage:eligibility-required';

/** A failed or malformed policy read must never reveal a protected workspace. */
export function useEligibility(refreshKey = 0, enabled = true) {
  const [revision, refresh] = useReducer((value: number) => value + 1, 0);
  const key = `${enabled}:${refreshKey}:${revision}`;
  const [snapshot, setSnapshot] = useState<{ key: string; status: EligibilityStatus | null; error: boolean }>();
  useEffect(() => {
    if (!enabled) return;
    const invalidate = () => refresh();
    window.addEventListener(ELIGIBILITY_REQUIRED_EVENT, invalidate);
    return () => window.removeEventListener(ELIGIBILITY_REQUIRED_EVENT, invalidate);
  }, [enabled]);
  useEffect(() => {
    const request = new AbortController();
    if (!enabled) return () => request.abort();
    void (async () => {
      try {
        const response = await fetch('/api/eligibility/status', { signal: request.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Eligibility unavailable');
        const data: EligibilityStatus = await response.json();
        if (!data || typeof data.policyVersion !== 'string' || typeof data.statement !== 'string'
            || !Number.isInteger(data.minimumAge) || typeof data.market !== 'string'
            || ['geographicRestriction', 'screened', 'blocked', 'acknowledged'].some(key => typeof data[key as keyof EligibilityStatus] !== 'boolean')) {
          throw new Error('Invalid eligibility response');
        }
        if (!request.signal.aborted) setSnapshot({ key, status: data, error: false });
      } catch {
        if (!request.signal.aborted) setSnapshot({ key, status: null, error: true });
      }
    })();
    return () => request.abort();
  }, [enabled, key]);
  // A refresh invalidates the old snapshot during render, before protected children can mount.
  return { status: snapshot?.key === key ? snapshot.status : null, error: snapshot?.key === key && snapshot.error, refresh };
}

/** Only current server policy/version and literal acceptance are submitted, never a caller-selected user. */
export async function postEligibility(path: 'screen' | 'acknowledgment', body: object) {
  const response = await fetch(`/api/eligibility/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Eligibility request failed');
}
