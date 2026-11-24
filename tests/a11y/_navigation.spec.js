/**
 * Keyboard use: the sidebar comes first in the tab order, each focused
 * control shows a visible outline, Enter follows a link, and the confirmation
 * dialog takes focus and gives it back when it closes.
 */
import { test, expect } from '@playwright/test'
import { it, openPage } from '../support/page.js'
import { createClient, uniqueName } from '../support/seed.js'

const NAV_LABELS = [it.nav.dashboard, it.nav.clients, it.nav.products, it.nav.invoices, it.nav.settings]

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ name: string, outline: string }>} the focused element
 */
const focused = (page) => page.locator(':focus').evaluate((element) => {
  const style = element.ownerDocument.defaultView.getComputedStyle(element)

  return {
    name: element.textContent.trim(),
    outline: style.outlineStyle === 'none' ? '' : style.outlineWidth,
  }
})

test('the sidebar links come first and show a focus outline', async ({ page }) => {
  await openPage(page, '/clienti')

  for (const label of NAV_LABELS) {
    await page.keyboard.press('Tab')
    const element = await focused(page)

    expect(element.name).toBe(label)
    expect(element.outline).not.toBe('')
    expect(element.outline).not.toBe('0px')
  }
})

test('the active sidebar entry is marked as the current page', async ({ page }) => {
  await openPage(page, '/clienti')
  const navigation = page.getByRole('navigation', { name: it.app.mainNavigation })

  await expect(navigation.getByRole('link', { name: it.nav.clients })).toHaveAttribute('aria-current', 'page')
  await expect(navigation.locator('[aria-current]')).toHaveCount(1)
})

test('Enter on a sidebar link opens its page', async ({ page }) => {
  await openPage(page, '/clienti')
  await page.getByRole('link', { name: it.nav.products }).focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/prodotti$/)
  await expect(page.getByRole('heading', { level: 1, name: it.products.title })).toBeVisible()
})

test('the confirmation dialog takes focus and gives it back on Escape', async ({ page, request }) => {
  const surname = uniqueName('Tastiera')
  await createClient(request, surname)
  await openPage(page, '/clienti')

  const trigger = page.getByRole('row', { name: new RegExp(surname) }).getByRole('button', { name: it.common.delete })
  await trigger.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: it.clients.deleteTitle })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(':focus')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
