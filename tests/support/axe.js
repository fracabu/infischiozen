/**
 * @module tests/support/axe
 * axe-core check for the Playwright tests. A failure lists each rule with the
 * elements that break it, so the report says what to fix.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

/**
 * Run axe on the page, or on one part of it, and expect no violations.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [include] - CSS selector of the part to check
 */
export async function expectNoAxeViolations(page, include) {
  const builder = new AxeBuilder({ page })
  const { violations } = await (include ? builder.include(include) : builder).analyze()

  const report = violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    elements: violation.nodes.map((node) => node.target.join(' ')),
  }))

  expect(report).toEqual([])
}
