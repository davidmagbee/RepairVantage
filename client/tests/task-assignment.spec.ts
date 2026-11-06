import { checkpointCoverage, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const member = { id: 'member', name: 'Casey', email: 'casey@example.test', emailVerified: true };
const owner = { id: 'owner', name: 'Repair owner', email: 'owner@example.test', emailVerified: true };
const projectId = 'porch-repair';
const taskName = 'Check the joists';

async function mockProject(page: Page, { asMember = false, archived = false, rejectFirstAssignment = false } = {}) {
  const user = asMember ? member : owner;
  const memberDisplay = { id: member.id, name: member.name };
  const task = {
    __typename: 'Task', id: 'check-joists', name: taskName, status: 'TODO',
    description: null, dueDate: null, completedDate: null,
    assignee: asMember ? memberDisplay : null,
  };
  await page.route('**/api/auth/get-session', route =>
    route.fulfill({ json: { user, session: { id: 'test-session', userId: user.id } } }),
  );
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    switch (operationName) {
      case 'GetProjectDetails':
        return route.fulfill({ json: { data: { project: {
          __typename: 'Project', id: projectId, name: 'Repair the porch', description: null,
          status: 'PLANNED', priority: 'MEDIUM', canManage: !asMember,
          archivedAt: archived ? '2026-11-06T22:00:00.000Z' : null, comments: [],
        } } } });
      case 'ProjectSharing':
        expect(asMember).toBe(false);
        return route.fulfill({ json: { data: { project: { showcase: null }, projectInvites: [], projectMembers: [{ user: member }] } } });
      case 'GetProjectTasks':
        expect(variables).toEqual({ projectId, canManage: !asMember });
        return route.fulfill({ json: { data: {
          tasks: [task],
          ...(!asMember && { projectMembers: [{ user: member }] }),
        } } });
      case 'SetProjectTaskAssignee':
        expect(asMember).toBe(false);
        expect(variables.id).toBe(task.id);
        expect([member.id, null]).toContain(variables.userId);
        if (rejectFirstAssignment) {
          rejectFirstAssignment = false;
          return route.fulfill({ json: { errors: [{ message: 'Assignment write failed' }] } });
        }
        task.assignee = variables.userId ? memberDisplay : null;
        return route.fulfill({ json: { data: { setTaskAssignee: task } } });
      case 'UpdateProjectTask':
        expect(asMember).toBe(true);
        expect(archived).toBe(false);
        expect(variables).toEqual({ id: task.id, input: { status: 'REVIEW' } });
        task.status = variables.input.status;
        return route.fulfill({ json: { data: { updateTask: task } } });
      default:
        throw new Error(`Unexpected assignment operation: ${operationName}`);
    }
  });
  await page.goto(`/projects/${projectId}`);
  await page.getByRole('button', { name: 'Show tasks' }).click();
  return page.getByRole('region', { name: 'Tasks', exact: true });
}

test('a project owner can retry assignment to an existing member and later unassign', async ({ page }) => {
  const tasks = await mockProject(page, { rejectFirstAssignment: true });
  const assign = tasks.getByRole('button', { name: `Assign ${taskName}` });
  await assign.click();
  const assignee = tasks.getByLabel('Task assignee');
  await expect(assignee.getByRole('option')).toHaveText(['Unassigned', 'Casey · casey@example.test']);
  await assignee.selectOption('member');
  const save = tasks.getByRole('button', { name: 'Save assignee' });
  await save.click();
  await expect(tasks.getByRole('alert')).toHaveText('Could not change the assignee. Check project membership and try again.');
  await expect(assignee).toHaveValue('member');
  await save.click();
  await expect(tasks.getByText('Assigned to Casey')).toBeVisible();

  await checkpointCoverage(page);
  await page.reload();
  await page.getByRole('button', { name: 'Show tasks' }).click();
  await expect(tasks.getByText('Assigned to Casey')).toBeVisible();
  await assign.click();
  await assignee.selectOption('');
  await save.click();
  await expect(tasks.getByRole('listitem').getByText('Unassigned')).toBeVisible();
});

test('an assigned member can update task status and only sees member controls', async ({ page }) => {
  const tasks = await mockProject(page, { asMember: true });
  await expect(tasks.getByRole('heading', { name: taskName })).toBeVisible();
  await expect(tasks.getByRole('button', { name: /Add task|Assign|Delete/ })).toHaveCount(0);
  await tasks.getByRole('button', { name: `Edit ${taskName}` }).click();
  await tasks.getByLabel('Task status').selectOption('REVIEW');
  await tasks.getByRole('button', { name: 'Save task' }).click();
  await expect(tasks.getByRole('region', { name: 'Review' }).getByRole('heading', { name: taskName })).toBeVisible();
});

test('an assigned member can still read an archived task', async ({ page }) => {
  const tasks = await mockProject(page, { asMember: true, archived: true });
  await expect(tasks.getByRole('heading', { name: taskName })).toBeVisible();
  await expect(tasks.getByRole('button', { name: /Add task|Assign|Edit|Delete/ })).toHaveCount(0);
});
