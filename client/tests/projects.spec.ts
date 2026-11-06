import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const owner = { id: 'owner', name: 'Repair owner', email: 'owner@example.test', emailVerified: true };
const project = {
  __typename: 'Project',
  id: 'project-123',
  name: 'Replace a broken hinge',
  description: 'Measure and replace the upper hinge.',
  status: 'PLANNED',
  priority: 'MEDIUM',
  canManage: true,
};
const session = { id: 'test-session', userId: owner.id, expiresAt: '2099-01-01T00:00:00.000Z' };

async function mockAuth(page: Page, initiallySignedIn = false) {
  let signedIn = initiallySignedIn;
  await page.route('**/api/auth/providers', (route) => route.fulfill({ json: { google: false, emailOtp: true } }));
  await page.route('**/api/auth/get-session', (route) =>
    route.fulfill({ json: signedIn ? { user: owner, session } : null }),
  );
  await page.route('**/api/auth/email-otp/send-verification-otp', (route) =>
    route.fulfill({ json: { success: true } }),
  );
  await page.route('**/api/auth/sign-in/email-otp', (route) => {
    signedIn = route.request().postDataJSON().otp === '135790';
    return route.fulfill(signedIn
      ? { json: { user: owner, session } }
      : { status: 400, json: { code: 'INVALID_OTP', message: 'Invalid code' } });
  });
  await page.route('**/api/auth/sign-out', (route) => {
    signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
}

test('the landing page keeps workspace actions available to a signed-in user', async ({ page }) => {
  await mockAuth(page, true);
  await page.route('**/graphql', (route) =>
    route.fulfill({ json: { data: { projects: [], sharedProjects: [] } } }),
  );
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'RepairVantage', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Create account', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Start a project', exact: true }).click();
  await expect(page).toHaveURL('/projects/new');
});

test('the landing page waits for session lookup before showing guest actions', async ({ page }) => {
  let resolveSession!: () => void;
  const sessionLookup = new Promise<void>((resolve) => { resolveSession = resolve; });
  await page.route('**/api/auth/get-session', async (route) => {
    await sessionLookup;
    await route.fulfill({ json: null });
  });

  try {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Keep repair projects organized/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Create account', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Start a project', exact: true })).toHaveCount(0);
  } finally {
    resolveSession();
  }

  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Create account', exact: true })).toHaveAttribute('href', '/register');
  await expect(page.getByRole('link', { name: 'Start a project', exact: true })).toHaveAttribute('href', '/register');
});

test('a signed-out visitor is directed to sign in before viewing projects', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/projects');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('a verified account can create a project and reopen it after a reload', async ({ page }) => {
  let persistedProject: typeof project | undefined;
  await mockAuth(page);
  // This browser check isolates UI behavior at the HTTP boundary. Server tests exercise persistence.
  await page.route('**/graphql', async (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    switch (operationName) {
      case 'GetProjects':
        return route.fulfill({ json: { data: { projects: persistedProject ? [persistedProject] : [], sharedProjects: [] } } });
      case 'CreateProject':
        persistedProject = { ...project, name: variables.input.name, description: variables.input.description };
        return route.fulfill({ json: { data: { createProject: persistedProject } } });
      case 'GetProjectDetails':
        return route.fulfill({
          json: { data: { project: persistedProject && { ...persistedProject, comments: [] } } },
        });
      case 'ProjectSharing':
        return route.fulfill({ json: { data: { project: { showcase: null }, projectInvites: [], projectMembers: [] } } });
      default:
        throw new Error(`Unexpected project operation: ${operationName}`);
    }
  });

  await page.goto('/register');
  await page.getByLabel('Email address').fill(owner.email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('One-time code').fill('135790');
  await page.getByRole('button', { name: 'Verify code' }).click();

  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  await page.getByRole('link', { name: 'Create project' }).click();
  await page.getByLabel('Project name').fill(project.name);
  await page.getByLabel('Description (optional)').fill(project.description);
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
  await expect(page).toHaveURL(`/projects/${project.id}`);
  await page.reload();
  await expect(page.getByText(project.description)).toBeVisible();
  await page.getByRole('link', { name: 'Back to projects' }).click();
  await expect(page.getByRole('link', { name: project.name })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
