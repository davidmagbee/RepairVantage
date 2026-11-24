import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Response } from 'express';

/** Change the version whenever the exact declaration or eligibility rule changes. */
export const ELIGIBILITY_POLICY = Object.freeze({
  policyVersion: 'adult-2026-11-24',
  minimumAge: 18,
  statement: 'I confirm that I am at least 18 years old.',
  market: 'US',
  geographicRestriction: false,
});

const cookieName = 'repairvantage.eligibility';
const eligibleLifetime = 10 * 60_000;
const rejectedLifetime = 24 * 60 * 60_000;
interface ScreenProof { policyVersion: string; eligible: boolean; issuedAt: number; expiresAt: number }

/** Proof records a recent browser declaration, never a verified age or a birth date. */
export function createEligibility(config: { authSecret: string; production: boolean }) {
  const signature = (payload: string) => createHmac('sha256', config.authSecret).update(`eligibility:${payload}`).digest();

  function validProof(value: unknown, now = Date.now()): value is ScreenProof {
    if (!value || typeof value !== 'object') return false;
    const proof = value as ScreenProof;
    return proof.policyVersion === ELIGIBILITY_POLICY.policyVersion
      && typeof proof.eligible === 'boolean'
      && Number.isSafeInteger(proof.issuedAt) && proof.issuedAt <= now
      && Number.isSafeInteger(proof.expiresAt) && proof.expiresAt > now
      && proof.expiresAt - proof.issuedAt === (proof.eligible ? eligibleLifetime : rejectedLifetime);
  }

  function read(cookie: string | null | undefined): ScreenProof | null {
    const token = cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!token || !/^[A-Za-z0-9_-]{1,600}\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const [payload, supplied] = token.split('.');
    const expected = signature(payload);
    const actual = Buffer.from(supplied, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    try {
      const proof: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return validProof(proof) ? proof : null;
    } catch {
      return null;
    }
  }

  function set(response: Response, eligible: boolean) {
    const issuedAt = Date.now();
    const lifetime = eligible ? eligibleLifetime : rejectedLifetime;
    const proof: ScreenProof = { policyVersion: ELIGIBILITY_POLICY.policyVersion, eligible, issuedAt, expiresAt: issuedAt + lifetime };
    const payload = Buffer.from(JSON.stringify(proof)).toString('base64url');
    response.cookie(cookieName, `${payload}.${signature(payload).toString('base64url')}`, {
      httpOnly: true, secure: config.production, sameSite: 'lax', path: '/', maxAge: lifetime,
    });
  }

  return { read, set, validProof };
}
