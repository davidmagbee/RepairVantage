import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/get-session', (route) => route.fulfill({ json: null }));
});

test('account creation explains when sign-in has no available provider', async ({ page }) => {
  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({ json: { google: false, emailOtp: false } }),
  );
  await page.goto('/register');

  await expect(page.getByRole('status')).toHaveText(/Sign-in and account creation are currently unavailable/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Email me a code' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
});

test('a Google-only deployment avoids suggesting email codes after a callback error', async ({ page }) => {
  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({ json: { google: true, emailOtp: false } }),
  );
  await page.goto('/login?error=google_email_not_authoritative');

  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText(/Try another Google account/);
  await expect(page.getByRole('button', { name: 'Email me a code' })).toHaveCount(0);
});

test('an email-only deployment offers email codes without a Google button', async ({ page }) => {
  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({ json: { google: false, emailOtp: true } }),
  );
  await page.goto('/login');

  await expect(page.getByRole('button', { name: 'Email me a code' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
});
