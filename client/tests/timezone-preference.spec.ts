import type { Page } from '@playwright/test';
import { checkpointCoverage, expect, test } from './fixtures';

test.use({ locale: 'en-US' });

/** Keep the stored instant constant so every assertion observes presentation, not a schedule mutation. */
async function showProject(page: Page) {
  const project = {
    __typename: 'Project', id: 'timezone-project', name: 'Local clock review', description: null,
    status: 'PLANNED', priority: 'MEDIUM', canManage: false, archivedAt: null, comments: [],
    startDate: '2026-11-14T15:00:17.125Z', endDate: null,
  };
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: {
    user: { id: 'timezone-reader', name: 'Reader', email: 'reader@example.test', emailVerified: true },
    session: { id: 'timezone-session', userId: 'timezone-reader' },
  } }));
  await page.route('**/graphql', route => {
    expect(route.request().postDataJSON().operationName).toBe('GetProjectDetails');
    return route.fulfill({ json: { data: { project } } });
  });
  await page.goto('/projects/timezone-project');
  await expect(page.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
  return page.getByRole('region', { name: 'Project dates' }).locator('time').first();
}

test.describe('Pacific device preference', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('detects the device zone, persists a different display preference, and resets to the device zone', async ({ page }) => {
    const savedTime = await showProject(page);
    const control = page.getByRole('combobox', { name: 'Display time zone' });
    await expect(control).toHaveValue('America/Los_Angeles');
    await expect(savedTime).toContainText('7:00 AM PST');
    await expect(savedTime).toHaveAttribute('datetime', '2026-11-14T15:00:17.125Z');

    await control.selectOption('America/New_York');
    await expect(savedTime).toContainText('10:00 AM EST');
    await checkpointCoverage(page);
    await page.reload();
    await expect(control).toHaveValue('America/New_York');
    await expect(savedTime).toContainText('10:00 AM EST');
    await page.getByRole('button', { name: 'Use device time zone' }).click();
    await expect(control).toHaveValue('America/Los_Angeles');
    await expect(savedTime).toContainText('7:00 AM PST');
    await expect(savedTime).toHaveAttribute('datetime', '2026-11-14T15:00:17.125Z');
  });

  test('an invalid stored zone falls back to valid device detection and cannot corrupt dates', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('repairvantage:time-zone', 'Not/AZone'));
    const savedTime = await showProject(page);
    const control = page.getByRole('combobox', { name: 'Display time zone' });
    await expect(control).toHaveValue('America/Los_Angeles');
    await expect(savedTime).toContainText('7:00 AM PST');
    // A malformed browser-control value must not become a persistent timezone preference.
    await control.evaluate(select => {
      const invalid = document.createElement('option');
      invalid.value = 'Not/AZone'; invalid.textContent = 'Invalid zone'; select.append(invalid);
    });
    await control.selectOption('Not/AZone');
    await expect(control).toHaveValue('America/Los_Angeles');
    await expect(savedTime).toContainText('7:00 AM PST');
  });

  test('unavailable storage and device detection use Eastern Time while session changes still work', async ({ page }) => {
    await page.addInitScript(() => {
      const getItem = Storage.prototype.getItem;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (key === 'repairvantage:time-zone') throw new DOMException('Storage unavailable', 'SecurityError');
        return getItem.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        if (key === 'repairvantage:time-zone') throw new DOMException('Storage unavailable', 'SecurityError');
        setItem.call(this, key, value);
      };
      // Remove only device detection; explicit-zone formatting must remain available to render dates.
      const Original = Intl.DateTimeFormat;
      const noDetection = function (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) {
        if (!args.length) throw new Error('Device timezone unavailable');
        return new Original(...args);
      };
      Object.setPrototypeOf(noDetection, Original);
      noDetection.prototype = Original.prototype;
      Intl.DateTimeFormat = noDetection as typeof Intl.DateTimeFormat;
    });
    const savedTime = await showProject(page);
    const control = page.getByRole('combobox', { name: 'Display time zone' });
    await expect(control).toHaveValue('America/New_York');
    await expect(savedTime).toContainText('10:00 AM EST');
    await control.selectOption('America/Los_Angeles');
    await expect(savedTime).toContainText('7:00 AM PST');
    await page.getByRole('button', { name: 'Use device time zone' }).click();
    await expect(control).toHaveValue('America/New_York');
    await expect(savedTime).toContainText('10:00 AM EST');
    await checkpointCoverage(page);
    await page.reload();
    await expect(control).toHaveValue('America/New_York');
  });
});

test.describe('Eastern device preference', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('detects Eastern Time and offers saved custom zones when full zone enumeration is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('repairvantage:time-zone', 'Europe/London');
      Object.defineProperty(Intl, 'supportedValuesOf', { value: undefined, configurable: true });
    });
    const savedTime = await showProject(page);
    const control = page.getByRole('combobox', { name: 'Display time zone' });
    await expect(control).toHaveValue('Europe/London');
    await expect(savedTime).toContainText('3:00 PM GMT');
    await expect(control.getByRole('option', { name: 'Europe/London', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Use device time zone' }).click();
    await expect(control).toHaveValue('America/New_York');
    await expect(savedTime).toContainText('10:00 AM EST');
  });
});
