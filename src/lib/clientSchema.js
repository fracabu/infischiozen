/**
 * @module lib/clientSchema
 * Validation rules of a client record, as a zod schema. Each error message is
 * an i18n key under clientForm.error, so the view translates it.
 */
import { z } from 'zod'
import {
  validaPartitaIVA, validaCodiceFiscale, validaCap,
  validaProvincia, validaEmail, validaCodiceDestinatario,
} from './format.js'

/**
 * Text field: a missing value reads as empty text.
 */
const text = z.preprocess((value) => (value === undefined || value === null ? '' : String(value)), z.string())

/**
 * A new client: private person, Italy, no SdI recipient code.
 *
 * @returns {object}
 */
export function emptyClient() {
  return {
    tipo: 'privato',
    ragioneSociale: '',
    nome: '',
    cognome: '',
    codiceFiscale: '',
    partitaIVA: '',
    indirizzo: '',
    cap: '',
    citta: '',
    provincia: '',
    nazione: 'IT',
    codiceDestinatario: '0000000',
    pec: '',
    email: '',
    telefono: '',
    note: '',
  }
}

/**
 * Add one issue on a field.
 *
 * @param {import('zod').RefinementCtx} context
 * @param {string} field
 * @param {string} key - error name under clientForm.error
 */
function fail(context, field, key) {
  context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `clientForm.error.${key}` })
}

/**
 * The client schema. Unknown keys such as id pass through. A foreign client
 * skips the Italian checks: tax code, VAT number, postal code, province.
 * Recipient code 0000000 without PEC is valid: most private clients have no PEC.
 *
 * @type {import('zod').ZodType}
 */
export const clientSchema = z
  .object({
    tipo: z.enum(['privato', 'azienda', 'pa']),
    ragioneSociale: text,
    nome: text,
    cognome: text,
    codiceFiscale: text,
    partitaIVA: text,
    indirizzo: text,
    cap: text,
    citta: text,
    provincia: text,
    nazione: text,
    codiceDestinatario: text,
    pec: text,
    email: text,
    telefono: text,
    note: text,
  })
  .passthrough()
  .superRefine((client, context) => {
    const isItalian = (client.nazione || 'IT').toUpperCase() === 'IT'

    if (client.tipo === 'privato') {
      if (!client.nome) {
        fail(context, 'nome', 'required')
      }

      if (!client.cognome) {
        fail(context, 'cognome', 'required')
      }

      if (!client.codiceFiscale) {
        fail(context, 'codiceFiscale', 'required')
      } else if (isItalian && !validaCodiceFiscale(client.codiceFiscale)) {
        fail(context, 'codiceFiscale', 'taxCode')
      }
    } else {
      if (!client.ragioneSociale) {
        fail(context, 'ragioneSociale', 'required')
      }

      if (!client.partitaIVA) {
        fail(context, 'partitaIVA', 'required')
      } else if (isItalian && !validaPartitaIVA(client.partitaIVA)) {
        fail(context, 'partitaIVA', 'vatNumber')
      }

      if (isItalian && client.codiceFiscale && !validaCodiceFiscale(client.codiceFiscale)) {
        fail(context, 'codiceFiscale', 'taxCode')
      }
    }

    if (!client.indirizzo) {
      fail(context, 'indirizzo', 'required')
    }

    if (!client.citta) {
      fail(context, 'citta', 'required')
    }

    if (isItalian && !validaCap(client.cap)) {
      fail(context, 'cap', 'postalCode')
    }

    if (isItalian && !validaProvincia(client.provincia)) {
      fail(context, 'provincia', 'province')
    }

    if (!validaCodiceDestinatario(client.codiceDestinatario)) {
      fail(context, 'codiceDestinatario', 'recipientCode')
    }

    if (client.pec && !validaEmail(client.pec)) {
      fail(context, 'pec', 'pec')
    }

    if (client.email && !validaEmail(client.email)) {
      fail(context, 'email', 'email')
    }
  })
