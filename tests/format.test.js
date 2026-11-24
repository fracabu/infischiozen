import { describe, it, expect } from 'vitest'
import {
  isValidVatNumber, isValidTaxCode, isValidPostalCode, isValidProvince,
  isValidRecipientCode, isValidEmail, formatDate, round2,
} from '../src/lib/format.js'

// Invented test data (no real person or company).
const VALID_VAT = '12345678903'
const VALID_TAX_CODE = 'RSSMRA80A01H501U'

describe('isValidVatNumber', () => {
  it('accepts a VAT number with a correct check digit', () => expect(isValidVatNumber(VALID_VAT)).toBe(true))
  it('rejects a wrong check digit', () => expect(isValidVatNumber('12345678901')).toBe(false))

  it('rejects a wrong length or wrong characters', () => {
    for (const value of ['', null, '1234567890', '123456789031', '1234567890A']) {
      expect(isValidVatNumber(value)).toBe(false)
    }
  })

  it('ignores spaces at the ends', () => expect(isValidVatNumber(` ${VALID_VAT} `)).toBe(true))
})

describe('isValidTaxCode', () => {
  it('accepts a valid tax code of a person', () => expect(isValidTaxCode(VALID_TAX_CODE)).toBe(true))
  it('accepts lower case', () => expect(isValidTaxCode(VALID_TAX_CODE.toLowerCase())).toBe(true))

  it('rejects a wrong check character', () => {
    expect(isValidTaxCode('RSSMRA80A01H501X')).toBe(false)
  })

  it('accepts the numeric tax code of a company (= VAT number)', () => expect(isValidTaxCode(VALID_VAT)).toBe(true))

  it('rejects wrong formats', () => {
    for (const value of ['', null, 'RSSMRA80A01H501', 'RSSMRA80A01H501U1', 'RSSMRA80A01H50-U']) {
      expect(isValidTaxCode(value)).toBe(false)
    }
  })
})

describe('other checks', () => {
  it('postal code', () => {
    expect(isValidPostalCode('00100')).toBe(true)
    expect(isValidPostalCode('0010')).toBe(false)
  })

  it('province', () => {
    expect(isValidProvince('rm')).toBe(true)
    expect(isValidProvince('ROM')).toBe(false)
  })

  it('SdI recipient code', () => {
    expect(isValidRecipientCode('0000000')).toBe(true)
    expect(isValidRecipientCode('abc1234')).toBe(true)
    expect(isValidRecipientCode('ABC123')).toBe(false)
  })

  it('email', () => {
    expect(isValidEmail('nome@esempio.it')).toBe(true)
    expect(isValidEmail('nome@esempio')).toBe(false)
  })
})

describe('formats', () => {
  it('ISO date as dd/mm/yyyy with no time zone shift', () => {
    expect(formatDate('2026-09-06')).toBe('06/09/2026')
    expect(formatDate('')).toBe('')
  })

  it('round2', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
})
