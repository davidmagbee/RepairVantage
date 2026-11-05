import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

const origin = 'http://localhost:5173';
const otpEndpoint = 'http://127.0.0.1:4000/__test/otp';

test.skip(process.env.REAL_API !== '1', 'Requires the disposable Better Auth and PostgreSQL test server.');

async function verifyEmail(page: Page, request: APIRequestContext, email: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByLabel('One-time code')).toBeVisible();

  const response = await request.get(otpEndpoint, { params: { email } });
  expect(response.ok()).toBeTruthy();
  const { code } = await response.json();
  await page.getByLabel('One-time code').fill(code);
  await page.getByRole('button', { name: 'Verify code' }).click();
}

test('owner shares a real project with a new member and publishes a separate Showcase', async ({ browser, page, request }) => {
  const ownerEmail = `owner-${randomUUID()}@example.test`;
  const memberEmail = `member-${randomUUID()}@example.test`;
  const projectName = 'Inspect rear axle assembly';
  const privateDescription = 'Owner workspace notes about the axle inspection.';
  const publicTitle = 'Rear axle repair progress';
  const comment = 'The replacement bearing is ready.';
  const anonymous = await browser.newContext();
  const member = await browser.newContext();

  try {
    await page.goto('/register');
    await verifyEmail(page, request, ownerEmail);
    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();

    await page.getByRole('link', { name: 'Create project' }).click();
    await page.getByLabel('Project name').fill(projectName);
    await page.getByLabel('Description (optional)').fill(privateDescription);
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    const projectUrl = page.url();
    await page.getByLabel('Project status').selectOption('IN_PROGRESS');
    await page.getByRole('button', { name: 'Save status' }).click();
    await expect(page.locator('dd', { hasText: 'in progress' })).toBeVisible();

    await page.getByLabel('Public title').fill(publicTitle);
    await page.getByLabel('Public summary').fill('Inspection is complete and parts are on order.');
    await page.getByRole('button', { name: 'Publish Showcase' }).click();
    const showcaseField = page.getByLabel('Public Showcase link');
    await expect(showcaseField).toBeVisible();
    const showcaseUrl = await showcaseField.inputValue();
    expect(new URL(showcaseUrl).origin).toBe(origin);

    const visitor = await anonymous.newPage();
    await visitor.goto(showcaseUrl);
    await expect(visitor.getByRole('heading', { name: publicTitle })).toBeVisible();
    await expect(visitor.getByText(privateDescription)).toHaveCount(0);
    await visitor.goto(projectUrl);
    await expect(visitor.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    const sharing = page.getByRole('region', { name: 'Project sharing' });
    await sharing.getByLabel('Email address').fill(memberEmail);
    await sharing.getByRole('button', { name: 'Create invite link' }).click();
    const invitationField = sharing.getByRole('textbox', { name: `Invitation for ${memberEmail}`, exact: true });
    await expect(invitationField).toBeVisible();
    const inviteUrl = await invitationField.inputValue();
    expect(new URL(inviteUrl).origin).toBe(origin);

    const invited = await member.newPage();
    await invited.goto(inviteUrl);
    await invited.getByRole('link', { name: 'Create account' }).click();
    await verifyEmail(invited, request, memberEmail);
    await invited.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(invited.getByRole('heading', { name: projectName })).toBeVisible();
    await expect(invited.locator('dd', { hasText: 'in progress' })).toBeVisible();
    await expect(invited.getByRole('button', { name: 'Save status' })).toHaveCount(0);
    await expect(invited.getByRole('region', { name: 'Project sharing' })).toHaveCount(0);
    await invited.getByLabel('Comment', { exact: true }).fill(comment);
    await invited.getByRole('button', { name: 'Post comment' }).click();
    await expect(invited.getByText(comment)).toBeVisible();
    await invited.getByRole('link', { name: 'Back to projects' }).click();
    await invited.getByRole('region', { name: 'Shared with you' }).getByRole('link', { name: projectName }).click();
    await expect(invited.getByText(comment)).toBeVisible();

    await page.reload();
    await expect(page.getByText(comment)).toBeVisible();
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
    await expect(page.getByText('Showcase unpublished.')).toBeVisible();
    await expect(page.getByLabel('Public Showcase link')).toHaveCount(0);
    await visitor.goto(showcaseUrl);
    await expect(visitor.getByRole('heading', { name: 'Showcase unavailable' })).toBeVisible();

    await page.getByRole('button', { name: `Remove ${memberEmail}`, exact: true }).click();
    await expect(page.getByRole('button', { name: `Remove ${memberEmail}`, exact: true })).toHaveCount(0);
    await invited.reload();
    await expect(invited.getByRole('heading', { name: 'Project not found' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.goto(projectUrl);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  } finally {
    await Promise.all([anonymous.close(), member.close()]);
  }
});
