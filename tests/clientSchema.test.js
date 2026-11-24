import { describe, it, expect } from 'vitest'
import { clientSchema, emptyClient } from '../src/lib/clientSchema.js'

// Invented test data (no real person or company).
const VAT_OK = '12345678903'
const TAX_CODE_OK = 'RSSMRA80A01H501U'

/**
 * Valid private client with no PEC and recipient code 0000000.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function privateClient(overrides = {}) {
  return {
    ...emptyClient(),
    nome: 'Mario',
    cognome: 'Rossi',
    codiceFiscale: TAX_CODE_OK,
    indirizzo: 'Via Roma 1',
    cap: '00100',
    citta: 'Roma',
    provincia: 'RM',
    ...overrides,
  }
}

/**
 * Valid company client.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function companyClient(overrides = {}) {
  return privateClient({
    tipo: 'azienda',
    nome: '',
    cognome: '',
    codiceFiscale: '',
    ragioneSociale: 'Esempio Srl',
    partitaIVA: VAT_OK,
    ...overrides,
  })
}

/**
 * Field errors as { field: i18n key }.
 *
 * @param {object} data
 * @returns {Record<string, string>}
 */
function errorsOf(data) {
  const result = clientSchema.safeParse(data)

  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('clientSchema', () => {
  it('accepts a private client with recipient code 0000000 and no PEC (bug 19)', () => {
    expect(errorsOf(privateClient())).toEqual({})
  })

  it('requires name, surname and tax code for a private client', () => {
    const errors = errorsOf(privateClient({ nome: '', cognome: '', codiceFiscale: '' }))

    expect(errors).toEqual({
      nome: 'clientForm.error.required',
      cognome: 'clientForm.error.required',
      codiceFiscale: 'clientForm.error.required',
    })
  })

  it('rejects a wrong Italian tax code', () => {
    expect(errorsOf(privateClient({ codiceFiscale: 'RSSMRA80A01H501X' }))).toEqual({
      codiceFiscale: 'clientForm.error.taxCode',
    })
  })

  it('does not check tax code, postal code and province for a foreign client', () => {
    const data = privateClient({ nazione: 'FR', codiceFiscale: 'FR-123', cap: '75001', provincia: '' })

    expect(errorsOf(data)).toEqual({})
  })

  it('requires company name and VAT number for a company', () => {
    const errors = errorsOf(companyClient({ ragioneSociale: '', partitaIVA: '' }))

    expect(errors).toEqual({
      ragioneSociale: 'clientForm.error.required',
      partitaIVA: 'clientForm.error.required',
    })
  })

  it('rejects a wrong Italian VAT number', () => {
    expect(errorsOf(companyClient({ partitaIVA: '12345678901' }))).toEqual({
      partitaIVA: 'clientForm.error.vatNumber',
    })
  })

  it('checks an optional company tax code only when present', () => {
    expect(errorsOf(companyClient())).toEqual({})

    expect(errorsOf(companyClient({ codiceFiscale: 'WRONG' }))).toEqual({
      codiceFiscale: 'clientForm.error.taxCode',
    })
  })

  it('requires address and city, and checks postal code and province in Italy', () => {
    const errors = errorsOf(privateClient({ indirizzo: '', citta: '', cap: '123', provincia: 'Roma' }))

    expect(errors).toEqual({
      indirizzo: 'clientForm.error.required',
      citta: 'clientForm.error.required',
      cap: 'clientForm.error.postalCode',
      provincia: 'clientForm.error.province',
    })
  })

  it('requires a 7 character recipient code', () => {
    expect(errorsOf(privateClient({ codiceDestinatario: '123' }))).toEqual({
      codiceDestinatario: 'clientForm.error.recipientCode',
    })
  })

  it('rejects a PEC or email that is present but not valid', () => {
    expect(errorsOf(privateClient({ pec: 'no-at-sign', email: 'also wrong' }))).toEqual({
      pec: 'clientForm.error.pec',
      email: 'clientForm.error.email',
    })
  })

  it('keeps the record id and reads missing values as empty text', () => {
    const result = clientSchema.safeParse(privateClient({ id: 7, telefono: undefined, note: undefined }))

    expect(result.success).toBe(true)
    expect(result.data.id).toBe(7)
    expect(result.data.telefono).toBe('')
  })
})
