import { describe, it, expect } from 'vitest'
import { invoiceDraftSchema, emptyLine, buildInvoice } from '../src/lib/invoiceDraft.js'
import { calcolaFattura } from '../src/lib/calcoloFattura.js'
import { IMPOSTAZIONI_DEFAULT } from '../src/data/impostazioniDefault.js'

// Invented test data (no real person or company).
const client = { id: 3, tipo: 'privato', nome: 'Mario', cognome: 'Rossi', codiceFiscale: 'RSSMRA80A01H501U' }

/**
 * Valid draft values.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function draft(overrides = {}) {
  return {
    clienteId: 3,
    righe: [{ ...emptyLine(), descrizione: 'Consulenza', quantita: 2, prezzoUnitario: 50 }],
    data: '2026-11-20',
    modalitaPagamento: 'Bonifico',
    scadenzaPagamento: '',
    note: '',
    applicaRivalsa: true,
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
  const result = invoiceDraftSchema.safeParse(data)

  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('invoiceDraftSchema', () => {
  it('accepts a valid draft', () => {
    expect(errorsOf(draft())).toEqual({})
  })

  it('requires a client', () => {
    expect(errorsOf(draft({ clienteId: '' }))).toEqual({ clienteId: 'invoiceForm.error.client' })
  })

  it('requires at least one line with a description', () => {
    const onlyEmpty = draft({ righe: [emptyLine()] })

    expect(errorsOf(onlyEmpty)).toEqual({ righe: 'invoiceForm.error.lines' })
    expect(errorsOf(draft({ righe: [] }))).toEqual({ righe: 'invoiceForm.error.lines' })
  })

  it('requires the invoice date as YYYY-MM-DD', () => {
    expect(errorsOf(draft({ data: '' }))).toEqual({ data: 'invoiceForm.error.date' })
    expect(errorsOf(draft({ data: '20/11/2026' }))).toEqual({ data: 'invoiceForm.error.date' })
  })
})

describe('buildInvoice', () => {
  it('keeps only lines with a description and adds the line total', () => {
    const values = draft({ righe: [...draft().righe, emptyLine()] })
    const invoice = buildInvoice(values, client, IMPOSTAZIONI_DEFAULT)

    expect(invoice.righe).toEqual([
      { prodottoId: undefined, descrizione: 'Consulenza', quantita: 2, prezzoUnitario: 50, totaleRiga: 100 },
    ])
  })

  it('bug 20: a line with a price but no description does not count in the amounts', () => {
    const noDescription = { ...emptyLine(), prezzoUnitario: 30 }
    const invoice = buildInvoice(draft({ righe: [...draft().righe, noDescription] }), client, IMPOSTAZIONI_DEFAULT)
    const lineSum = invoice.righe.reduce((sum, line) => sum + line.totaleRiga, 0)

    expect(invoice.imponibile).toBe(lineSum)
  })

  it('copies the client id and a snapshot of the client', () => {
    const invoice = buildInvoice(draft(), client, IMPOSTAZIONI_DEFAULT)

    expect(invoice.clienteId).toBe(3)
    expect(invoice.clienteSnapshot).toEqual(client)
    expect(invoice.clienteSnapshot).not.toBe(client)
  })

  it('takes the amounts from calcolaFattura with the rivalsa choice of this invoice', () => {
    const withRivalsa = buildInvoice(draft(), client, IMPOSTAZIONI_DEFAULT)
    const without = buildInvoice(draft({ applicaRivalsa: false }), client, IMPOSTAZIONI_DEFAULT)
    const expected = calcolaFattura(draft().righe, { ...IMPOSTAZIONI_DEFAULT, applicaRivalsaInps: true })

    expect(withRivalsa).toMatchObject({
      imponibile: expected.imponibile,
      rivalsaInps: expected.rivalsaInps,
      marcaDaBollo: expected.marcaDaBollo,
      totale: expected.totale,
    })

    expect(without.rivalsaInps).toBe(0)
    expect(without.totale).toBe(calcolaFattura(draft().righe, { ...IMPOSTAZIONI_DEFAULT, applicaRivalsaInps: false }).totale)
  })

  it('stores the rivalsa percentage only when the rivalsa applies', () => {
    const settings = { ...IMPOSTAZIONI_DEFAULT, percentualeRivalsaInps: 4 }

    expect(buildInvoice(draft(), client, settings)).toMatchObject({ applicaRivalsaInps: true, percentualeRivalsa: 4 })

    expect(buildInvoice(draft({ applicaRivalsa: false }), client, settings)).toMatchObject({
      applicaRivalsaInps: false,
      percentualeRivalsa: 0,
    })
  })

  it('carries date, payment, due date and notes, with no XML and no external PDF', () => {
    const invoice = buildInvoice(
      draft({ modalitaPagamento: 'PayPal', scadenzaPagamento: '2026-12-20', note: 'Grazie' }),
      client,
      IMPOSTAZIONI_DEFAULT,
    )

    expect(invoice).toMatchObject({
      data: '2026-11-20',
      origine: 'interna',
      modalitaPagamento: 'PayPal',
      scadenzaPagamento: '2026-12-20',
      note: 'Grazie',
      xmlString: '',
    })
  })
})
