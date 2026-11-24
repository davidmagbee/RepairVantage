import { checkpointCoverage, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const token = 'a'.repeat(43);
const inviteUrl = `/invite#token=${token}`;
const user = { id: 'recipient', name: 'Invite recipient', email: 'recipient@example.com', emailVerified: true };

async function mockInvitation(page: Page, options: { signedIn: boolean; unavailable?: boolean; projectId?: string }) {
  const submissions: { method: string; token?: string }[] = [];

  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({
      json: options.signedIn
        ? { user, session: { id: 'test-session', userId: user.id } }
        : null,
    }),
  );

  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const operation = request.postDataJSON() as {
      operationName: string;
      variables?: { token?: string };
    };

    if (operation.operationName === 'AcceptProjectInvite') {
      submissions.push({ method: request.method(), token: operation.variables?.token });
      await route.fulfill({
        json: options.unavailable
          ? { errors: [{ message: 'Internal invitation detail', extensions: { code: 'INVITE_UNAVAILABLE' } }] }
          : { data: { acceptProjectInvite: { id: options.projectId ?? 'invited-project', __typename: 'Project' } } },
      });
      return;
    }

    await route.fulfill({ json: { data: { project: null } } });
  });

  return submissions;
}

test('a malformed invitation clears the fragment and offers recovery', async ({ page }) => {
  const submissions = await mockInvitation(page, { signedIn: true });
  await page.goto('/invite#token=invalid');

  await expect(page).toHaveURL('/invite');
  await expect(page.getByText('Open the original invitation link', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toHaveCount(0);
  expect(submissions).toEqual([]);
});

test('a signed-out recipient can sign in across a full-page redirect without consuming the invitation', async ({ page }) => {
  const session = { signedIn: false };
  const submissions = await mockInvitation(page, session);
  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({ json: { google: true, emailOtp: false } }),
  );
  await page.route('**/api/auth/sign-in/social', async (route) => {
    const request = route.request();
    expect(request.postDataJSON()).toMatchObject({ provider: 'google', callbackURL: '/invite' });
    expect(request.postData()).not.toContain(token);

    // Model a successful provider callback to the same tab after unloading the app.
    session.signedIn = true;
    await checkpointCoverage(page);
    return route.fulfill({ json: { url: new URL('/invite', page.url()).href, redirect: true } });
  });
  await page.goto(inviteUrl);

  await expect(page).toHaveURL('/invite');
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/login');

  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/invite');
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.stringify(sessionStorage))).not.toContain(token);
  expect(submissions).toEqual([]);
});

test('accepting an invitation is an explicit POST and opens the project', async ({ page }) => {
  const submissions = await mockInvitation(page, { signedIn: true });
  await page.goto(inviteUrl);

  const accept = page.getByRole('button', { name: 'Accept invitation' });
  await expect(page).toHaveURL('/invite');
  await expect(accept).toBeVisible();
  expect(submissions).toEqual([]);

  await accept.click();

  await expect(page).toHaveURL('/projects/invited-project');
  expect(submissions).toEqual([{ method: 'POST', token }]);
});

test('an unavailable invitation fails safely without showing backend details', async ({ page }) => {
  const submissions = await mockInvitation(page, { signedIn: true, unavailable: true });
  await page.goto(inviteUrl);

  await page.getByRole('button', { name: 'Accept invitation' }).click();

  await expect(page).toHaveURL('/invite');
  await expect(page.getByRole('alert')).toContainText('Couldn’t accept this invitation');
  await expect(page.getByText('Internal invitation detail')).toHaveCount(0);
  expect(submissions).toEqual([{ method: 'POST', token }]);
});

test('an incomplete invitation response cannot open an invalid project route', async ({ page }) => {
  await mockInvitation(page, { signedIn: true, projectId: '' });
  await page.goto(inviteUrl);
  await page.getByRole('button', { name: 'Accept invitation' }).click();

  await expect(page.getByRole('alert')).toContainText('Couldn’t accept this invitation');
  await expect(page).toHaveURL('/invite');
});

for (const [state, value] of [
  ['expired', JSON.stringify({ token, expiresAt: 1 })],
  ['corrupt', '{'],
] as const) {
  test(`a stale invitation handoff (${state}) asks the recipient to reopen the original link`, async ({ page }) => {
    await mockInvitation(page, { signedIn: true });
    // Restore a stale handoff as a browser would after returning from a provider in the same tab.
    await page.addInitScript((savedValue) => sessionStorage.setItem('repairvantage:invitation-handoff', savedValue), value);
    await page.goto('/invite');

    await expect(page.getByText('Open the original invitation link', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toHaveCount(0);
  });
}

test('an invitation survives a failed session check and can be dismissed', async ({ page }) => {
  let sessionAvailable = false;
  await page.route('**/api/auth/get-session', (route) => route.fulfill(sessionAvailable
    ? { json: { user, session: { id: 'test-session', userId: user.id } } }
    : { status: 503, json: { message: 'Service unavailable' } }));
  await page.goto(inviteUrl);
  await expect(page.getByRole('alert')).toContainText('Couldn’t check your sign-in');
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toHaveCount(0);

  sessionAvailable = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL('/');
  await page.goBack();
  await expect(page).toHaveURL('/invite');
  await expect(page.getByText('Open the original invitation link', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toHaveCount(0);
});

test('same-tab email sign-in preserves the invitation when browser storage is blocked', async ({ page }) => {
  const session = { signedIn: false };
  const submissions = await mockInvitation(page, session);
  await page.addInitScript(() => {
    // Browsers can throw SecurityError when the user blocks storage.
    Object.defineProperty(window, 'sessionStorage', {
      get() { throw new DOMException('Storage access denied', 'SecurityError'); },
    });
  });
  await page.route('**/api/auth/providers', (route) => route.fulfill({ json: { google: false, emailOtp: true } }));
  await page.route('**/api/auth/email-otp/send-verification-otp', (route) =>
    route.fulfill({ json: { success: true } }),
  );
  await page.route('**/api/auth/sign-in/email-otp', (route) => {
    session.signedIn = true;
    return route.fulfill({ json: { user } });
  });

  await page.goto(inviteUrl);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email address').fill(user.email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('One-time code').fill('135790');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page).toHaveURL('/invite');
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
  expect(submissions).toEqual([]);
});
