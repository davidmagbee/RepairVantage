import { expect, test } from './fixtures';

test('an owner records USD expenses and exports the same totals shown in the report', async ({ page }) => {
  const user = { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true };
  const expenses: { id: string; description: string; amountCents: number; createdAt: string }[] = [];
  let rejectExpense = true;
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: { user, session: { id: 's', userId: user.id } } }));
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    if (operationName === 'GetProjectReport') {
      return route.fulfill({ json: { data: {
        project: { id: 'porch', name: 'Porch repair', archivedAt: null },
        projectReport: { estimatedHours: 4, actualHours: 3.25, totalExpenseCents: expenses[0]?.amountCents ?? 0, expenses },
      } } });
    }
    expect(operationName).toBe('AddProjectExpense');
    expect(variables).toEqual({ projectId: 'porch', description: '=SUM(1,2)', amountCents: 1234 });
    if (rejectExpense) {
      rejectExpense = false;
      return route.fulfill({ json: { errors: [{ message: 'Expense write failed' }] } });
    }
    const expense = { id: 'expense', ...variables, createdAt: '2026-11-06T12:00:00.000Z' };
    expenses.push(expense);
    return route.fulfill({ json: { data: { addProjectExpense: expense } } });
  });

  await page.goto('/projects/porch/report');
  await expect(page.getByRole('heading', { name: 'Porch repair report' })).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('3.25 hours')).toBeVisible();
  await page.getByLabel('Expense description').fill('=SUM(1,2)');
  const amount = page.getByLabel('Amount (USD)');
  const submit = page.getByRole('button', { name: 'Add expense' });
  await amount.fill('12.345');
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText('Enter a description and a positive USD amount with at most two decimals.');
  await amount.fill('12.34');
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText('Could not record the expense. Try again.');
  await expect(amount).toHaveValue('12.34');
  await submit.click();
  await expect(page.getByText('$12.34').first()).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloadEvent;
  const contents = await download.createReadStream();
  expect(contents).toBeTruthy();
  const chunks = [];
  for await (const chunk of contents!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString();
  expect(csv).toContain('Total expenses (USD),12.34');
  expect(csv).toContain('"\'=SUM(1,2)"');
  await page.evaluate(() => { window.print = () => { document.title = 'Print invoked'; }; });
  await page.getByRole('button', { name: 'Print / Save as PDF' }).click();
  await expect(page).toHaveTitle('Print invoked');
});

test('a report can retry a failed read and remains read-only after archive', async ({ page }) => {
  const user = { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true };
  let rejectReport = true;
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: { user, session: { id: 's', userId: user.id } } }));
  await page.route('**/graphql', route => {
    if (rejectReport) {
      rejectReport = false;
      return route.fulfill({ json: { errors: [{ message: 'Report read failed' }] } });
    }
    return route.fulfill({ json: { data: {
      project: { id: 'porch', name: 'Porch repair', archivedAt: '2026-11-06T12:00:00.000Z' },
      projectReport: { estimatedHours: 4, actualHours: 3.25, totalExpenseCents: 0, expenses: [] },
    } } });
  });
  await page.goto('/projects/porch/report');
  await expect(page.getByRole('alert')).toHaveText('Could not load this owner report.');
  await page.getByRole('button', { name: 'Retry report' }).click();
  await expect(page.getByText('This report is read-only while the project is archived.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add expense' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeVisible();
});
