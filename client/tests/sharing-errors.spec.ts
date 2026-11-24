import type { Page } from '@playwright/test';
import { checkpointCoverage, expect, test } from './fixtures';

const owner = { id: 'owner', name: 'Repair owner', email: 'owner@example.test', emailVerified: true };
const project = {
  __typename: 'Project',
  id: 'project-123',
  name: 'Replace a broken hinge',
  description: 'Fit a reinforced replacement.',
  status: 'PLANNED',
  priority: 'MEDIUM',
  canManage: true,
  comments: [],
};

type GraphQLRequest = { operationName: string; variables: Record<string, unknown> };
type GraphQLReply = { data: Record<string, unknown> } | { errors: { message: string }[] };

function sharingData(showcase: unknown = null, projectInvites: unknown[] = [], projectMembers: unknown[] = []): GraphQLReply {
  return { data: { project: { __typename: 'Project', showcase }, projectInvites, projectMembers } };
}

async function openOwnerProject(page: Page, respond: (request: GraphQLRequest) => GraphQLReply) {
  await page.route('**/api/auth/get-session', route =>
    route.fulfill({ json: { user: owner, session: { id: 'owner-session', userId: owner.id } } }),
  );
  await page.route('**/graphql', route => {
    const request = route.request().postDataJSON() as GraphQLRequest;
    const json = request.operationName === 'GetProjectDetails'
      ? { data: { project } }
      : respond(request);
    return route.fulfill({ json });
  });

  await page.goto(`/projects/${project.id}`);
  return page.getByRole('region', { name: 'Project sharing' });
}

test('an owner can select an invitation link when clipboard access fails and then revoke it', async ({ page }) => {
  const recipient = 'recipient@example.test';
  const token = 'a'.repeat(43);
  const invite = { id: 'invite-123', email: recipient, expiresAt: '2099-01-01T00:00:00.000Z' };
  const olderInvite = { ...invite, id: 'invite-456', email: 'older@example.test' };
  let pending = [olderInvite];
  let tokenAvailable = false;
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => { throw new DOMException('Clipboard blocked', 'NotAllowedError'); } },
    });
  });
  const sharing = await openOwnerProject(page, ({ operationName, variables }) => {
    switch (operationName) {
      case 'ProjectSharing':
        return sharingData(null, pending);
      case 'InviteToProject':
        expect(variables).toEqual({ projectId: project.id, email: recipient });
        if (!tokenAvailable) return { data: { inviteToProject: { token: '' } } };
        pending.push(invite);
        return { data: { inviteToProject: { token } } };
      case 'RevokeProjectInvite':
        expect(variables.projectId).toBe(project.id);
        pending = pending.filter(({ id }) => id !== variables.id);
        return { data: { revokeProjectInvite: true } };
      default:
        throw new Error(`Unexpected sharing operation: ${operationName}`);
    }
  });

  await sharing.getByLabel('Email address').fill('Recipient@Example.Test');
  const create = sharing.getByRole('button', { name: 'Create invite link' });
  const field = sharing.getByRole('textbox', { name: `Invitation for ${recipient}` });
  await create.click();
  await expect(sharing.getByRole('alert')).toHaveText(/Couldn’t create the invitation/);
  await expect(field).toHaveCount(0);

  tokenAvailable = true;
  await create.click();
  const link = new URL(`/invite#token=${token}`, page.url()).href;
  await expect(field).toHaveValue(link);

  await sharing.getByRole('button', { name: 'Copy link' }).click();
  await expect(sharing.getByText('Select and copy the link from the field.')).toBeVisible();
  await expect(field).not.toBeEditable();
  await field.focus();
  const selection = await field.evaluate((input: HTMLInputElement) =>
    input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0),
  );
  expect(selection).toBe(link);

  const revokeOlder = sharing.getByRole('button', { name: `Revoke invitation for ${olderInvite.email}` });
  await revokeOlder.click();
  await expect(revokeOlder).toHaveCount(0);
  await expect(field).toHaveValue(link);

  await sharing.getByRole('button', { name: `Revoke invitation for ${recipient}` }).click();
  await expect(sharing.getByText('Invitation revoked.')).toBeVisible();
  await expect(sharing.getByRole('list', { name: 'Pending invitations' })).toHaveCount(0);
  await expect(field).toHaveCount(0);
});

test('an owner can recover a failed Showcase edit and unpublish the saved link', async ({ page, context }) => {
  const initial = {
    __typename: 'ShowcaseProject',
    slug: 'hinge-repair',
    title: 'Hinge repair',
    summary: 'The hinge was inspected.',
    status: project.status,
  };
  const updated = { title: 'Hinge replaced', summary: 'The replacement passed inspection.' };
  let publication: typeof initial | null = initial;
  let publishAttempts = 0;
  const sharing = await openOwnerProject(page, ({ operationName, variables }) => {
    switch (operationName) {
      case 'ProjectSharing':
        return sharingData(publication);
      case 'PublishProject':
        expect(variables).toEqual({ projectId: project.id, ...updated });
        publishAttempts += 1;
        if (publishAttempts === 1) return { errors: [{ message: 'Internal publishing detail' }] };
        publication = { ...initial, ...updated };
        return { data: { publishProject: { slug: initial.slug } } };
      case 'UnpublishProject':
        expect(variables).toEqual({ projectId: project.id });
        publication = null;
        return { data: { unpublishProject: true } };
      default:
        throw new Error(`Unexpected sharing operation: ${operationName}`);
    }
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const linkField = sharing.getByRole('textbox', { name: 'Public Showcase link' });
  const link = new URL(`/showcase/${initial.slug}`, page.url()).href;
  await expect(linkField).toHaveValue(link);
  await sharing.getByRole('button', { name: 'Copy link' }).click();
  await expect(sharing.getByText('Link copied.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);

  const title = sharing.getByLabel('Public title');
  const summary = sharing.getByLabel('Public summary');
  const edit = sharing.getByRole('button', { name: 'Edit Showcase' });
  await edit.click();
  await title.fill('Discarded edit');
  await sharing.getByRole('button', { name: 'Cancel' }).click();
  expect(publishAttempts).toBe(0);

  await edit.click();
  await expect(title).toHaveValue(initial.title);
  await expect(summary).toHaveValue(initial.summary);
  await title.fill(` ${updated.title} `);
  await summary.fill(updated.summary);
  const save = sharing.getByRole('button', { name: 'Save Showcase changes' });
  await save.click();

  await expect(sharing.getByRole('alert')).toHaveText('Couldn’t publish the showcase. Check the title and summary.');
  await expect(page.getByText('Internal publishing detail')).toHaveCount(0);
  await expect(title).toHaveValue(` ${updated.title} `);
  await expect(summary).toHaveValue(updated.summary);
  await expect(linkField).toHaveValue(link);
  await save.click();

  await expect(sharing.getByText('Showcase published.')).toBeVisible();
  await edit.click();
  await expect(title).toHaveValue(updated.title);
  await expect(summary).toHaveValue(updated.summary);
  expect(publishAttempts).toBe(2);

  await sharing.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await expect(sharing.getByText('Showcase unpublished.')).toBeVisible();
  await expect(linkField).toHaveCount(0);
  await expect(sharing.getByRole('button', { name: 'Publish Showcase', exact: true })).toBeVisible();
});

test('an owner can reload and recover unavailable sharing settings', async ({ page }) => {
  let unavailable = true;
  const sharing = await openOwnerProject(page, ({ operationName }) => {
    expect(operationName).toBe('ProjectSharing');
    return unavailable ? { errors: [{ message: 'Internal sharing detail' }] } : sharingData();
  });

  await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Sharing settings are unavailable. Refresh to try again.');
  await expect(page.getByText('Internal sharing detail')).toHaveCount(0);
  await expect(sharing).toHaveCount(0);

  unavailable = false;
  await checkpointCoverage(page);
  await page.reload();
  await expect(sharing.getByRole('button', { name: 'Create invite link' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a Showcase published before a failed settings refresh remains available after reload', async ({ page }) => {
  const publication = {
    __typename: 'ShowcaseProject', slug: 'hinge-repair', title: 'Hinge repair',
    summary: 'The hinge passed inspection.', status: project.status,
  };
  let published = false;
  let settingsAvailable = true;
  const sharing = await openOwnerProject(page, ({ operationName, variables }) => {
    switch (operationName) {
      case 'ProjectSharing':
        return settingsAvailable ? sharingData(published ? publication : null) : { errors: [{ message: 'Refresh failed' }] };
      case 'PublishProject':
        expect(variables).toEqual({ projectId: project.id, title: publication.title, summary: publication.summary });
        published = true;
        settingsAvailable = false;
        return { data: { publishProject: { slug: publication.slug } } };
      default:
        throw new Error(`Unexpected sharing operation: ${operationName}`);
    }
  });

  await sharing.getByLabel('Public title').fill(publication.title);
  await sharing.getByLabel('Public summary').fill(publication.summary);
  await sharing.getByRole('button', { name: 'Publish Showcase' }).click();
  await expect(page.getByText(/Refresh (?:to try again|this page to see the updated list)/)).toBeVisible();
  await expect(page.getByText(/Couldn’t publish the showcase/)).toHaveCount(0);

  settingsAvailable = true;
  await checkpointCoverage(page);
  await page.reload();
  await expect(sharing.getByRole('textbox', { name: 'Public Showcase link' })).toHaveValue(
    new URL(`/showcase/${publication.slug}`, page.url()).href,
  );
});

test('members without display names remain identifiable and removable by email', async ({ page }) => {
  const named = { user: { id: 'member-named', name: 'Repair member', email: 'named@example.test' } };
  const unnamed = { user: { id: 'member-unnamed', name: '', email: 'unnamed@example.test' } };
  let members = [named, unnamed];
  const sharing = await openOwnerProject(page, ({ operationName, variables }) => {
    switch (operationName) {
      case 'ProjectSharing':
        return sharingData(null, [], members);
      case 'RemoveProjectMember':
        expect(variables).toEqual({ projectId: project.id, userId: unnamed.user.id });
        members = [named];
        return { data: { removeProjectMember: true } };
      default:
        throw new Error(`Unexpected sharing operation: ${operationName}`);
    }
  });

  const list = sharing.getByRole('list', { name: 'Members' });
  await expect(list.getByText(`${named.user.name} · ${named.user.email}`, { exact: true })).toBeVisible();
  await expect(list.getByText(unnamed.user.email, { exact: true })).toBeVisible();
  await list.getByRole('button', { name: `Remove ${unnamed.user.email}` }).click();
  await expect(list.getByText(unnamed.user.email, { exact: true })).toHaveCount(0);
  await expect(list.getByText(named.user.name, { exact: false })).toBeVisible();
});
