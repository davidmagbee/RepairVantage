import { expect, test } from './fixtures';

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

for (const [google, emailOtp, error, recovery] of [
  [true, true, 'google_email_not_authoritative', 'Use an email code to sign in with this address.'],
  [true, true, 'access_denied', 'Google sign-in could not be completed. Try again or use an email code.'],
  [true, false, 'access_denied', 'Google sign-in could not be completed. Try again.'],
  [false, true, 'access_denied', 'Google sign-in is unavailable. Use an email code to continue.'],
] as const) {
  test(`Google callback ${error} with Google ${google} and email codes ${emailOtp} offers configured recovery`, async ({ page }) => {
    await page.route('**/api/auth/providers', (route) =>
      route.fulfill({ json: { google, emailOtp } }),
    );
    await page.goto(`/login?error=${error}`);

    await expect(page.getByRole('alert')).toHaveText(recovery);
    await expect(page.getByRole('button', { name: 'Email me a code' })).toHaveCount(emailOtp ? 1 : 0);
  });
}

test('a failed Google sign-in request leaves the other sign-in method available', async ({ page }) => {
  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({ json: { google: true, emailOtp: true } }),
  );
  await page.route('**/api/auth/sign-in/social', (route) =>
    route.fulfill({ status: 503, json: { message: 'Provider unavailable' } }),
  );
  await page.goto('/login');

  const google = page.getByRole('button', { name: 'Continue with Google' });
  await google.click();
  await expect(page.getByRole('alert')).toHaveText('Google sign-in could not be completed. Try again.');
  await expect(google).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Email me a code' })).toBeEnabled();
});
