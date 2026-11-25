import { expect, test } from './fixtures';

const policy = {
  policyVersion: 'adult-2026-11-24', minimumAge: 18,
  statement: 'I confirm that I am at least 18 years old.', market: 'US', geographicRestriction: false,
  screened: false, blocked: false, acknowledged: false,
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: null }));
});

test('age screening precedes email and Google and rejection removes the retry form', async ({ page }) => {
  await page.route('**/api/auth/providers', route => route.fulfill({ json: { google: true, emailOtp: true } }));
  let blocked = false;
  await page.route('**/api/eligibility/status', route => route.fulfill({ json: { ...policy, blocked } }));
  await page.route('**/api/eligibility/screen', route => {
    expect(route.request().postDataJSON()).toEqual({ age: 17 });
    blocked = true;
    return route.fulfill({ status: 403, json: { error: 'Not eligible' } });
  });
  await page.goto('/register');
  await expect(page.getByLabel('Age in years')).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
  await page.getByLabel('Age in years').fill('17');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Account access is unavailable');
  await expect(page.getByLabel('Age in years')).toHaveCount(0);
});

test('eligible screening reveals both sign-in methods and retries a transient failure', async ({ page }) => {
  await page.route('**/api/auth/providers', route => route.fulfill({ json: { google: true, emailOtp: true } }));
  let screened = false;
  let attempts = 0;
  await page.route('**/api/eligibility/status', route => route.fulfill({ json: { ...policy, screened } }));
  await page.route('**/api/eligibility/screen', route => {
    expect(route.request().postDataJSON()).toEqual({ age: 36 });
    if (++attempts === 1) return route.fulfill({ status: 503 });
    screened = true;
    return route.fulfill({ status: 204 });
  });
  await page.goto('/login');
  await page.getByLabel('Age in years').fill('36');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not check eligibility');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('existing session must save current acknowledgment before private content mounts', async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: {
    user: { id: 'existing', email: 'existing@example.test', emailVerified: true }, session: { id: 'session', userId: 'existing' },
  } }));
  let acknowledged = false;
  let privateRequests = 0;
  await page.route('**/api/eligibility/status', route => route.fulfill({ json: { ...policy, acknowledged } }));
  await page.route('**/api/eligibility/acknowledgment', route => {
    expect(route.request().postDataJSON()).toEqual({ policyVersion: policy.policyVersion, accepted: true });
    acknowledged = true;
    return route.fulfill({ status: 204 });
  });
  await page.route('**/graphql', route => {
    privateRequests += 1;
    return route.fulfill({ json: { data: { projects: [], sharedProjects: [] } } });
  });
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Account eligibility' })).toBeVisible();
  expect(privateRequests).toBe(0);
  await expect(page.getByRole('button', { name: 'Confirm and continue' })).toBeDisabled();
  await page.getByRole('checkbox', { name: policy.statement }).check();
  await page.getByRole('checkbox', { name: policy.statement }).uncheck();
  await expect(page.getByRole('button', { name: 'Confirm and continue' })).toBeDisabled();
  await page.locator('form').dispatchEvent('submit');
  expect(acknowledged).toBe(false);
  await page.getByRole('checkbox', { name: policy.statement }).check();
  await page.getByRole('button', { name: 'Confirm and continue' }).click();
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  expect(privateRequests).toBeGreaterThan(0);
});

test('policy errors fail closed and acknowledgment failures remain actionable', async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: {
    user: { id: 'existing', email: 'existing@example.test', emailVerified: true }, session: { id: 'session', userId: 'existing' },
  } }));
  let broken = true;
  await page.route('**/api/eligibility/status', route => broken
    ? route.fulfill({ json: { invalid: true } })
    : route.fulfill({ json: policy }));
  await page.route('**/api/eligibility/acknowledgment', route => route.fulfill({ status: 409 }));
  await page.goto('/projects');
  await expect(page.getByRole('alert')).toContainText('Could not load account eligibility');
  broken = false;
  await page.getByRole('button', { name: 'Retry eligibility' }).click();
  await page.getByRole('checkbox', { name: policy.statement }).check();
  await page.getByRole('button', { name: 'Confirm and continue' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save');
  await page.getByRole('button', { name: 'Reload policy' }).click();
  await expect(page.getByRole('checkbox', { name: policy.statement })).not.toBeChecked();
});

test('a private API policy denial refreshes eligibility without expiring the verified session', async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: {
    user: { id: 'existing', email: 'existing@example.test', emailVerified: true }, session: { id: 'session', userId: 'existing' },
  } }));
  let changed = false;
  await page.route('**/api/eligibility/status', route => route.fulfill({ json: {
    ...policy, acknowledged: !changed, policyVersion: changed ? 'adult-next-version' : policy.policyVersion,
  } }));
  await page.route('**/graphql', route => {
    changed = true;
    return route.fulfill({ json: { errors: [{ message: 'Acknowledge eligibility', extensions: { code: 'ELIGIBILITY_REQUIRED' } }] } });
  });
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Account eligibility' })).toBeVisible();
  await expect(page.getByText('Signed in as existing@example.test')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: policy.statement })).not.toBeChecked();
});

test('a restricted account retains sign-out and explains a failed sign-out', async ({ page }) => {
  let signedIn = true;
  let attempts = 0;
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: signedIn ? {
    user: { id: 'existing', email: 'existing@example.test', emailVerified: true }, session: { id: 'session', userId: 'existing' },
  } : null }));
  await page.route('**/api/eligibility/status', route => route.fulfill({ json: { ...policy, blocked: true } }));
  await page.route('**/api/auth/sign-out', route => {
    if (++attempts === 1) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/auth/providers', route => route.fulfill({ json: { google: false, emailOtp: true } }));
  await page.goto('/projects');
  await expect(page.getByRole('alert')).toContainText('Account access is unavailable');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText('Could not sign out. Try again.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('anonymous eligibility lookup failures can be retried before identity collection', async ({ page }) => {
  await page.route('**/api/auth/providers', route => route.fulfill({ json: { google: true, emailOtp: true } }));
  let broken = true;
  await page.route('**/api/eligibility/status', route => broken ? route.fulfill({ status: 503 }) : route.fulfill({ json: policy }));
  await page.goto('/register');
  await expect(page.getByRole('alert')).toContainText('Could not load account eligibility');
  broken = false;
  await page.getByRole('button', { name: 'Retry eligibility' }).click();
  await expect(page.getByLabel('Age in years')).toBeVisible();
});

test('privacy contact and sharing limits remain public without account acknowledgment', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy and data requests' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy and data requests' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'repairvantageadmin@gmail.com' })).toHaveAttribute('href', 'mailto:repairvantageadmin@gmail.com');
  await expect(page.getByRole('heading', { name: 'Providers and sharing' })).toBeVisible();
  await expect(page.getByText(/does not promise immediate erasure/)).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});
