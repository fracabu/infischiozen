import { describe, it, expect } from 'vitest'
import { externalInvoiceSchema, buildExternalInvoice } from '../src/lib/externalInvoice.js'
import { emptyLine } from '../src/lib/invoiceDraft.js'
import { IMPOSTAZIONI_DEFAULT } from '../src/data/impostazioniDefault.js'

// Invented test data (no real person or company).
const client = { id: 3, tipo: 'azienda', ragioneSociale: 'Esempio Srl', partitaIVA: '12345678903' }

/**
 * Valid external invoice values.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function external(overrides = {}) {
  return {
    numero: 7,
    data: '2026-03-10',
    stato: 'pagata',
    clienteId: 3,
    righe: [{ ...emptyLine(), descrizione: 'Corso', quantita: 1, prezzoUnitario: 50 }],
    modalitaPagamento: 'Bonifico',
    note: '',
    applicaRivalsa: false,
    ...overrides,
  }
}

/**
 * Field errors as { path: i18n key }.
 *
 * @param {object} data
 * @returns {Record<string, string>}
 */
function errorsOf(data) {
  const result = externalInvoiceSchema.safeParse(data)

  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('externalInvoiceSchema', () => {
  it('accepts valid values', () => {
    expect(errorsOf(external())).toEqual({})
  })

  it('requires a whole invoice number of 1 or more', () => {
    for (const numero of ['', 0, -1, 2.5, 'abc']) {
      expect(errorsOf(external({ numero }))).toEqual({ numero: 'externalForm.error.number' })
    }
  })

  it('reads a numeric text number as a number', () => {
    const result = externalInvoiceSchema.safeParse(external({ numero: '12' }))

    expect(result.success).toBe(true)
    expect(result.data.numero).toBe(12)
  })

  it('requires client, a described line and a date, like the new invoice', () => {
    const incomplete = external({ clienteId: '', righe: [emptyLine()], data: '' })

    expect(errorsOf(incomplete)).toEqual({
      clienteId: 'invoiceForm.error.client',
      righe: 'invoiceForm.error.lines',
      data: 'invoiceForm.error.date',
    })
  })

  it('accepts only an issued status, never a draft', () => {
    expect(errorsOf(external({ stato: 'bozza' }))).toEqual({ stato: 'externalForm.error.status' })

    for (const stato of ['emessa', 'inviata', 'pagata', 'annullata']) {
      expect(errorsOf(external({ stato }))).toEqual({})
    }
  })
})

describe('buildExternalInvoice', () => {
  it('bug 21: sends no year, so the server takes it from the date', () => {
    const invoice = buildExternalInvoice(external(), client, IMPOSTAZIONI_DEFAULT)

    expect(invoice).not.toHaveProperty('anno')
    expect(invoice).toMatchObject({ numero: 7, data: '2026-03-10', stato: 'pagata' })
  })

  it('bug 20: counts only the saved lines in the amounts', () => {
    const priced = { ...emptyLine(), prezzoUnitario: 99 }
    const invoice = buildExternalInvoice(external({ righe: [...external().righe, priced] }), client, IMPOSTAZIONI_DEFAULT)

    expect(invoice.righe).toHaveLength(1)
    expect(invoice.imponibile).toBe(50)
  })

  it('has no due date and carries the attached PDF', () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' })
    const invoice = buildExternalInvoice(external(), client, IMPOSTAZIONI_DEFAULT, pdf)

    expect(invoice.scadenzaPagamento).toBe('')
    expect(invoice.pdfEsternoBlob).toBe(pdf)
  })
})
