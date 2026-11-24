import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { checkpointCoverage, coverPage, expect, test } from './fixtures';
import type { APIRequestContext, Page } from '@playwright/test';

const origin = 'http://localhost:5173';
const otpEndpoint = 'http://127.0.0.1:4000/__test/otp';

test.skip(process.env.REAL_API !== '1', 'Requires the disposable Better Auth and PostgreSQL test server.');

async function verifyEmail(page: Page, request: APIRequestContext, email: string) {
  await page.getByLabel('Email address').fill(email);
  // Surface an HTTP rejection before waiting for the next form to appear.
  const sent = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/auth/email-otp/send-verification-otp');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  expect((await sent).status()).toBe(200);
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
  const updatedName = 'Replace rear axle bearing';
  const updatedDescription = 'Replace the worn bearing found during the inspection.';
  const publicTitle = 'Rear axle repair progress';
  const comment = 'The replacement bearing is ready.';
  const anonymous = await browser.newContext();
  const member = await browser.newContext();
  const saveCoverage: (() => Promise<void>)[] = [];

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
    await page.getByRole('button', { name: 'Edit details' }).click();
    await page.getByLabel('Project name').fill(updatedName);
    await page.getByLabel('Description (optional)').fill(updatedDescription);
    await page.getByRole('button', { name: 'Save details' }).click();
    await expect(page.getByRole('heading', { name: updatedName })).toBeVisible();
    await page.getByLabel('Project status').selectOption('IN_PROGRESS');
    await page.getByRole('button', { name: 'Save status' }).click();
    await expect(page.locator('dd', { hasText: 'in progress' })).toBeVisible();
    await page.getByLabel('Project priority').selectOption('HIGH');
    await page.getByRole('button', { name: 'Save priority' }).click();
    await expect(page.locator('dd', { hasText: /^high$/ })).toBeVisible();

    await page.getByLabel('Public title').fill(publicTitle);
    await page.getByLabel('Public summary').fill('Inspection is complete and parts are on order.');
    await page.getByRole('button', { name: 'Publish Showcase' }).click();
    const showcaseField = page.getByLabel('Public Showcase link');
    await expect(showcaseField).toBeVisible();
    const showcaseUrl = await showcaseField.inputValue();
    expect(new URL(showcaseUrl).origin).toBe(origin);

    const visitor = await anonymous.newPage();
    saveCoverage.push(await coverPage(visitor));
    await visitor.goto(showcaseUrl);
    await expect(visitor.getByRole('heading', { name: publicTitle })).toBeVisible();
    await expect(visitor.getByText(updatedDescription)).toHaveCount(0);
    await checkpointCoverage(visitor);
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
    saveCoverage.push(await coverPage(invited));
    await invited.goto(inviteUrl);
    await invited.getByRole('link', { name: 'Create account' }).click();
    await verifyEmail(invited, request, memberEmail);
    await invited.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(invited.getByRole('heading', { name: updatedName })).toBeVisible();
    await expect(invited.getByText(updatedDescription)).toBeVisible();
    await expect(invited.locator('dd', { hasText: 'in progress' })).toBeVisible();
    await expect(invited.locator('dd', { hasText: /^high$/ })).toBeVisible();
    await expect(invited.getByRole('button', { name: 'Edit details' })).toHaveCount(0);
    await expect(invited.getByRole('button', { name: 'Save status' })).toHaveCount(0);
    await expect(invited.getByRole('button', { name: 'Save priority' })).toHaveCount(0);
    await expect(invited.getByRole('region', { name: 'Project sharing' })).toHaveCount(0);
    await invited.getByLabel('Comment', { exact: true }).fill(comment);
    await invited.getByRole('button', { name: 'Post comment' }).click();
    await expect(invited.getByText(comment)).toBeVisible();
    await invited.getByRole('link', { name: 'Back to projects' }).click();
    await invited.getByRole('region', { name: 'Shared with you' }).getByRole('link', { name: updatedName }).click();
    await expect(invited.getByText(comment)).toBeVisible();

    await checkpointCoverage(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: updatedName })).toBeVisible();
    await expect(page.getByLabel('Project priority')).toHaveValue('HIGH');
    await expect(page.getByText(comment)).toBeVisible();
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
    await expect(page.getByText('Showcase unpublished.')).toBeVisible();
    await expect(page.getByLabel('Public Showcase link')).toHaveCount(0);
    await checkpointCoverage(visitor);
    await visitor.goto(showcaseUrl);
    await expect(visitor.getByRole('heading', { name: 'Showcase unavailable' })).toBeVisible();

    await page.getByRole('button', { name: `Remove ${memberEmail}`, exact: true }).click();
    await expect(page.getByRole('button', { name: `Remove ${memberEmail}`, exact: true })).toHaveCount(0);
    await checkpointCoverage(invited);
    await invited.reload();
    await expect(invited.getByRole('heading', { name: 'Project not found' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await checkpointCoverage(page);
    await page.goto(projectUrl);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  } finally {
    try {
      await Promise.all(saveCoverage.map(save => save()));
    } finally {
      await Promise.all([anonymous.close(), member.close()]);
    }
  }
});
