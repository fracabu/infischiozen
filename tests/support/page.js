/**
 * @module tests/support/page
 * Page helpers for the Playwright tests: the Italian UI text and the wait for
 * a loaded page.
 */
import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'

/**
 * UI text of the app, so the tests find controls by their visible name.
 */
export const it = JSON.parse(readFileSync(new URL('../../src/locales/it.json', import.meta.url), 'utf8'))

/**
 * Open a page and wait until its data has loaded.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
export async function openPage(page, path) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1')).toBeVisible()
}
