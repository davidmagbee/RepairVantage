import { createHmac } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { emailOTP } from 'better-auth/plugins';
import { Resend } from 'resend';
import type { readConfig } from './config.js';

type IdentityConfig = ReturnType<typeof readConfig>;
type CodeSender = (email: string, code: string) => Promise<void>;

/** Provider errors can contain recipient information. Return a fixed message to the browser. */
function makeCodeSender(config: NonNullable<IdentityConfig['email']>): CodeSender {
  const resend = new Resend(config.apiKey);
  return async (email, code) => {
    try {
      const { error } = await resend.emails.send({
        from: config.from,
        to: email,
        subject: 'Your RepairVantage sign-in code',
        text: `Your RepairVantage code is ${code}. It expires in 5 minutes. If you did not request it, you can ignore this message.`,
      });
      if (!error) return;
    } catch {
      // Do not log the message, recipient, or code.
    }
    throw new APIError('SERVICE_UNAVAILABLE', { message: 'The sign-in email could not be sent.' });
  };
}

/** Better Auth verifies identities and owns durable sessions. GraphQL gets only a verified principal. */
export function createIdentity(prisma: PrismaClient, config: IdentityConfig, deliver?: CodeSender) {
  const sendCode = deliver ?? (config.email && makeCodeSender(config.email));
  const auth = betterAuth({
    appName: 'RepairVantage',
    baseURL: config.origin,
    basePath: '/api/auth',
    secret: config.authSecret,
    trustedOrigins: [config.origin],
    database: prismaAdapter(prisma, { provider: 'postgresql', transaction: true }),
    user: { fields: { image: 'profilePicture' } },
    advanced: {
      cookiePrefix: 'repairvantage',
      useSecureCookies: config.production,
      ipAddress: { ipAddressHeaders: ['x-repairvantage-client-ip'] },
    },
    session: { cookieCache: { enabled: false } },
    socialProviders: config.google ? { google: { ...config.google, requireEmailVerification: true } } : {},
    account: {
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, allowDifferentEmails: false },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      customRules: {
        '/email-otp/send-verification-otp': { window: 60, max: 3 },
        '/sign-in/email-otp': { window: 60, max: 10 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async context => {
        if (context.path === '/email-otp/send-verification-otp' && context.body?.type !== 'sign-in') {
          throw new APIError('BAD_REQUEST', { message: 'Only sign-in codes are available.' });
        }
        if (context.path === '/sign-in/email-otp' && typeof context.body?.name === 'string') {
          const name = context.body.name.trim();
          if (name.length > 120) throw new APIError('BAD_REQUEST', { message: 'Use a name of at most 120 characters.' });
          return { context: { body: { ...context.body, name } } };
        }
        return undefined;
      }),
    },
    plugins: sendCode ? [emailOTP({
      expiresIn: 300,
      allowedAttempts: 3,
      // A short code is cheap to brute-force from an unkeyed database digest.
      storeOTP: { hash: async code => createHmac('sha256', config.authSecret).update(`otp:${code}`).digest('hex') },
      async sendVerificationOTP({ email, otp }) { await sendCode(email, otp); },
    })] : [],
  });
  return {
    handle: toNodeHandler(auth),
    providers: { google: Boolean(config.google), emailOtp: Boolean(sendCode) },
    async principal(headers: Parameters<typeof fromNodeHeaders>[0]) {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });
      const user = session?.user;
      return user?.emailVerified ? { id: user.id, email: user.email, emailVerified: true } : null;
    },
  };
}
