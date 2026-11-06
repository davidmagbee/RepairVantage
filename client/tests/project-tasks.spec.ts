import { checkpointCoverage, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const projectId = 'porch-repair';
const projectPath = `/projects/${projectId}`;
const user = { id: 'project-user', name: 'Repair account', email: 'repair@example.test', emailVerified: true };

type TaskFixture = {
  __typename: 'Task';
  id: string;
  name: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  completedDate: string | null;
  assignee: null;
};

const savedTask: TaskFixture = {
  __typename: 'Task', id: 'check-joists', name: 'Check the joists', description: 'Probe for rot.',
  status: 'TODO', dueDate: '2026-11-06T20:45:37.123Z', completedDate: null, assignee: null,
};
const completedDate = '2026-11-06T22:00:00.000Z';

test.use({ timezoneId: 'America/New_York' });

async function mockTasks(page: Page, {
  canManage = true, archivedAt = null, initialTasks = [],
}: { canManage?: boolean; archivedAt?: string | null; initialTasks?: TaskFixture[] } = {}) {
  const tasks = [...initialTasks];
  let rejectRead = false;
  let rejectWrite = false;
  await page.route('**/api/auth/get-session', route =>
    route.fulfill({ json: { user, session: { id: 'test-session', userId: user.id } } }),
  );
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    switch (operationName) {
      case 'GetProjectDetails':
        return route.fulfill({ json: { data: { project: {
          __typename: 'Project', id: projectId, name: 'Repair the porch', description: null,
          status: 'PLANNED', priority: 'MEDIUM', canManage, archivedAt, comments: [],
        } } } });
      case 'ProjectSharing':
        return route.fulfill({ json: { data: { project: { showcase: null }, projectInvites: [], projectMembers: [] } } });
      case 'GetProjectTasks':
        expect(variables.projectId).toBe(projectId);
        if (rejectRead) {
          rejectRead = false;
          return route.fulfill({ json: { errors: [{ message: 'Task read failed' }] } });
        }
        return route.fulfill({ json: { data: { tasks, ...(canManage && { projectMembers: [] }) } } });
      case 'CreateProjectTask': {
        expect(variables.input.projectId).toBe(projectId);
        if (rejectWrite) {
          rejectWrite = false;
          return route.fulfill({ json: { errors: [{ message: 'Task write failed' }] } });
        }
        const task: TaskFixture = { __typename: 'Task', id: 'new-task', completedDate: null, assignee: null, ...variables.input };
        tasks.push(task);
        return route.fulfill({ json: { data: { createTask: task } } });
      }
      case 'UpdateProjectTask': {
        const task = tasks.find(task => task.id === variables.id);
        if (!task) throw new Error('Attempted to update a missing fixture task');
        Object.assign(task, variables.input);
        task.completedDate = task.status === 'COMPLETED' ? completedDate : null;
        return route.fulfill({ json: { data: { updateTask: task } } });
      }
      case 'DeleteProjectTask': {
        const index = tasks.findIndex(task => task.id === variables.id);
        expect(index).toBeGreaterThanOrEqual(0);
        tasks.splice(index, 1);
        return route.fulfill({ json: { data: { deleteTask: true } } });
      }
      default:
        throw new Error(`Unexpected task workflow operation: ${operationName}`);
    }
  });
  return {
    rejectNextRead: () => { rejectRead = true; },
    rejectNextCreate: () => { rejectWrite = true; },
  };
}

test('an owner can create a project task and reopen it after reload', async ({ page }) => {
  await mockTasks(page);
  await page.goto(projectPath);
  await page.getByRole('button', { name: 'Show tasks' }).click();
  const tasks = page.getByRole('region', { name: 'Tasks', exact: true });
  await expect(tasks.getByText('No tasks yet.')).toBeVisible();
  await tasks.getByRole('button', { name: 'Add task' }).click();
  await tasks.getByLabel('Task name').fill('  Inspect the footers  ');
  await tasks.getByLabel('Description (optional)').fill('  Check the post bases.  ');
  await tasks.getByRole('button', { name: 'Create task' }).click();
  await expect(tasks.getByRole('heading', { name: 'Inspect the footers' })).toBeVisible();
  await expect(tasks.getByText('Check the post bases.')).toBeVisible();

  await checkpointCoverage(page);
  await page.reload();
  await page.getByRole('button', { name: 'Show tasks' }).click();
  await expect(tasks.getByRole('heading', { name: 'Inspect the footers' })).toBeVisible();
});

test('an owner can edit, complete, and delete a task while preserving its untouched deadline', async ({ page }) => {
  await mockTasks(page, { initialTasks: [{ ...savedTask }] });
  await page.goto(projectPath);
  await page.getByRole('button', { name: 'Show tasks' }).click();
  const tasks = page.getByRole('region', { name: 'Tasks', exact: true });
  await tasks.getByRole('button', { name: 'Edit Check the joists' }).click();
  await expect(tasks.getByLabel('Due date and time (local, optional)')).toHaveValue('2026-11-06T15:45');
  await tasks.getByLabel('Task name').fill('Check and clean the joists');
  await tasks.getByLabel('Description (optional)').fill('');
  await tasks.getByLabel('Task status').selectOption('COMPLETED');
  await tasks.getByRole('button', { name: 'Save task' }).click();
  await expect(tasks.getByRole('heading', { name: 'Check and clean the joists' })).toBeVisible();
  await expect(tasks.getByText('Probe for rot.')).toHaveCount(0);
  await expect(tasks.locator(`time[datetime="${savedTask.dueDate}"]`)).toBeVisible();
  await expect(tasks.locator(`time[datetime="${completedDate}"]`)).toBeVisible();

  const deleteTask = tasks.getByRole('button', { name: 'Delete Check and clean the joists' });
  await deleteTask.click();
  const confirmation = tasks.getByRole('group', { name: 'Confirm task deletion' });
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(tasks.getByRole('heading', { name: 'Check and clean the joists' })).toBeVisible();
  await deleteTask.click();
  await confirmation.getByRole('button', { name: 'Delete task' }).click();
  await expect(tasks.getByText('No tasks yet.')).toBeVisible();
});

test('dragging a task between status columns saves its new status', async ({ page }) => {
  await mockTasks(page, { initialTasks: [{ ...savedTask }] });
  await page.goto(projectPath);
  await page.getByRole('button', { name: 'Show tasks' }).click();
  const tasks = page.getByRole('region', { name: 'Tasks', exact: true });
  const from = tasks.getByRole('region', { name: 'To do', exact: true });
  const to = tasks.getByRole('region', { name: 'In progress', exact: true });
  const task = from.getByRole('listitem').filter({ hasText: savedTask.name });
  await expect(task).toBeVisible();
  await task.dragTo(from.getByRole('heading', { name: 'To do', exact: true }));
  await expect(task).toBeVisible();
  await task.dragTo(to.getByRole('heading', { name: 'In progress', exact: true }));
  await expect(to.getByRole('heading', { name: savedTask.name })).toBeVisible();
  await expect(from.getByRole('heading', { name: savedTask.name })).toHaveCount(0);
  await checkpointCoverage(page);
  await page.reload();
  await page.getByRole('button', { name: 'Show tasks' }).click();
  await expect(to.getByRole('heading', { name: savedTask.name })).toBeVisible();
});

test('task validation and request failures preserve recoverable input', async ({ page }) => {
  const { rejectNextRead, rejectNextCreate } = await mockTasks(page);
  rejectNextRead();
  await page.goto(projectPath);
  await page.getByRole('button', { name: 'Show tasks' }).click();
  const tasks = page.getByRole('region', { name: 'Tasks', exact: true });
  await expect(tasks.getByRole('alert')).toHaveText('Could not load tasks.');
  await tasks.getByRole('button', { name: 'Retry tasks' }).click();
  await tasks.getByRole('button', { name: 'Add task' }).click();
  const name = tasks.getByLabel('Task name');
  const due = tasks.getByLabel('Due date and time (local, optional)');
  const create = tasks.getByRole('button', { name: 'Create task' });
  await name.fill('   ');
  await create.click();
  await expect(tasks.getByRole('alert')).toHaveText('Enter a task name.');

  await name.fill('Reset the porch boards');
  await due.fill('2026-03-08T02:30');
  await create.click();
  await expect(tasks.getByRole('alert')).toHaveText('Enter a valid local due date and time.');
  await due.fill('2026-03-08T03:30');

  rejectNextCreate();
  await create.click();
  await expect(tasks.getByRole('alert')).toHaveText('Could not create the task. Try again.');
  await expect(name).toHaveValue('Reset the porch boards');
  await expect(due).toHaveValue('2026-03-08T03:30');

  rejectNextRead();
  await create.click();
  await expect(tasks.getByText('Task board updated.')).toBeVisible();
  await expect(tasks.getByRole('alert')).toHaveText('Could not load tasks.');
  await tasks.getByRole('button', { name: 'Retry tasks' }).click();
  await expect(tasks.getByRole('heading', { name: 'Reset the porch boards' })).toBeVisible();
  await expect(tasks.locator('time[datetime="2026-03-08T07:30:00.000Z"]')).toBeVisible();
});

test('the task board is read-only for an archived project owner', async ({ page }) => {
  await mockTasks(page, { archivedAt: '2026-11-06T22:00:00.000Z', initialTasks: [{ ...savedTask }] });
  await page.goto(projectPath);
  await page.getByRole('button', { name: 'Show tasks' }).click();
  const tasks = page.getByRole('region', { name: 'Tasks', exact: true });
  await expect(tasks.getByRole('heading', { name: savedTask.name })).toBeVisible();
  await expect(tasks.getByText('Tasks are read-only while this project is archived.')).toBeVisible();
  await expect(tasks.getByRole('listitem').filter({ hasText: savedTask.name })).toHaveAttribute('draggable', 'false');
  await expect(tasks.getByRole('button', { name: /Add task|Edit|Delete/ })).toHaveCount(0);
});

test('a project member without assigned tasks sees an empty board without owner actions', async ({ page }) => {
  await mockTasks(page, { canManage: false });
  await page.goto(projectPath);
  await expect(page.getByRole('heading', { name: 'Repair the porch' })).toBeVisible();
  await page.getByRole('button', { name: 'Show tasks' }).click();
  const tasks = page.getByRole('region', { name: 'Tasks', exact: true });
  await expect(tasks.getByText('No assigned tasks yet.')).toBeVisible();
  await expect(tasks.getByRole('button', { name: 'Add task' })).toHaveCount(0);
});
