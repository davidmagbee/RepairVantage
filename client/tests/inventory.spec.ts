import { checkpointCoverage, expect, test } from './fixtures';

test('records parts and project quantities, then shows the resulting stock shortfall', async ({ page }) => {
  const owner = { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true };
  const project = { __typename: 'Project', id: 'porch', name: 'Porch repairs', description: null, archivedAt: null,
    status: 'PLANNED', priority: 'MEDIUM', canManage: true, comments: [] };
  let item: { id: string; kind: string; name: string; onHand: number } | undefined;
  let quantity = 0;
  let failInventory = false;
  let failWrite = true;
  let failRequirement = true;
  let failRequirementsRead = true;
  let archivedAt: string | null = null;
  const inventory = () => item ? [{ __typename: 'InventoryItem', ...item, required: quantity, shortfall: Math.max(quantity - item.onHand, 0) }] : [];
  const requirements = () => item && quantity ? [{ __typename: 'ProjectRequirement', itemId: item.id, name: item.name, kind: item.kind, quantity }] : [];
  await page.route('**/api/auth/get-session', route => route.fulfill({
    json: { user: owner, session: { id: 'inventory-session', userId: owner.id } },
  }));
  await page.route('**/graphql', route => {
    const { operationName, variables } = route.request().postDataJSON();
    const data = (value: object) => route.fulfill({ json: { data: value } });
    switch (operationName) {
      case 'GetInventory':
        if (failInventory) {
          failInventory = false;
          return route.fulfill({ json: { errors: [{ message: 'Inventory unavailable' }] } });
        }
        return data({ inventory: inventory() });
      case 'CreateInventoryItem':
        if (failWrite) {
          failWrite = false;
          return route.fulfill({ json: { errors: [{ message: 'Save unavailable' }] } });
        }
        item = { id: 'screws', kind: variables.kind, name: variables.name, onHand: variables.onHand };
        return data({ createInventoryItem: inventory()[0] });
      case 'UpdateInventoryItem':
        item = { id: variables.id, kind: variables.kind, name: variables.name, onHand: variables.onHand };
        return data({ updateInventoryItem: inventory()[0] });
      case 'GetProjectDetails': return data({ project: { ...project, archivedAt } });
      case 'ProjectSharing': return data({ project: { showcase: null }, projectMembers: [], projectInvites: [] });
      case 'GetProjectRequirements':
        if (failRequirementsRead) {
          failRequirementsRead = false;
          return route.fulfill({ json: { errors: [{ message: 'Requirements unavailable' }] } });
        }
        return data({ projectRequirements: requirements() });
      case 'SetProjectRequirement':
        if (failRequirement) {
          failRequirement = false;
          return route.fulfill({ json: { errors: [{ message: 'Requirement unavailable' }] } });
        }
        expect(variables.projectId).toBe(project.id);
        expect(variables.itemId).toBe('screws');
        quantity = variables.quantity;
        return data({ setProjectRequirement: requirements()[0] });
      case 'RemoveProjectRequirement':
        quantity = 0;
        return data({ removeProjectRequirement: true });
      default: throw new Error(`Unexpected inventory test operation: ${operationName}`);
    }
  });

  await page.goto('/projects/porch');
  await page.getByRole('button', { name: 'Show requirements' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not load inventory requirements');
  await page.getByRole('button', { name: 'Hide requirements' }).click();
  await page.getByRole('button', { name: 'Show requirements' }).click();
  await expect(page.getByText('Add parts or tools in', { exact: false })).toBeVisible();
  failInventory = true;
  await page.getByRole('region', { name: 'Inventory requirements' }).getByRole('link', { name: 'Inventory' }).click();
  await page.getByRole('button', { name: 'Retry inventory' }).click();
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Item name').fill('Deck screws');
  await page.getByLabel('On hand').fill('2');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save the inventory item');
  await expect(page.getByLabel('On hand')).toHaveValue('2');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByRole('row', { name: /Deck screws/ })).toContainText('2');

  await checkpointCoverage(page);
  await page.goto('/projects/porch');
  await page.getByRole('button', { name: 'Show requirements' }).click();
  await page.getByLabel('Inventory item').selectOption('PART:screws');
  await page.getByLabel('Required quantity').fill('4');
  await page.getByRole('button', { name: 'Save requirement' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save the requirement');
  await page.getByRole('button', { name: 'Save requirement' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Deck screws' })).toContainText('4');
  await page.getByRole('link', { name: 'Inventory', exact: true }).click();
  const row = page.getByRole('row', { name: /Deck screws/ });
  await expect(row.getByRole('cell').nth(4)).toHaveText('2');
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('On hand').fill('4');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(row.getByRole('cell').nth(4)).toHaveText('0');

  archivedAt = '2026-11-06T15:00:00.000Z';
  await checkpointCoverage(page);
  await page.goto('/projects/porch');
  await page.getByRole('button', { name: 'Show requirements' }).click();
  await expect(page.getByText('Deck screws · 4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save requirement' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove Deck screws' })).toHaveCount(0);

  archivedAt = null;
  await checkpointCoverage(page);
  await page.reload();
  await page.getByRole('button', { name: 'Show requirements' }).click();
  await page.getByRole('button', { name: 'Remove Deck screws' }).click();
  await expect(page.getByText('No inventory requirements yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Hide requirements' }).click();
  await expect(page.getByRole('region', { name: 'Inventory requirements' })).toHaveCount(0);
});
