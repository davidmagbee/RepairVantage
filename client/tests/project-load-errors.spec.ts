import { expect, test } from './fixtures';

const reader = { id: 'reader', name: 'Project reader', email: 'reader@example.test', emailVerified: true };
const readerSession = { user: reader, session: { id: 'test-session', userId: reader.id } };

for (const scenario of [
  {
    path: '/projects',
    privatePage: true,
    error: 'Could not load projects.',
    heading: 'No projects yet',
    data: { projects: [], sharedProjects: [] },
  },
  {
    path: '/projects/saved-project',
    privatePage: true,
    error: 'Could not load the project.',
    heading: 'Repair a loose hinge',
    data: {
      project: {
        __typename: 'Project',
        id: 'saved-project',
        name: 'Repair a loose hinge',
        description: null,
        status: 'PLANNED',
        priority: 'MEDIUM',
        canManage: false,
        comments: [],
      },
    },
  },
  {
    path: '/showcase/published-project',
    privatePage: false,
    error: 'Couldn’t load this showcase.',
    heading: 'Hinge repair update',
    data: {
      showcaseProject: {
        __typename: 'ShowcaseProject',
        slug: 'published-project',
        title: 'Hinge repair update',
        summary: 'The hinge is ready to reinstall.',
        status: 'IN_PROGRESS',
      },
    },
  },
]) {
  test(`${scenario.path} can recover after a failed GraphQL read`, async ({ page }) => {
    let available = false;
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await page.route('**/api/auth/get-session', (route) =>
      route.fulfill({ json: scenario.privatePage ? readerSession : null }),
    );
    await page.route('**/graphql', (route) => route.fulfill({
      json: available
        ? { data: scenario.data }
        : { errors: [{ message: 'Request failed' }] },
    }));

    await page.goto(scenario.path);
    await expect(page.getByRole('alert')).toContainText(scenario.error);
    await expect(page.getByRole('heading', { name: scenario.heading })).toHaveCount(0);

    const failedRetry = page.waitForResponse((response) => new URL(response.url()).pathname === '/graphql');
    await page.getByRole('button', { name: 'Try again' }).click();
    await (await failedRetry).finished();
    await expect(page.getByRole('alert')).toContainText(scenario.error);

    available = true;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: scenario.heading })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page).toHaveURL(scenario.path);
    expect(browserErrors).toEqual([]);
  });
}

test('the app fails fast if its served HTML is missing the mount point', async ({ page }) => {
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({ response, body: html.replace('<div id="root"></div>', '') });
  });

  const error = page.waitForEvent('pageerror');
  await page.goto('/');
  expect((await error).message).toBe('Failed to find the root element');
});

test('failed project writes preserve the last saved status and the comment draft', async ({ page }) => {
  let status = 'PLANNED';
  let rejectStatus = true;
  let rejectComment = true;
  const comments: unknown[] = [];
  const body = 'The replacement hinge is ready.';
  await page.route('**/api/auth/get-session', (route) => route.fulfill({ json: readerSession }));
  await page.route('**/graphql', (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    const failure = { errors: [{ message: 'Write failed' }] };
    switch (operationName) {
      case 'GetProjectDetails':
        return route.fulfill({ json: { data: { project: {
          __typename: 'Project', id: 'saved-project', name: 'Hinge repair', description: null,
          status, priority: 'MEDIUM', canManage: true, comments,
        } } } });
      case 'ProjectSharing':
        return route.fulfill({ json: { data: { project: { showcase: null }, projectInvites: [], projectMembers: [] } } });
      case 'UpdateProjectStatus':
        if (rejectStatus) return route.fulfill({ json: failure });
        status = variables.status;
        return route.fulfill({ json: { data: { updateProject: { __typename: 'Project', id: 'saved-project', status } } } });
      case 'AddProjectComment': {
        if (rejectComment) return route.fulfill({ json: failure });
        const comment = {
          __typename: 'ProjectComment', id: 'comment-1', body: variables.body,
          createdAt: '2026-01-01T12:00:00Z', author: { name: reader.name },
        };
        comments.push(comment);
        return route.fulfill({ json: { data: { addProjectComment: comment } } });
      }
      default:
        throw new Error(`Unexpected operation: ${operationName}`);
    }
  });

  await page.goto('/projects/saved-project');
  await page.getByLabel('Project status').selectOption('IN_PROGRESS');
  await page.getByRole('button', { name: 'Save status' }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not update project status. Try again.');
  await expect(page.locator('dd', { hasText: 'planned' })).toBeVisible();

  rejectStatus = false;
  await page.getByRole('button', { name: 'Save status' }).click();
  await expect(page.locator('dd', { hasText: 'in progress' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  const draft = page.getByRole('textbox', { name: 'Comment', exact: true });
  await draft.fill(body);
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not add your comment. Try again.');
  await expect(draft).toHaveValue(body);

  rejectComment = false;
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await expect(draft).toHaveValue('');
});
