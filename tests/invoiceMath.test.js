import { describe, it, expect } from 'vitest'
import { computeInvoice, isStampDutyDue, lineTotal } from '../src/lib/invoiceMath.js'
import { DEFAULT_SETTINGS } from '../src/data/defaultSettings.js'

const base = { ...DEFAULT_SETTINGS }
const line = (prezzoUnitario, quantita = 1) => ({ quantita, prezzoUnitario })

describe('computeInvoice: INPS charge added (default)', () => {
  it('adds 4% on top of the price', () => {
    const result = computeInvoice([line(29)], base)
    expect(result).toEqual({ imponibile: 29, rivalsaInps: 1.16, marcaDaBollo: 0, totale: 30.16 })
  })

  it('adds up several lines with quantities', () => {
    const result = computeInvoice([line(10, 3), line(5.5, 2)], base)
    expect(result.imponibile).toBe(41)
    expect(result.rivalsaInps).toBe(1.64)
  })

  it('with no INPS charge the total is the taxable amount', () => {
    const result = computeInvoice([line(50)], { ...base, applicaRivalsaInps: false })
    expect(result).toEqual({ imponibile: 50, rivalsaInps: 0, marcaDaBollo: 0, totale: 50 })
  })
})

describe('computeInvoice: gross prices (INPS charge divided out)', () => {
  it('divides out the charge and the total stays the price', () => {
    const result = computeInvoice([line(30)], { ...base, prezziLordi: true })
    expect(result).toEqual({ imponibile: 28.85, rivalsaInps: 1.15, marcaDaBollo: 0, totale: 30 })
  })

  it('taxable amount + charge always gives the price, also after rounding', () => {
    for (const price of [0.01, 1, 9.99, 33.33, 77.77, 123.45, 999.99]) {
      const result = computeInvoice([line(price)], { ...base, prezziLordi: true })
      expect(Math.round((result.imponibile + result.rivalsaInps) * 100)).toBe(Math.round(price * 100))
    }
  })
})

describe('stamp duty', () => {
  it('is not due up to 77.47 EUR included', () => {
    const result = computeInvoice([line(77.47)], { ...base, applicaRivalsaInps: false })
    expect(result.marcaDaBollo).toBe(0)
  })

  it('is due above 77.47 EUR and goes into the total', () => {
    const result = computeInvoice([line(77.48)], { ...base, applicaRivalsaInps: false })
    expect(result.marcaDaBollo).toBe(2)
    expect(result.totale).toBe(79.48)
  })

  it('the threshold also counts the INPS charge (bug #5 in REVIEW.md)', () => {
    // 75 + 3 of charge = 78 > 77.47: the stamp duty is due although 75 < threshold
    const result = computeInvoice([line(75)], base)
    expect(result.rivalsaInps).toBe(3)
    expect(result.marcaDaBollo).toBe(2)
    expect(result.totale).toBe(80)
  })

  it('when the seller pays it, it stays out of the total but is still due', () => {
    const settings = { ...base, addebitaBolloAlCliente: false }
    const result = computeInvoice([line(100)], settings)
    expect(result.marcaDaBollo).toBe(0)
    expect(result.totale).toBe(104)
    expect(isStampDutyDue(result, settings)).toBe(true)
  })

  it('is never due when switched off in settings', () => {
    expect(isStampDutyDue({ imponibile: 1000, rivalsaInps: 40 }, { ...base, applicaMarcaDaBollo: false })).toBe(false)
  })
})

describe('edge cases', () => {
  it('no lines give all zeros', () => {
    expect(computeInvoice([], base)).toEqual({ imponibile: 0, rivalsaInps: 0, marcaDaBollo: 0, totale: 0 })
    expect(computeInvoice(undefined, base).totale).toBe(0)
  })

  it('values that are not numbers count as zero', () => {
    expect(lineTotal({ quantita: 'x', prezzoUnitario: 10 })).toBe(0)
  })

  it('no floating point errors', () => {
    expect(lineTotal({ quantita: 3, prezzoUnitario: 0.1 })).toBe(0.3)
  })
})
