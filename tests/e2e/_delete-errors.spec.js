/**
 * A delete that the server refuses must close the confirmation and show the
 * server message. Before the fix the dialog stayed open with no message.
 *
 * Clients get a real 409 (a client with invoices). Products and drafts have no
 * 409 on the server, so the test makes their DELETE fail with page.route.
 */
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const it = JSON.parse(readFileSync(new URL('../../src/locales/it.json', import.meta.url), 'utf8'))
const DELETE = it.common.delete
const SERVER_MESSAGE = 'Errore di prova dal server'

/**
 * @param {string} label - part of the name, so parallel tests do not collide
 * @returns {string}
 */
const uniqueName = (label) => `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/**
 * Create a private client through the API. No tax code: it has a unique
 * index, and the tests run in parallel.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} surname
 * @returns {Promise<object>} the saved client
 */
async function createClient(request, surname) {
  const response = await request.post('/api/clienti', {
    data: { tipo: 'privato', nome: 'Prova', cognome: surname },
  })

  expect(response.ok()).toBe(true)

  return response.json()
}

/**
 * Create a draft invoice for a client through the API.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {object} client
 * @returns {Promise<object>} the saved draft
 */
async function createDraft(request, client) {
  const response = await request.post('/api/fatture', {
    data: { stato: 'bozza', data: '2026-01-10', clienteId: client.id, righe: [] },
  })

  expect(response.ok()).toBe(true)

  return response.json()
}

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
  const response = await request.post('/api/prodotti', { data: { nome: name, prezzo: 10 } })
  expect(response.ok()).toBe(true)
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
