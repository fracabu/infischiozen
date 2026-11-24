/**
 * @module lib/externalInvoice
 * An invoice issued with another software and registered here: its schema
 * and the invoice body it builds. Rules shared with the new-invoice wizard
 * come from invoiceDraft.js.
 */
import { z } from 'zod'
import { invoiceDraftSchema, buildInvoice } from './invoiceDraft.js'

/**
 * Statuses an external invoice can have. It is already issued, so never a draft.
 *
 * @type {string[]}
 */
export const externalStatuses = ['emessa', 'inviata', 'pagata', 'annullata']

/**
 * Invoice number: a whole number of 1 or more. Empty text is not a number.
 */
const invoiceNumber = z.preprocess(
  (value) => (String(value ?? '').trim() === '' ? NaN : Number(value)),
  z.number({ message: 'externalForm.error.number' }).int('externalForm.error.number').min(1, 'externalForm.error.number'),
)

/**
 * External invoice schema: the wizard fields with no due date, plus number
 * and status. There is no year field: the server takes the year from the date.
 *
 * @type {import('zod').ZodType}
 */
export const externalInvoiceSchema = invoiceDraftSchema.omit({ scadenzaPagamento: true }).extend({
  numero: invoiceNumber,
  stato: z.enum(externalStatuses, { message: 'externalForm.error.status' }),
})

/**
 * The invoice body for the invoices store (salvaEsterna).
 *
 * @param {object} values - form values (see externalInvoiceSchema)
 * @param {object} client - the selected client record
 * @param {object} settings - user settings (rivalsa, bollo)
 * @param {Blob} [pdf] - the original PDF, when attached
 * @returns {object}
 */
export function buildExternalInvoice(values, client, settings, pdf) {
  return {
    ...buildInvoice({ ...values, scadenzaPagamento: '' }, client, settings),
    numero: values.numero,
    stato: values.stato,
    pdfEsternoBlob: pdf,
  }
}
