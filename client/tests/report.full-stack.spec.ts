import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { checkpointCoverage, expect, test } from './fixtures';

test.skip(process.env.REAL_API !== '1', 'Requires the disposable Better Auth and PostgreSQL test server.');

test('an authenticated owner persists expenses and downloads matching report rows', async ({ page, request }) => {
  const email = `report-owner-${randomUUID()}@example.test`;
  const projectName = 'Porch report acceptance';
  await page.goto('/register');
  await page.getByLabel('Email address').fill(email);
  const sent = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/auth/email-otp/send-verification-otp');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  expect((await sent).status()).toBe(200);
  await expect(page.getByLabel('One-time code')).toBeVisible();
  const mail = await request.get('http://127.0.0.1:4000/__test/otp', { params: { email } });
  expect(mail.ok()).toBeTruthy();
  const { code } = await mail.json();
  await page.getByLabel('One-time code').fill(code);
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();

  await page.getByRole('link', { name: 'Create project' }).click();
  await page.getByLabel('Project name').fill(projectName);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  // Exercise UTC date authoring through the real API before checking its Schedule projection.
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await page.getByLabel('Project start (UTC)').fill('2026-11-14T09:15');
  await page.getByLabel('Project end (UTC)').fill('2026-11-16T17:00');
  await page.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.getByRole('button', { name: 'Edit dates', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Schedule', exact: true }).click();
  await page.getByLabel('From date').fill('2026-11-14');
  await page.getByLabel('Through date').fill('2026-11-16');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await page.getByRole('list', { name: 'Calendar dates' }).getByRole('link', { name: projectName, exact: true }).click();
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await expect(page.getByLabel('Project start (UTC)')).toHaveValue('2026-11-14T09:15');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Project report', exact: true }).click();
  await expect(page.getByRole('heading', { name: `${projectName} report` })).toBeVisible();

  const expenses: { description: string; amountCents: number; createdAt: string }[] = [];
  for (const [description, amount, cents] of [
    ['=SUM(1,2)', '12.34', 1234],
    ['"Stainless", screws', '0.66', 66],
  ] as const) {
    await page.getByLabel('Expense description').fill(description);
    await page.getByLabel('Amount (USD)').fill(amount);
    // The real GraphQL response verifies fragment fields survive serialization and Apollo normalization.
    const saved = page.waitForResponse(response => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/graphql'
      && response.request().postDataJSON().operationName === 'AddProjectExpense');
    await page.getByRole('button', { name: 'Add expense', exact: true }).click();
    const payload = await (await saved).json();
    expect(payload.errors).toBeUndefined();
    const expense = payload.data.addProjectExpense;
    expect(expense).toMatchObject({ description, amountCents: cents });
    expect(Number.isNaN(Date.parse(expense.createdAt))).toBe(false);
    expenses.push(expense);
    await expect(page.getByRole('cell', { name: description, exact: true })).toBeVisible();
  }

  await checkpointCoverage(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: `${projectName} report` })).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: /^\$13\.00$/ })).toBeVisible();
  for (const expense of expenses) {
    const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: expense.description, exact: true }) });
    await expect(row.getByRole('cell', { name: `$${(expense.amountCents / 100).toFixed(2)}`, exact: true })).toBeVisible();
    await expect(row.locator('time')).toHaveAttribute('datetime', expense.createdAt);
  }

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('project-report.csv');
  const stream = await download.createReadStream();
  expect(stream).toBeTruthy();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString();
  expect(csv).toContain(`Project,"${projectName}"\r\n`);
  expect(csv).toContain('Total expenses (USD),13.00\r\n');
  // Keep formula protection and CSV quote escaping tied to actual stored expense descriptions.
  expect(csv).toContain(`"'=SUM(1,2)",12.34,"${expenses[0].createdAt}"\r\n`);
  expect(csv).toContain(`"""Stainless"", screws",0.66,"${expenses[1].createdAt}"\r\n`);
  await page.evaluate(() => { window.print = () => { document.title = 'Report print invoked'; }; });
  await page.getByRole('button', { name: 'Print / Save as PDF' }).click();
  await expect(page).toHaveTitle('Report print invoked');

  await page.getByRole('link', { name: 'Back to project' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete project permanently' }).click();
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
});
