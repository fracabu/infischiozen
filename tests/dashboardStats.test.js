import { describe, it, expect } from 'vitest'
import {
  countedInvoices,
  invoicesOfYear,
  sumOf,
  monthlyTotals,
  runningTotals,
  totalsByClient,
  topShare,
  dashboardYears,
} from '../src/lib/dashboardStats.js'

const invoices = [
  { id: 1, stato: 'emessa', anno: 2026, data: '2026-01-10', clienteId: 1, imponibile: 100, totale: 102 },
  { id: 2, stato: 'pagata', anno: 2026, data: '2026-03-05', clienteId: 2, imponibile: 300, totale: 300 },
  { id: 3, stato: 'inviata', anno: 2026, data: '2026-03-20', clienteId: 1, imponibile: 50, totale: 50 },
  { id: 4, stato: 'annullata', anno: 2026, data: '2026-04-01', clienteId: 3, imponibile: 999, totale: 999 },
  { id: 5, stato: 'bozza', anno: undefined, data: '2026-05-01', clienteId: 3, imponibile: 999, totale: 999 },
  { id: 6, stato: 'pagata', anno: 2025, data: '2025-12-31', clienteId: 2, imponibile: 200, totale: 200 },
]

const year2026 = invoicesOfYear(countedInvoices(invoices), 2026)

describe('countedInvoices', () => {
  it('drops drafts and canceled invoices', () => {
    expect(countedInvoices(invoices).map((invoice) => invoice.id)).toEqual([1, 2, 3, 6])
  })
})

describe('invoicesOfYear', () => {
  it('keeps the invoices of one year, given as a number or a string', () => {
    expect(invoicesOfYear(countedInvoices(invoices), 2026).map((invoice) => invoice.id)).toEqual([1, 2, 3])
    expect(invoicesOfYear(countedInvoices(invoices), '2025').map((invoice) => invoice.id)).toEqual([6])
  })
})

describe('sumOf', () => {
  it('adds one field and reads a missing value as zero', () => {
    expect(sumOf([{ totale: 10 }, { totale: '5.5' }, {}], 'totale')).toBe(15.5)
  })
})

describe('monthlyTotals', () => {
  it('gives twelve months of taxable amount', () => {
    const months = monthlyTotals(year2026)

    expect(months).toHaveLength(12)
    expect(months[0]).toBe(100)
    expect(months[2]).toBe(350)
    expect(months[3]).toBe(0)
  })

  it('skips an invoice with no valid date', () => {
    expect(monthlyTotals([{ data: '', imponibile: 10 }])).toEqual(Array.from({ length: 12 }, () => 0))
  })
})

describe('runningTotals', () => {
  it('adds each value to the ones before it', () => {
    expect(runningTotals([1, 0, 2, 3])).toEqual([1, 1, 3, 6])
  })
})

describe('totalsByClient', () => {
  it('sums the taxable amount per client, largest first', () => {
    expect(totalsByClient(year2026)).toEqual([300, 150])
  })
})

describe('topShare', () => {
  it('gives the rounded percent of the largest totals', () => {
    expect(topShare([300, 150], 1)).toBe(67)
    expect(topShare([300, 150], 3)).toBe(100)
  })

  it('gives zero when there is no total', () => {
    expect(topShare([], 1)).toBe(0)
  })
})

describe('dashboardYears', () => {
  it('lists the invoice years and the current year, newest first', () => {
    expect(dashboardYears(invoices, 2027)).toEqual([2027, 2026, 2025])
  })
})
