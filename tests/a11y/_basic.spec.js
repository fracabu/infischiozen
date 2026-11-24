/**
 * Page structure of every screen: no axe violations, one h1, no skipped
 * heading level, a main landmark, a page language.
 */
import { test, expect } from '@playwright/test'
import { expectNoAxeViolations } from '../support/axe.js'
import { openPage } from '../support/page.js'
import { confirmSettings, createClient, createDraft, createProduct, uniqueName } from '../support/seed.js'

const STATIC_PAGES = [
  ['dashboard', '/'],
  ['clients', '/clienti'],
  ['new client', '/clienti/nuovo'],
  ['products', '/prodotti'],
  ['new product', '/prodotti/nuovo'],
  ['invoices', '/fatture'],
  ['new invoice', '/fatture/nuova'],
  ['external invoice', '/fatture/registra'],
  ['settings', '/impostazioni'],
  ['first-launch settings', '/impostazioni?benvenuto=1'],
]

/**
 * Paths of the pages that show one record, filled in beforeAll.
 */
const recordPages = {}

test.beforeAll(async ({ request }) => {
  await confirmSettings(request)
  const client = await createClient(request, uniqueName('Struttura'))
  const draft = await createDraft(request, client)
  const product = await createProduct(request, uniqueName('Struttura'))

  recordPages['client edit'] = `/clienti/${client.id}`
  recordPages['product edit'] = `/prodotti/${product.id}`
  recordPages['invoice detail'] = `/fatture/${draft.id}`
})

/**
 * Check the structure of the open page.
 *
 * @param {import('@playwright/test').Page} page
 */
async function checkStructure(page) {
  await expectNoAxeViolations(page)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('main')).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')

  const levels = await page.locator('h1, h2, h3, h4, h5, h6')
    .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName[1])))

  const skips = levels.filter((level, index) => index > 0 && level - levels[index - 1] > 1)

  expect(skips).toEqual([])
}

for (const [name, path] of STATIC_PAGES) {
  test(`${name} page has a sound structure`, async ({ page }) => {
    await openPage(page, path)
    await checkStructure(page)
  })
}

// With no clients the invoice forms show a notice with a link to a new
// client. The shared database has clients, so the list is forced empty.
for (const [name, path] of [['new invoice', '/fatture/nuova'], ['external invoice', '/fatture/registra']]) {
  test(`${name} page with no clients has a sound structure`, async ({ page }) => {
    await page.route('**/api/clienti', (route) => route.fulfill({ json: [] }))
    await openPage(page, path)
    await expect(page.locator('p[data-part="notice"] a')).toBeVisible()
    await checkStructure(page)
  })
}

for (const name of ['client edit', 'product edit', 'invoice detail']) {
  test(`${name} page has a sound structure`, async ({ page }) => {
    await openPage(page, recordPages[name])
    await checkStructure(page)
  })
}
