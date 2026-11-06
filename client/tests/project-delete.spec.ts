import { expect, test } from './fixtures';

const project = {
  __typename: 'Project',
  id: 'unneeded-project',
  name: 'Unneeded repair',
  description: null,
  status: 'PLANNED',
  priority: 'MEDIUM',
  archivedAt: null,
  canManage: true,
  comments: [],
};

test('permanent project deletion requires confirmation and returns the owner to Projects', async ({ page }) => {
  const user = { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true };
  let writes = 0;
  await page.route('**/api/auth/get-session', route => route.fulfill({
    json: { user, session: { id: 'delete-session', userId: user.id } },
  }));
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    switch (operationName) {
      case 'GetProjectDetails':
        return route.fulfill({ json: { data: { project } } });
      case 'ProjectSharing':
        return route.fulfill({ json: { data: { project: { showcase: null }, projectInvites: [], projectMembers: [] } } });
      case 'DeleteProject':
        expect(variables.id).toBe(project.id);
        writes += 1;
        if (writes === 1) return route.fulfill({ json: { errors: [{ message: 'Write unavailable' }] } });
        return route.fulfill({ json: { data: { deleteProject: true } } });
      case 'GetProjects':
        return route.fulfill({ json: { data: { projects: [], sharedProjects: [] } } });
      default:
        throw new Error(`Unexpected deletion test operation: ${operationName}`);
    }
  });
  await page.goto(`/projects/${project.id}`);
  const deleteButton = page.getByRole('button', { name: 'Delete project permanently' });
  await expect(deleteButton).toBeVisible();
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain(project.name);
    await dialog.dismiss();
  });
  await deleteButton.click();
  expect(writes).toBe(0);
  await expect(page.getByRole('heading', { name: project.name })).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await deleteButton.click();
  await expect(page.getByRole('alert')).toHaveText('Could not delete the project. Try again.');
  await expect(page.getByRole('heading', { name: project.name })).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await deleteButton.click();
  await expect(page).toHaveURL('/projects');
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  expect(writes).toBe(2);
});
