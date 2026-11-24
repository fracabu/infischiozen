/**
 * Forms with errors: an empty submit shows the error summary, moves focus to
 * the first invalid field, links each invalid field to its error text, and
 * leaves no axe violation.
 */
import { test, expect } from '@playwright/test'
import { expectNoAxeViolations } from '../support/axe.js'
import { it, openPage } from '../support/page.js'

const FORMS = [
  ['client', '/clienti/nuovo'],
  ['product', '/prodotti/nuovo'],
  ['external invoice', '/fatture/registra'],
  ['settings', '/impostazioni'],
]

for (const [name, path] of FORMS) {
  test(`${name} form reports its errors accessibly`, async ({ page }) => {
    await openPage(page, path)
    await page.locator('button[type="submit"]').first().click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator(':focus')).toHaveAttribute('aria-invalid', 'true')

    const invalidFields = await page.locator('[aria-invalid="true"]').all()
    expect(invalidFields.length).toBeGreaterThan(0)

    for (const field of invalidFields) {
      const ids = (await field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean)
      expect(ids.length).toBeGreaterThan(0)

      for (const id of ids) {
        await expect(page.locator(`[id="${id}"]`)).not.toBeEmpty()
      }
    }

    await expectNoAxeViolations(page)
  })
}

test('new invoice wizard reports a missing client accessibly', async ({ page }) => {
  await openPage(page, '/fatture/nuova')
  await page.getByRole('button', { name: it.invoiceForm.next }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expectNoAxeViolations(page)
})
