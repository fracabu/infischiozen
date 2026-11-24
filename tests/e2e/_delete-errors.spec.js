/**
 * A delete that the server refuses must close the confirmation and show the
 * server message. Before the fix the dialog stayed open with no message.
 *
 * Clients get a real 409 (a client with invoices). Products and drafts have no
 * 409 on the server, so the test makes their DELETE fail with page.route.
 */
import { test, expect } from '@playwright/test'
import { it } from '../support/page.js'
import { createClient, createDraft, createProduct, uniqueName } from '../support/seed.js'

const DELETE = it.common.delete
const SERVER_MESSAGE = 'Errore di prova dal server'

/**
 * Make every DELETE on a path fail with a server error.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} pattern
 */
async function failDeletes(page, pattern) {
  await page.route(pattern, (route) => (route.request().method() === 'DELETE'
    ? route.fulfill({ status: 500, json: { errore: SERVER_MESSAGE } })
    : route.continue()))
}

test('Clients: a client with invoices is not deleted and the 409 message shows', async ({ page, request }) => {
  const surname = uniqueName('ConFatture')
  const client = await createClient(request, surname)
  await createDraft(request, client)

  await page.goto('/clienti')
  const row = page.getByRole('row', { name: new RegExp(surname) })
  await row.getByRole('button', { name: DELETE }).click()
  await page.getByRole('dialog').getByRole('button', { name: DELETE }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText("non puo' essere eliminato")
  await expect(row).toBeVisible()
})

test('Clients: a client without invoices is deleted with no message', async ({ page, request }) => {
  const surname = uniqueName('SenzaFatture')
  await createClient(request, surname)

  await page.goto('/clienti')
  const row = page.getByRole('row', { name: new RegExp(surname) })
  await row.getByRole('button', { name: DELETE }).click()
  await page.getByRole('dialog').getByRole('button', { name: DELETE }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('Products: a failed delete closes the dialog and shows the message', async ({ page, request }) => {
  const name = uniqueName('Prodotto')
  await createProduct(request, name)
  await failDeletes(page, '**/api/prodotti/*')

  await page.goto('/prodotti')
  const row = page.getByRole('row', { name: new RegExp(name) })
  await row.getByRole('button', { name: DELETE }).click()
  await page.getByRole('dialog').getByRole('button', { name: DELETE }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText(SERVER_MESSAGE)
  await expect(row).toBeVisible()
})

test('Invoice detail: a failed draft delete closes the dialog and shows the message', async ({ page, request }) => {
  const client = await createClient(request, uniqueName('Bozza'))
  const draft = await createDraft(request, client)
  await failDeletes(page, '**/api/fatture/*')

  await page.goto(`/fatture/${draft.id}`)
  await page.getByRole('button', { name: it.invoiceDetail.deleteDraft }).click()
  await page.getByRole('dialog').getByRole('button', { name: DELETE }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText(SERVER_MESSAGE)
  await expect(page).toHaveURL(new RegExp(`/fatture/${draft.id}$`))
})
