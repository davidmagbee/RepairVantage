import { publicDatabaseUrl } from './db-url';

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const databaseUrl = publicDatabaseUrl(env.DATABASE_URL ?? '', 'DATABASE_URL');

  const origin = env.APP_ORIGIN ?? (production ? '' : 'http://localhost:5173');
  let appOrigin: URL;
  try {
    appOrigin = new URL(origin);
  } catch {
    throw new Error('APP_ORIGIN must be the exact browser origin');
  }
  if (appOrigin.origin !== origin || (production ? appOrigin.protocol !== 'https:' : !/^https?:$/.test(appOrigin.protocol))) {
    throw new Error('APP_ORIGIN must be an HTTP origin without a trailing slash and use HTTPS in production');
  }

  const port = Number(env.PORT ?? 4000);
  const proxyHops = Number(env.TRUST_PROXY_HOPS ?? 0);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }
  if (!Number.isInteger(proxyHops) || proxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a nonnegative integer');
  }
  const otpDailyLimit = Number(env.AUTH_OTP_DAILY_LIMIT ?? 75);
  if (!Number.isSafeInteger(otpDailyLimit) || otpDailyLimit < 1 || otpDailyLimit > 1_000_000) {
    throw new Error('AUTH_OTP_DAILY_LIMIT must be an integer between 1 and 1000000');
  }
  const authSecret = env.BETTER_AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  }
  const googleId = env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const resendKey = env.RESEND_API_KEY?.trim();
  const authEmailFrom = env.AUTH_EMAIL_FROM?.trim();
  // A partially configured provider stays disabled. Public pages and existing sessions can still load.
  return {
    production, databaseUrl, origin, port, proxyHops, authSecret, otpDailyLimit,
    google: googleId && googleSecret ? { clientId: googleId, clientSecret: googleSecret } : undefined,
    email: resendKey && authEmailFrom ? { apiKey: resendKey, from: authEmailFrom } : undefined,
  };
}
