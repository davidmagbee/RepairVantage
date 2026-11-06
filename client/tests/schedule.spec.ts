import { expect, test } from './fixtures';

test('calendar and timeline show scheduled work, assignee, and project tools', async ({ page }) => {
  const user = { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true };
  await page.route('**/api/auth/get-session', route => route.fulfill({
    json: { user, session: { id: 'schedule-session', userId: user.id } },
  }));
  const planned = {
    __typename: 'ScheduleEntry', id: 'paint', kind: 'TASK', projectId: 'porch', projectName: 'Porch repair', name: 'Paint rails',
    startAt: '2026-10-03T00:00:00.000Z', endAt: '2026-10-05T00:00:00.000Z', assigneeName: 'Jordan',
    tools: [{ __typename: 'ScheduleTool', name: 'Drill', quantity: 2 }],
  };
  const project = {
    ...planned, id: 'porch', kind: 'PROJECT', name: 'Porch repair', startAt: '2026-10-01T00:00:00.000Z',
    endAt: '2026-10-01T00:00:00.000Z', assigneeName: null, tools: [],
  };
  let attempts = 0;
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    expect(operationName).toBe('GetSchedule');
    if (variables.to !== '2026-10-08T00:00:00.000Z') return route.fulfill({ json: { data: { schedule: [] } } });
    expect(variables.from).toBe('2026-10-01T00:00:00.000Z');
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 503 });
    return route.fulfill({ json: { data: { schedule: [project, planned] } } });
  });

  await page.goto('/projects/schedule');
  await expect(page.getByText('No scheduled work in this range.')).toBeVisible();
  await page.getByLabel('From date').fill('2026-10-08');
  await page.getByLabel('Through date').fill('2026-10-07');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByRole('alert')).toContainText('1 to 93 days');
  await page.getByLabel('From date').fill('2026-10-01');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not load schedule');
  await page.getByRole('button', { name: 'Retry schedule' }).click();

  const calendar = page.getByRole('list', { name: 'Calendar dates' });
  await expect(calendar.getByRole('link', { name: 'Paint rails' })).toHaveAttribute('href', '/projects/porch');
  await expect(calendar).toContainText('Assignee: Jordan');
  await expect(calendar).toContainText('Project tools: Drill × 2');
  await page.getByRole('button', { name: 'Timeline' }).click();
  const timeline = page.getByRole('list', { name: 'Timeline rows' });
  await expect(timeline.getByRole('link', { name: 'Porch repair' })).toBeVisible();
  await expect(timeline).toContainText('2026-10-03 – 2026-10-05');
  await expect(page.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true');
});
