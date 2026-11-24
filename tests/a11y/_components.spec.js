/**
 * Shared components, each checked with axe on its own: the sidebar, the
 * confirmation dialog, the invoice lines and the invoice totals.
 */
import { test, expect } from '@playwright/test'
import { expectNoAxeViolations } from '../support/axe.js'
import { it, openPage } from '../support/page.js'
import { createClient, uniqueName } from '../support/seed.js'

test('AppSidebar has no axe violations', async ({ page }) => {
  await openPage(page, '/clienti')
  await expectNoAxeViolations(page, 'aside[data-part="sidebar"]')
})

test('ConfirmDialog is a named modal dialog with no axe violations', async ({ page, request }) => {
  const surname = uniqueName('Dialogo')
  await createClient(request, surname)
  await openPage(page, '/clienti')
  await page.getByRole('row', { name: new RegExp(surname) }).getByRole('button', { name: it.common.delete }).click()

  const dialog = page.getByRole('dialog', { name: it.clients.deleteTitle })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true)
  await expectNoAxeViolations(page, 'dialog[data-part="confirm-dialog"]')
})

test('InvoiceLines and InvoiceTotals have no axe violations', async ({ page, request }) => {
  const client = await createClient(request, uniqueName('Righe'))
  await openPage(page, '/fatture/nuova')
  await page.locator('#invoice-client').selectOption(String(client.id))
  await page.getByRole('button', { name: it.invoiceForm.next }).click()

  await expect(page.locator('table[data-part="invoice-lines"]')).toBeVisible()
  await expectNoAxeViolations(page, 'table[data-part="invoice-lines"]')
  await expectNoAxeViolations(page, 'dl[data-part="invoice-totals"]')
})
