import type { Page } from '@playwright/test';
import { checkpointCoverage, expect, test } from './fixtures';

const member = { id: 'reviewer', name: 'Reviewer', email: 'reviewer@example.test', emailVerified: true };
const project = {
  __typename: 'Project',
  id: 'archive-project',
  name: 'Restore the porch',
  description: 'Repair the steps.',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  comments: [{
    __typename: 'ProjectComment',
    id: 'comment',
    body: 'Steps are measured.',
    createdAt: '2026-11-05T14:00:00.000Z',
    author: { __typename: 'CommentAuthor', name: 'Reviewer' },
  }],
};

async function openProject(page: Page, canManage: boolean, startArchived = false) {
  let archivedAt = startArchived ? '2026-11-05T15:00:00.000Z' : null;
  let rejectArchive = false;
  await page.route('**/api/auth/get-session', route => route.fulfill({
    json: { user: member, session: { id: 'archive-session', userId: member.id } },
  }));
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    switch (operationName) {
      case 'GetProjectDetails':
        return route.fulfill({ json: { data: { project: { ...project, archivedAt, canManage } } } });
      case 'GetProjects':
        return route.fulfill({ json: { data: { projects: [{ ...project, archivedAt, canManage }], sharedProjects: [] } } });
      case 'ProjectSharing':
        return route.fulfill({ json: { data: {
          project: { showcase: { __typename: 'ShowcaseProject', slug: 'published-archive', title: 'Porch repairs', summary: 'A public summary', status: 'IN_PROGRESS' } },
          projectInvites: [{ id: 'pending-invite', email: 'pending@example.test', expiresAt: '2099-01-01T00:00:00.000Z' }],
          projectMembers: [{ user: member }],
        } } });
      case 'GetProjectTasks':
        return route.fulfill({ json: { data: { tasks: [] } } });
      case 'ArchiveProject':
      case 'RestoreProject': {
        expect(variables.id).toBe(project.id);
        if (rejectArchive) {
          rejectArchive = false;
          return route.fulfill({ json: { errors: [{ message: 'Archive write failed' }] } });
        }
        const archive = operationName === 'ArchiveProject';
        archivedAt = archive ? '2026-11-05T15:00:00.000Z' : null;
        return route.fulfill({ json: { data: {
          [archive ? 'archiveProject' : 'restoreProject']: { __typename: 'Project', id: project.id, archivedAt },
        } } });
      }
      default:
        throw new Error(`Unexpected archive test operation: ${operationName}`);
    }
  });
  await page.goto(`/projects/${project.id}`);
  return { rejectNext: () => { rejectArchive = true; } };
}

test('an owner can archive and restore without losing existing sharing controls', async ({ page }) => {
  const { rejectNext } = await openProject(page, true);
  rejectNext();
  await page.getByRole('button', { name: 'Archive project' }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not archive the project. Try again.');
  await expect(page.getByRole('button', { name: 'Edit details' })).toBeVisible();
  await page.getByRole('button', { name: 'Archive project' }).click();
  await expect(page.getByText('This project is archived and read-only.')).toBeVisible();
  await expect(page.locator('dd', { hasText: /^in progress$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit details' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save priority' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete project permanently' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Post comment' })).toHaveCount(0);
  await expect(page.getByText('Steps are measured.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create invite link' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit Showcase' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revoke invitation for pending@example.test' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove reviewer@example.test' })).toBeVisible();

  await page.getByRole('link', { name: 'Back to projects' }).click();
  const card = page.getByRole('listitem').filter({ hasText: project.name });
  await expect(card.getByText('Archived', { exact: true })).toBeVisible();
  await card.getByRole('link', { name: project.name }).click();
  await checkpointCoverage(page);
  await page.reload();
  await page.getByRole('button', { name: 'Restore project' }).click();
  await expect(page.getByRole('button', { name: 'Edit details' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post comment' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create invite link' })).toBeVisible();
});

test('a member can read an archived project and its comments without editing it', async ({ page }) => {
  await openProject(page, false, true);
  await expect(page.getByText('This project is archived and read-only.')).toBeVisible();
  await expect(page.getByText('Steps are measured.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post comment' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restore project' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete project permanently' })).toHaveCount(0);
});
