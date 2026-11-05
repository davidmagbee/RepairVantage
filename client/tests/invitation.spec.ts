import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const token = 'a'.repeat(43);
const inviteUrl = `/invite#token=${token}`;
const user = { id: 'recipient', name: 'Invite recipient', email: 'recipient@example.com', emailVerified: true };

async function mockInvitation(page: Page, options: { signedIn: boolean; unavailable?: boolean }) {
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
          : { data: { acceptProjectInvite: { id: 'invited-project', __typename: 'Project' } } },
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
  await page.route('**/api/auth/sign-in/social', (route) => {
    const request = route.request();
    expect(request.postDataJSON()).toMatchObject({ provider: 'google', callbackURL: '/invite' });
    expect(request.postData()).not.toContain(token);

    // Model a successful provider callback to the same tab after unloading the app.
    session.signedIn = true;
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
