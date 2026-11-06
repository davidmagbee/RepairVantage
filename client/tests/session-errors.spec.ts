import { checkpointCoverage, expect, test } from './fixtures';

const email = 'owner@example.test';
const verifiedSession = {
  user: { id: 'owner', name: 'Repair owner', email, emailVerified: true },
  session: { id: 'test-session', userId: 'owner', expiresAt: '2099-01-01T00:00:00.000Z' },
};
const emailOnly = { google: false, emailOtp: true };
const unavailable = { status: 503, json: { message: 'Service unavailable' } };

test('the landing page stays public while session lookup is unavailable', async ({ page }) => {
  let sessionAvailable = false;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill(sessionAvailable ? { json: verifiedSession } : unavailable),
  );

  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('Could not verify your session.');
  await expect(page.getByRole('heading', { name: /Keep repair projects organized/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Start a project', exact: true })).toHaveCount(0);

  sessionAvailable = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/projects');
  await expect(page.getByRole('link', { name: 'Start a project', exact: true })).toHaveAttribute('href', '/projects/new');
});

test('a private deep link waits for a successful session retry', async ({ page }) => {
  let sessionAvailable = false;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill(sessionAvailable ? { json: verifiedSession } : unavailable),
  );

  await page.goto('/projects/new');
  await expect(page.getByRole('alert')).toHaveText('Could not verify your session.');
  await expect(page).toHaveURL('/projects/new');
  await expect(page.getByLabel('Project name')).toHaveCount(0);

  sessionAvailable = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Create project' })).toBeVisible();
  await expect(page).toHaveURL('/projects/new');
});

for (const [failure, providerResponse] of [
  ['an HTTP failure', unavailable],
  ['malformed provider capabilities', { json: { google: false, emailOtp: 'true' } }],
] as const) {
  test(`sign-in options recover on reload after ${failure}`, async ({ page }) => {
    let providersAvailable = false;
    await page.route('**/api/auth/get-session', (route) => route.fulfill({ json: null }));
    await page.route('**/api/auth/providers', (route) =>
      route.fulfill(providersAvailable ? { json: emailOnly } : providerResponse),
    );

    await page.goto('/login');
    await expect(page.getByRole('alert')).toHaveText('Could not load sign-in options. Reload to try again.');
    await expect(page.getByRole('button', { name: 'Email me a code' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);

    providersAvailable = true;
    await checkpointCoverage(page);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Email me a code' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('an invalid email code can be replaced without losing the intended project route', async ({ page }) => {
  const mistypedEmail = 'other-owner@example.test';
  let signedIn = false;
  let canSend = false;
  let codesSent = 0;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: signedIn ? verifiedSession : null }),
  );
  await page.route('**/api/auth/providers', (route) => route.fulfill({ json: emailOnly }));
  await page.route('**/api/auth/email-otp/send-verification-otp', (route) => {
    if (!canSend) return route.fulfill(unavailable);
    codesSent += 1;
    return route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/auth/sign-in/email-otp', (route) => {
    const { email: submittedEmail, otp } = route.request().postDataJSON();
    signedIn = submittedEmail === email && codesSent > 1 && otp === '246810';
    return route.fulfill(signedIn
      ? { json: verifiedSession }
      : { status: 400, json: { code: 'INVALID_OTP', message: 'Invalid code' } });
  });

  await page.goto('/projects/new');
  await page.getByLabel('Email address').fill(mistypedEmail);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('alert')).toHaveText(/Could not send a code/);
  await expect(page.getByLabel('Email address')).toHaveValue(mistypedEmail);
  canSend = true;
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('One-time code').fill('111111');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('alert')).toHaveText(/Could not verify that code/);
  await expect(page).toHaveURL('/login');

  await page.getByRole('button', { name: 'Change email' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('status')).toContainText(email);
  await page.getByRole('button', { name: 'Send a new code' }).click();
  const verify = page.getByRole('button', { name: 'Verify code' });
  await expect(verify).toBeEnabled();
  await expect(page.getByLabel('One-time code')).toHaveValue('');
  await page.getByLabel('One-time code').fill('246810');
  await verify.click();
  await expect(page.getByRole('heading', { name: 'Create project' })).toBeVisible();
  await expect(page).toHaveURL('/projects/new');
});

test('an expired session reported by the API returns the visitor to sign-in', async ({ page }) => {
  let signedIn = true;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: signedIn ? verifiedSession : null }),
  );
  await page.route('**/api/auth/providers', (route) => route.fulfill({ json: emailOnly }));
  await page.route('**/graphql', (route) => {
    signedIn = false;
    return route.fulfill({ json: { errors: [{ message: 'Authentication required', extensions: { code: 'UNAUTHENTICATED' } }] } });
  });

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
});

test('a failed sign-out explains the failure and can be retried', async ({ page }) => {
  let signedIn = true;
  let canSignOut = false;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: signedIn ? verifiedSession : null }),
  );
  await page.route('**/api/auth/providers', (route) => route.fulfill({ json: emailOnly }));
  await page.route('**/api/auth/sign-out', (route) => {
    if (!canSignOut) return route.fulfill(unavailable);
    signedIn = false;
    return route.fulfill({ json: { success: true } });
  });

  await page.goto('/projects/new');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not sign out. Try again.');
  await expect(page.getByRole('heading', { name: 'Create project' })).toBeVisible();

  canSignOut = true;
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page).toHaveURL('/login');
  await expect(page.getByLabel('Project name')).toHaveCount(0);
});
