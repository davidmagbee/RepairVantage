import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ timezoneId: 'America/New_York', locale: 'en-US' });

async function ownerSession(page: Page) {
  const user = { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true };
  await page.route('**/api/auth/get-session', route => route.fulfill({
    json: { user, session: { id: 'schedule-session', userId: user.id } },
  }));
}

test('calendar and timeline show scheduled work, assignee, and project tools', async ({ page }) => {
  await ownerSession(page);
  const planned = {
    __typename: 'ScheduleEntry', id: 'paint', kind: 'TASK', projectId: 'porch', projectName: 'Porch repair', name: 'Paint rails',
    startAt: '2026-10-03T04:00:00.000Z', endAt: '2026-10-05T04:00:00.000Z', assigneeName: 'Jordan',
    tools: [{ __typename: 'ScheduleTool', name: 'Drill', quantity: 2 }],
  };
  const project = {
    ...planned, id: 'porch', kind: 'PROJECT', name: 'Porch repair', startAt: '2026-10-01T04:00:00.000Z',
    endAt: '2026-10-01T04:00:00.000Z', assigneeName: null, tools: [],
  };
  let attempts = 0;
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    expect(operationName).toBe('GetSchedule');
    expect(variables.timeZone).toBe('America/New_York');
    if (variables.to !== '2026-10-08T04:00:00.000Z') return route.fulfill({ json: { data: { schedule: [] } } });
    expect(variables.from).toBe('2026-10-01T04:00:00.000Z');
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 503 });
    return route.fulfill({ json: { data: { schedule: [project, planned] } } });
  });

  await page.goto('/projects/schedule');
  await expect(page.getByText('No scheduled work in this range.')).toBeVisible();
  await page.getByLabel('From date').fill('2026-10-08');
  await page.getByLabel('Through date').fill('2026-10-07');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByRole('alert')).toContainText('1 to 93 calendar days');
  await page.getByLabel('From date').fill('2026-10-01');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not load schedule');
  await page.getByRole('button', { name: 'Retry schedule' }).click();

  const calendar = page.getByRole('list', { name: 'Calendar dates' });
  await expect(calendar.getByRole('link', { name: 'Paint rails' })).toHaveAttribute('href', '/projects/porch');
  const taskDay = calendar.locator('li').filter({ has: page.locator('time[datetime="2026-10-03"]') });
  await expect(taskDay.getByRole('link', { name: 'Paint rails' })).toBeVisible();
  await expect(calendar).toContainText('Assignee: Jordan');
  await expect(calendar).toContainText('Project tools: Drill × 2');
  await page.getByRole('button', { name: 'Timeline' }).click();
  const timeline = page.getByRole('list', { name: 'Timeline rows' });
  await expect(timeline.getByRole('link', { name: 'Porch repair' })).toBeVisible();
  await expect(timeline).toContainText('Oct 3, 2026, 12:00 AM EDT – Oct 5, 2026, 12:00 AM EDT');
  await expect(page.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true');
});

test('a 93-day civil range spanning the autumn clock change sends an extra elapsed hour', async ({ page }) => {
  await ownerSession(page);
  const reads: { from: string; to: string; timeZone: string }[] = [];
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    expect(operationName).toBe('GetSchedule');
    reads.push(variables);
    return route.fulfill({ json: { data: { schedule: [] } } });
  });
  await page.goto('/projects/schedule');
  await expect(page.getByText('No scheduled work in this range.')).toBeVisible();
  await page.getByLabel('From date').fill('2026-08-01');
  await page.getByLabel('Through date').fill('2026-11-01');
  await page.getByRole('button', { name: 'Apply range' }).click();
  const expected = { from: '2026-08-01T04:00:00.000Z', to: '2026-11-02T05:00:00.000Z', timeZone: 'America/New_York' };
  await expect.poll(() => reads.at(-1)).toEqual(expected);
  // The extra elapsed hour must not turn a valid 93-calendar-day selection into a validation error.
  expect(Date.parse(expected.to) - Date.parse(expected.from)).toBe(93 * 86_400_000 + 3_600_000);
  await expect(page.getByRole('alert')).toHaveCount(0);
  const acceptedReads = reads.length;
  await page.getByLabel('Through date').fill('2026-11-02');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByRole('alert')).toContainText('1 to 93 calendar days');
  expect(reads).toHaveLength(acceptedReads);
});

test('switching display zones requeries local-midnight bounds without changing selected dates', async ({ page }) => {
  await ownerSession(page);
  const reads: { from: string; to: string; timeZone: string }[] = [];
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    expect(operationName).toBe('GetSchedule');
    reads.push(variables);
    return route.fulfill({ json: { data: { schedule: [] } } });
  });
  await page.goto('/projects/schedule');
  await expect(page.getByText('No scheduled work in this range.')).toBeVisible();
  await page.getByLabel('From date').fill('2026-10-01');
  await page.getByLabel('Through date').fill('2026-10-07');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect.poll(() => reads.at(-1)).toEqual({ from: '2026-10-01T04:00:00.000Z', to: '2026-10-08T04:00:00.000Z', timeZone: 'America/New_York' });
  await page.getByRole('combobox', { name: 'Display time zone' }).selectOption('America/Los_Angeles');
  await expect.poll(() => reads.at(-1)).toEqual({ from: '2026-10-01T07:00:00.000Z', to: '2026-10-08T07:00:00.000Z', timeZone: 'America/Los_Angeles' });
  await expect(page.getByLabel('From date')).toHaveValue('2026-10-01');
  await expect(page.getByLabel('Through date')).toHaveValue('2026-10-07');
  await expect(page.getByText(/Dates are shown in America\/Los Angeles/)).toBeVisible();
});
