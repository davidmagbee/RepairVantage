import { expect, test } from './fixtures';

const owner = { id: 'owner', name: 'Repair owner', email: 'owner@example.test', emailVerified: true };
const session = { id: 'test-session', userId: owner.id, expiresAt: '2099-01-01T00:00:00.000Z' };
const ownedProject = {
  __typename: 'Project',
  id: 'owned-repair',
  name: 'Repair the workbench',
  description: 'Replace the damaged top.',
  status: 'PLANNED',
  priority: 'MEDIUM',
  canManage: true,
};
const sharedProject = {
  ...ownedProject,
  id: 'shared-repair',
  name: 'Rehang the shed door',
  description: 'Fit new hinges.',
  canManage: false,
};

test('opens owned and shared projects from the card padding and keyboard', async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: { user: owner, session } }));
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    switch (operationName) {
      case 'GetProjects':
        return route.fulfill({ json: { data: { projects: [ownedProject], sharedProjects: [sharedProject] } } });
      case 'GetProjectDetails': {
        const project = variables.id === ownedProject.id ? ownedProject : sharedProject;
        return route.fulfill({ json: { data: { project: { ...project, comments: [] } } } });
      }
      case 'ProjectSharing':
        return route.fulfill({ json: { data: { project: { showcase: null }, projectInvites: [], projectMembers: [] } } });
      default:
        throw new Error(`Unexpected project operation: ${operationName}`);
    }
  });

  await page.goto('/projects');
  const ownedCard = page.getByRole('region', { name: 'Owned projects' }).getByRole('listitem');
  await expect(ownedCard.getByRole('link')).toHaveCount(1);
  await ownedCard.click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL('/projects/owned-repair');
  await expect(page.getByRole('heading', { name: ownedProject.name })).toBeVisible();

  await page.getByRole('link', { name: 'Back to projects' }).click();
  const sharedCard = page.getByRole('region', { name: 'Shared with you' }).getByRole('listitem');
  await expect(sharedCard.getByRole('link')).toHaveCount(1);
  const sharedLink = sharedCard.getByRole('link', { name: sharedProject.name, exact: true });
  await sharedLink.focus();
  await sharedLink.press('Enter');
  await expect(page).toHaveURL('/projects/shared-repair');
  await expect(page.getByRole('heading', { name: sharedProject.name })).toBeVisible();
});

test('project filters keep owned and shared results separate and can be cleared', async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: { user: owner, session } }));
  await page.route('**/graphql', route => route.fulfill({ json: { data: {
    projects: [ownedProject], sharedProjects: [sharedProject],
  } } }));
  await page.goto('/projects');
  await page.getByLabel('Search projects').fill('shed');
  await expect(page.getByRole('region', { name: 'Owned projects' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Shared with you' }).getByRole('link', { name: sharedProject.name, exact: true })).toBeVisible();
  await page.getByLabel('Search projects').fill('no matching repair');
  await expect(page.getByRole('status')).toHaveText('No projects match your filters.');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('region', { name: 'Owned projects' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Shared with you' })).toBeVisible();
  await page.getByLabel('Filter by status').selectOption('COMPLETED');
  await expect(page.getByRole('status')).toHaveText('No projects match your filters.');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Filter by status')).toHaveValue('');
  await expect(page.getByRole('link', { name: ownedProject.name, exact: true })).toBeVisible();
});
