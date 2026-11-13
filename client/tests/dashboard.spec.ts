import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const owner = { id: 'dashboard-owner', name: 'Repair owner', email: 'owner@example.test', emailVerified: true };
const summary = {
  __typename: 'DashboardData',
  totalProjects: 5,
  completedProjects: 1,
  projectsByStatus: [
    { __typename: 'StatusCount', status: 'PLANNED', count: 2 },
    { __typename: 'StatusCount', status: 'IN_PROGRESS', count: 1 },
    { __typename: 'StatusCount', status: 'ON_HOLD', count: 1 },
    { __typename: 'StatusCount', status: 'COMPLETED', count: 1 },
    { __typename: 'StatusCount', status: 'CANCELLED', count: 0 },
  ],
  recentProjects: [{
    __typename: 'Project', id: 'porch', name: 'Porch repair', status: 'IN_PROGRESS', priority: 'MEDIUM',
    updatedAt: '2026-11-13T12:00:00.000Z', canManage: true,
  }],
  upcomingDeadlines: [{
    __typename: 'Task', id: 'order-seals', name: 'Order replacement seals', dueDate: '2026-11-16T12:00:00.000Z',
    project: { __typename: 'Project', id: 'porch', name: 'Porch repair' },
  }],
};

async function verifiedSession(page: Page) {
  await page.route('**/api/auth/get-session', route => route.fulfill({
    json: { user: owner, session: { id: 'dashboard-session', userId: owner.id } },
  }));
}

test('dashboard derives summary values and links real project updates and deadlines', async ({ page }) => {
  await verifiedSession(page);
  await page.route('**/graphql', route => {
    expect(route.request().postDataJSON().operationName).toBe('GetDashboardData');
    return route.fulfill({ json: { data: { dashboardData: summary } } });
  });
  await page.goto('/projects/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  // Verify named metric values rather than snapshotting layout or repeating the calculation in the test.
  for (const [label, value] of [
    ['Total Projects', '5'], ['Active Projects', '4'], ['Completed', '1'],
  ]) {
    const metric = page.getByRole('region', { name: label, exact: true });
    await expect(metric.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'Completed', exact: true }).getByText('20%', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Project completion' })).toHaveAttribute('value', '20');
  const updates = page.getByRole('region', { name: 'Recent project updates' });
  await expect(updates.getByRole('link', { name: /Porch repair/ })).toHaveAttribute('href', '/projects/porch');
  await expect(updates.getByRole('link')).toHaveCount(1);
  const deadlines = page.getByRole('region', { name: 'Upcoming deadlines' });
  await expect(deadlines.getByRole('link', { name: /Order replacement seals/ })).toHaveAttribute('href', '/projects/porch');
  await expect(deadlines).toContainText('Porch repair');
  await expect(deadlines.locator('time')).toHaveAttribute('datetime', '2026-11-16T12:00:00.000Z');
  await expect(page.getByRole('region', { name: 'Project status' })).toContainText(/planned/i);
  await expect(page.getByRole('heading', { name: 'Recent activity', exact: true })).toHaveCount(0);

  // Narrow layouts must preserve reachable navigation and fit the viewport without horizontal scrolling.
  for (const viewport of [{ width: 1440, height: 960 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    const dashboardLink = page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Dashboard', exact: true });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('dashboard retries a failed read and explains the empty workspace without invalid percentages', async ({ page }) => {
  await verifiedSession(page);
  let failed = false;
  await page.route('**/graphql', route => {
    expect(route.request().postDataJSON().operationName).toBe('GetDashboardData');
    if (!failed) {
      failed = true;
      return route.fulfill({ json: { errors: [{ message: 'Dashboard unavailable' }] } });
    }
    return route.fulfill({ json: { data: { dashboardData: {
      __typename: 'DashboardData', totalProjects: 0, completedProjects: 0,
      projectsByStatus: [], recentProjects: [], upcomingDeadlines: [],
    } } } });
  });
  await page.goto('/projects/dashboard');
  await expect(page.getByRole('alert')).toContainText('Could not load');
  await page.getByRole('button', { name: 'Retry dashboard' }).click();
  await expect(page.getByText('No projects yet.', { exact: true })).toBeVisible();
  await expect(page.getByText('No project updates yet.', { exact: true })).toBeVisible();
  await expect(page.getByText('No upcoming deadlines in the next 7 days.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Completed', exact: true }).getByText('0%', { exact: true })).toBeVisible();
  await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Create project/i }).first()).toHaveAttribute('href', '/projects/new');
});

test('dashboard keeps long unbroken project and task names inside a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await verifiedSession(page);
  const name = 'X'.repeat(120);
  await page.route('**/graphql', route => {
    expect(route.request().postDataJSON().operationName).toBe('GetDashboardData');
    return route.fulfill({ json: { data: { dashboardData: {
      ...summary,
      recentProjects: [{ ...summary.recentProjects[0], name }],
      upcomingDeadlines: [{ ...summary.upcomingDeadlines[0], name, project: { ...summary.upcomingDeadlines[0].project, name } }],
    } } } });
  });
  await page.goto('/projects/dashboard');
  await expect(page.getByRole('region', { name: 'Recent project updates' }).getByRole('link')).toContainText(name);
  await expect(page.getByRole('region', { name: 'Upcoming deadlines' }).getByRole('link', { name: new RegExp(name) })).toBeVisible();
  // Valid maximum-length titles need wrapping even when they contain no natural word boundaries.
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
