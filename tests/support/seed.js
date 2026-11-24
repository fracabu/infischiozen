/**
 * @module tests/support/seed
 * Test data for the Playwright tests, created through the API of the test
 * instance. Each name is unique, because the tests run in parallel on one
 * database.
 */
import { expect } from '@playwright/test'

/**
 * @param {string} label - first part of the name
 * @returns {string} the label plus a unique suffix
 */
export const uniqueName = (label) => `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/**
 * Send one API call and check that it worked.
 *
 * @param {Promise<import('@playwright/test').APIResponse>} call
 * @returns {Promise<object>} the answer body
 */
async function okJson(call) {
  const response = await call

  expect(response.ok()).toBe(true)

  return response.json()
}

/**
 * Create a private client. No tax code: it has a unique index.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} surname
 * @returns {Promise<object>} the saved client
 */
export function createClient(request, surname) {
  return okJson(request.post('/api/clienti', { data: { tipo: 'privato', nome: 'Prova', cognome: surname } }))
}

/**
 * Create a draft invoice for a client.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {object} client
 * @returns {Promise<object>} the saved draft
 */
export function createDraft(request, client) {
  return okJson(request.post('/api/fatture', {
    data: { stato: 'bozza', data: '2026-01-10', clienteId: client.id, righe: [] },
  }))
}

/**
 * Create a product.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} name
 * @returns {Promise<object>} the saved product
 */
export function createProduct(request, name) {
  return okJson(request.post('/api/prodotti', { data: { nome: name, prezzo: 10 } }))
}

/**
 * Confirm the current settings, so the dashboard does not redirect to the
 * first-launch settings page.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @returns {Promise<object>} the saved settings
 */
export async function confirmSettings(request) {
  const settings = await okJson(request.get('/api/impostazioni'))

  return okJson(request.put('/api/impostazioni', { data: settings }))
}
