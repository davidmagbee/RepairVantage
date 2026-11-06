import { checkpointCoverage, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const project = {
  __typename: 'Project',
  id: 'hinge-repair',
  name: 'Repair a loose hinge',
  description: 'Replace the upper hinge.',
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  canManage: true,
  comments: [],
};

async function mockProject(page: Page, canManage = true) {
  const user = { id: 'signed-in', name: 'Project reader', email: 'reader@example.test', emailVerified: true };
  let priority = project.priority;
  let rejectNextSave = false;
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: { user, session: { id: 'test-session', userId: user.id } } }),
  );
  await page.route('**/graphql', (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    switch (operationName) {
      case 'GetProjectDetails':
        return route.fulfill({ json: { data: { project: { ...project, priority, canManage } } } });
      case 'ProjectSharing':
        return route.fulfill({ json: { data: { project: { showcase: null }, projectInvites: [], projectMembers: [] } } });
      case 'UpdateProjectPriority':
        expect(variables.id).toBe(project.id);
        if (rejectNextSave) {
          rejectNextSave = false;
          return route.fulfill({ json: { errors: [{ message: 'Priority write failed' }] } });
        }
        priority = variables.priority;
        return route.fulfill({ json: { data: { updateProject: { __typename: 'Project', id: project.id, priority } } } });
      default:
        throw new Error(`Unexpected operation: ${operationName}`);
    }
  });
  await page.goto(`/projects/${project.id}`);
  return { rejectNextSave: () => { rejectNextSave = true; } };
}

test('an owner can save a priority independently of project status and see it after reload', async ({ page }) => {
  await mockProject(page);
  const priority = page.getByLabel('Project priority');
  await expect(priority).toHaveValue('MEDIUM');
  await expect(priority.getByRole('option')).toHaveText(['low', 'medium', 'high', 'critical']);
  const status = page.getByLabel('Project status');
  await status.selectOption('COMPLETED');
  await priority.selectOption('CRITICAL');
  await page.getByRole('button', { name: 'Save priority' }).click();
  await expect(page.locator('dd', { hasText: /^critical$/ })).toBeVisible();
  await expect(page.locator('dd', { hasText: /^in progress$/ })).toBeVisible();
  await expect(status).toHaveValue('COMPLETED');

  await checkpointCoverage(page);
  await page.reload();
  await expect(priority).toHaveValue('CRITICAL');
  await expect(status).toHaveValue('IN_PROGRESS');
});

test('an owner can retry a priority change after a rejected write', async ({ page }) => {
  const { rejectNextSave } = await mockProject(page);
  const priority = page.getByLabel('Project priority');
  const savePriority = page.getByRole('button', { name: 'Save priority' });
  rejectNextSave();

  await priority.selectOption('HIGH');
  await savePriority.click();
  await expect(page.getByRole('alert')).toHaveText('Could not update project priority. Try again.');
  await expect(page.locator('dd', { hasText: /^medium$/ })).toBeVisible();
  await expect(priority).toHaveValue('HIGH');

  await savePriority.click();
  await expect(page.locator('dd', { hasText: /^high$/ })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a project member can read priority without owner controls', async ({ page }) => {
  await mockProject(page, false);
  await expect(page.locator('dd', { hasText: /^medium$/ })).toBeVisible();
  await expect(page.getByLabel('Project priority')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save priority' })).toHaveCount(0);
});
