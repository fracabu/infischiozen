/**
 * @module lib/displayNames
 * Display text of a client and of an invoice number, shared by the views.
 */

/**
 * Client display name: surname and name for a private client, the company
 * name otherwise. A company with no company name shows the person.
 *
 * @param {object} [client] - client record or invoice client snapshot
 * @returns {string} empty text when nothing is known
 */
export function clientName(client) {
  if (!client) {
    return ''
  }

  const person = `${client.cognome || ''} ${client.nome || ''}`.trim()

  return client.tipo === 'privato' ? person : client.ragioneSociale || person
}

/**
 * Invoice number as number/year.
 *
 * @param {object} invoice
 * @returns {string} empty text for a draft, which has no number yet
 */
export function invoiceNumber(invoice) {
  return invoice.numero ? `${invoice.numero}/${invoice.anno}` : ''
}
