import type { Page } from '@playwright/test';
import { checkpointCoverage, expect, test } from './fixtures';

test.use({ timezoneId: 'America/New_York' });

async function projectDates(page: Page, canManage = true, archivedAt: string | null = null, initialDates: { startDate?: string | null; endDate?: string | null } = {}) {
  const project = {
    __typename: 'Project', id: 'date-project', name: 'Repair schedule', description: null,
    status: 'PLANNED', priority: 'MEDIUM', canManage, archivedAt, comments: [],
    startDate: '2026-11-14T09:15:30.000Z' as string | null,
    endDate: '2026-11-16T17:00:00.000Z' as string | null,
    ...initialDates,
  };
  let rejectSave = true;
  const writes: Record<string, unknown>[] = [];
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: {
    user: { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true },
    session: { id: 'session', userId: 'owner' },
  } }));
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    if (operationName === 'GetProjectDetails') return route.fulfill({ json: { data: { project } } });
    if (operationName === 'ProjectSharing') return route.fulfill({ json: { data: {
      project: { showcase: null }, projectInvites: [], projectMembers: [],
    } } });
    expect(operationName).toBe('UpdateProjectDates');
    writes.push(variables.input);
    if (rejectSave) {
      rejectSave = false;
      return route.fulfill({ json: { errors: [{ message: 'Date save failed' }] } });
    }
    Object.assign(project, variables.input);
    return route.fulfill({ json: { data: { updateProject: {
      __typename: 'Project', id: project.id, startDate: project.startDate, endDate: project.endDate,
    } } } });
  });
  await page.goto('/projects/date-project');
  return { writes, acceptWrites: () => { rejectSave = false; } };
}

test('owner edits local project dates, retries without losing changes, and clears dates', async ({ page }) => {
  const { writes } = await projectDates(page);
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  const start = page.getByLabel('Project start');
  const end = page.getByLabel('Project end');
  await expect(start).toHaveValue('2026-11-14T04:15');
  await end.fill('2026-11-13T17:00');
  await page.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.getByRole('alert')).toHaveText('Project end must be on or after project start.');
  expect(writes).toEqual([]);
  await end.fill('2026-11-18T17:00');
  await page.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not update project dates. Try again.');
  await expect(end).toHaveValue('2026-11-18T17:00');
  // Updating one endpoint must preserve untouched sub-minute precision on the other endpoint.
  expect(writes[0]).toEqual({ endDate: '2026-11-18T22:00:00.000Z' });
  await page.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.getByRole('button', { name: 'Edit dates', exact: true })).toBeVisible();
  await checkpointCoverage(page);
  await page.reload();
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await expect(end).toHaveValue('2026-11-18T17:00');
  await start.fill('');
  await end.fill('');
  await page.getByRole('button', { name: 'Save dates' }).click();
  expect(writes.at(-1)).toEqual({ startDate: null, endDate: null });
  await expect(page.getByText('Not set', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await start.fill('2026-11-20T12:00');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Not set', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await page.getByRole('button', { name: 'Save dates' }).click();
  expect(writes).toHaveLength(3);
});

for (const access of ['member', 'archived'] as const) {
  test(`${access} project shows dates without date editing`, async ({ page }) => {
    await projectDates(page, access !== 'member', access === 'archived' ? '2026-11-13T12:00:00.000Z' : null);
    await expect(page.getByRole('heading', { name: 'Repair schedule' })).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit dates', exact: true })).toHaveCount(0);
  });
}

// Exercise the wall-time controls through the mutation boundary, rather than trusting formatter output alone.
test('project dates reject skipped times and require a repeated-hour occurrence', async ({ page }) => {
  const { writes, acceptWrites } = await projectDates(page, true, null, { startDate: null, endDate: null });
  acceptWrites();
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  const start = page.getByLabel('Project start', { exact: true });
  const save = page.getByRole('button', { name: 'Save dates' });
  await start.fill('2026-03-08T02:30');
  await save.click();
  await expect(page.getByRole('alert')).toContainText('does not exist');
  expect(writes).toEqual([]);
  await start.fill('2026-11-01T01:30');
  await save.click();
  await expect(page.getByRole('alert')).toContainText('occurs twice');
  await page.getByLabel('Project start occurrence').selectOption('earlier');
  await save.click();
  await expect(page.getByRole('button', { name: 'Edit dates', exact: true })).toBeVisible();
  expect(writes).toEqual([{ startDate: '2026-11-01T05:30:00.000Z' }]);
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await expect(page.getByLabel('Project start occurrence')).toHaveValue('earlier');
  await page.getByLabel('Project start occurrence').selectOption('later');
  await save.click();
  await expect(page.getByRole('button', { name: 'Edit dates', exact: true })).toBeVisible();
  expect(writes.at(-1)).toEqual({ startDate: '2026-11-01T06:30:00.000Z' });
});

test('editing one date preserves a saved repeated-hour instant and the draft timezone', async ({ page }) => {
  const savedStart = '2026-11-01T06:30:58.999Z';
  const { writes, acceptWrites } = await projectDates(page, true, null, { startDate: savedStart, endDate: null });
  acceptWrites();
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await expect(page.getByLabel('Project start occurrence')).toHaveValue('later');
  await page.getByLabel('Project end', { exact: true }).fill('2026-11-02T10:30');
  await page.getByLabel('Display time zone').selectOption('America/Los_Angeles');
  await expect(page.getByText(/Editing in America\/New York/)).toBeVisible();
  await expect(page.getByLabel('Project start', { exact: true })).toHaveValue('2026-11-01T01:30');
  await page.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.getByRole('button', { name: 'Edit dates', exact: true })).toBeVisible();
  expect(writes).toEqual([{ endDate: '2026-11-02T15:30:00.000Z' }]);
  await expect(page.locator(`time[datetime="${savedStart}"]`)).toContainText('Oct 31');
  // Reopening uses the new display zone, without changing the saved instant.
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  await expect(page.getByLabel('Project start', { exact: true })).toHaveValue('2026-10-31T23:30');
  await page.getByRole('button', { name: 'Save dates' }).click();
  expect(writes).toHaveLength(1);
});
