import type { Page } from '@playwright/test';
import { checkpointCoverage, expect, test } from './fixtures';

async function projectDates(page: Page, canManage = true, archivedAt: string | null = null) {
  const project = {
    __typename: 'Project', id: 'date-project', name: 'Repair schedule', description: null,
    status: 'PLANNED', priority: 'MEDIUM', canManage, archivedAt, comments: [],
    startDate: '2026-11-14T09:15:30.000Z' as string | null,
    endDate: '2026-11-16T17:00:00.000Z' as string | null,
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
  return { writes };
}

test('owner edits UTC project dates, retries without losing changes, and clears dates', async ({ page }) => {
  const { writes } = await projectDates(page);
  await page.getByRole('button', { name: 'Edit dates', exact: true }).click();
  const start = page.getByLabel('Project start (UTC)');
  const end = page.getByLabel('Project end (UTC)');
  await expect(start).toHaveValue('2026-11-14T09:15');
  await end.fill('2026-11-13T17:00');
  await page.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.getByRole('alert')).toHaveText('Project end must be on or after project start.');
  expect(writes).toEqual([]);
  await end.fill('2026-11-18T17:00');
  await page.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not update project dates. Try again.');
  await expect(end).toHaveValue('2026-11-18T17:00');
  // Updating one endpoint must preserve untouched sub-minute precision on the other endpoint.
  expect(writes[0]).toEqual({ endDate: '2026-11-18T17:00:00.000Z' });
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
    await expect(page.getByText('Start (UTC)', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit dates', exact: true })).toHaveCount(0);
  });
}
