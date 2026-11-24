/**
 * @module lib/dashboardStats
 * Pure figures for the dashboard: which invoices count, totals per month and
 * per client, and the share of the largest clients.
 */
import { clientName } from './displayNames.js'

/**
 * Invoices that count toward the figures: not drafts and not canceled.
 * Internal and external invoices both count.
 *
 * @param {object[]} invoices
 * @returns {object[]}
 */
export function countedInvoices(invoices) {
  return invoices.filter((invoice) => invoice.stato !== 'bozza' && invoice.stato !== 'annullata')
}

/**
 * @param {object[]} invoices
 * @param {number|string} year
 * @returns {object[]}
 */
export function invoicesOfYear(invoices, year) {
  return invoices.filter((invoice) => String(invoice.anno) === String(year))
}

/**
 * Sum one numeric field. A missing or invalid value counts as zero.
 *
 * @param {object[]} items
 * @param {string} field
 * @returns {number}
 */
export function sumOf(items, field) {
  return items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0)
}

/**
 * Taxable amount per month, January first.
 *
 * @param {object[]} invoices - invoices of one year
 * @returns {number[]} twelve values
 */
export function monthlyTotals(invoices) {
  const months = Array.from({ length: 12 }, () => 0)

  for (const invoice of invoices) {
    const month = Number(String(invoice.data).slice(5, 7)) - 1

    if (month >= 0 && month < 12) {
      months[month] += Number(invoice.imponibile) || 0
    }
  }

  return months
}

/**
 * @param {number[]} values
 * @returns {number[]} each value plus all the values before it
 */
export function runningTotals(values) {
  let sum = 0

  return values.map((value) => {
    sum += value

    return sum
  })
}

/**
 * Taxable amount per client, largest first.
 *
 * @param {object[]} invoices
 * @returns {number[]}
 */
export function totalsByClient(invoices) {
  const totals = new Map()

  for (const invoice of invoices) {
    const key = invoice.clienteId ?? clientName(invoice.clienteSnapshot)

    totals.set(key, (totals.get(key) || 0) + (Number(invoice.imponibile) || 0))
  }

  return totals.values().toArray().toSorted((a, b) => b - a)
}

/**
 * Percent of the whole that comes from the largest totals.
 *
 * @param {number[]} totals - sorted largest first
 * @param {number} count - how many of the largest totals to take
 * @returns {number} a rounded percent, 0 when there is no total
 */
export function topShare(totals, count) {
  const whole = totals.reduce((sum, value) => sum + value, 0)

  if (!whole) {
    return 0
  }

  const top = totals.slice(0, count).reduce((sum, value) => sum + value, 0)

  return Math.round((top / whole) * 100)
}

/**
 * Years to pick from: the invoice years and the current year, newest first.
 *
 * @param {object[]} invoices
 * @param {number} currentYear
 * @returns {number[]}
 */
export function dashboardYears(invoices, currentYear) {
  const years = new Set(invoices.map((invoice) => invoice.anno).filter(Boolean))

  years.add(currentYear)

  return [...years].toSorted((a, b) => b - a)
}
