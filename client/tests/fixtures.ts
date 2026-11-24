import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { test as base, type Page } from '@playwright/test';

export { expect } from '@playwright/test';

const activeCollectors = new WeakMap<Page, () => Promise<void>>();

/** Start before navigation and flush before closing the tab, including auxiliary browser sessions. */
export async function coverPage(page: Page) {
  const directory = process.env.REPAIRVANTAGE_BROWSER_COVERAGE;
  if (!directory) return async () => {};

  const save = async () => {
    const entries = (await page.coverage.stopJSCoverage())
      .filter(({ url }) => url.startsWith('http://localhost:5173/src/'));
    await writeFile(join(directory, `${randomUUID()}.json`), JSON.stringify(entries));
  };
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  activeCollectors.set(page, save);
  return async () => {
    activeCollectors.delete(page);
    await save();
  };
}

/** Chromium can discard old document counters on a hard navigation. Save them while the document is live. */
export async function checkpointCoverage(page: Page) {
  const save = activeCollectors.get(page);
  if (!save) return;
  await save();
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
}

export const test = base.extend({
  page: async ({ page }, runPage) => {
    const save = await coverPage(page);
    try {
      await runPage(page);
    } finally {
      await save();
    }
  },
});
