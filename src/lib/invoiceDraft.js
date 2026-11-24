/**
 * @module lib/invoiceDraft
 * The new-invoice wizard: its validation schema and the invoice it builds.
 * Each error message is an i18n key under invoiceForm.error.
 */
import { z } from 'zod'
import { computeInvoice, lineTotal } from './invoiceMath.js'

/**
 * Text field: a missing value reads as empty text.
 */
const text = z.preprocess((value) => (value === undefined || value === null ? '' : String(value)), z.string())

/**
 * An empty invoice line: one unit at price 0, no catalog product.
 *
 * @returns {object}
 */
export function emptyLine() {
  return { prodottoId: undefined, descrizione: '', quantita: 1, prezzoUnitario: 0 }
}

/**
 * Wizard schema. Each field validates alone, so the wizard can check one
 * step at a time. Lines without a description are dropped when the invoice
 * is built, so only one line with a description is required.
 *
 * @type {import('zod').ZodType}
 */
export const invoiceDraftSchema = z.object({
  clienteId: z.union([z.string(), z.number()]).refine((id) => id !== '', 'invoiceForm.error.client'),
  righe: z
    .array(z.object({ descrizione: text }).passthrough())
    .refine((lines) => lines.some((line) => line.descrizione), 'invoiceForm.error.lines'),
  data: text.refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'invoiceForm.error.date'),
  modalitaPagamento: text,
  scadenzaPagamento: text,
  note: text,
  applicaRivalsa: z.boolean(),
})

/**
 * The invoice the wizard saves or issues. Amounts come from computeInvoice,
 * with the rivalsa choice of this invoice in place of the settings default.
 *
 * @param {object} values - wizard values (see invoiceDraftSchema)
 * @param {object} client - the selected client record
 * @param {object} settings - user settings (rivalsa, bollo)
 * @returns {object} invoice body for the invoices store
 */
export function buildInvoice(values, client, settings) {
  const config = { ...settings, applicaRivalsaInps: values.applicaRivalsa }

  const lines = values.righe
    .filter((line) => line.descrizione)
    .map((line) => ({
      prodottoId: line.prodottoId,
      descrizione: line.descrizione,
      quantita: Number(line.quantita) || 0,
      prezzoUnitario: Number(line.prezzoUnitario) || 0,
      totaleRiga: lineTotal(line),
    }))

  const amounts = computeInvoice(lines, config)

  return {
    data: values.data,
    origine: 'interna',
    clienteId: client.id,
    clienteSnapshot: { ...client },
    righe: lines,
    imponibile: amounts.imponibile,
    applicaRivalsaInps: values.applicaRivalsa,
    percentualeRivalsa: values.applicaRivalsa ? Number(settings.percentualeRivalsaInps) || 0 : 0,
    rivalsaInps: amounts.rivalsaInps,
    marcaDaBollo: amounts.marcaDaBollo,
    totale: amounts.totale,
    note: values.note,
    modalitaPagamento: values.modalitaPagamento,
    scadenzaPagamento: values.scadenzaPagamento,
    xmlString: '',
  }
}
