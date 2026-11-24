/**
 * @module lib/invoiceStatus
 * Invoice statuses and the changes the detail page offers. The server checks
 * the same rules: a draft gets its number only by being issued.
 */

/**
 * Every invoice status, in life-cycle order.
 *
 * @type {string[]}
 */
export const invoiceStatuses = ['bozza', 'emessa', 'inviata', 'pagata', 'annullata']

/**
 * Status changes allowed from each status. An invoice never goes back to draft.
 */
const transitions = {
  bozza: ['emessa', 'annullata'],
  emessa: ['inviata', 'pagata', 'annullata'],
  inviata: ['pagata', 'annullata'],
  pagata: ['annullata'],
  annullata: [],
}

/**
 * Statuses an invoice can move to from its current status.
 *
 * @param {string} status
 * @returns {string[]} empty for a canceled or unknown status
 */
export function nextStatuses(status) {
  return transitions[status] ?? []
}
