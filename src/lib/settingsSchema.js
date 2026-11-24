/**
 * @module lib/settingsSchema
 * Validation rules of the settings (the seller's data), as a zod schema. Each
 * error message is an i18n key under settingsForm.error, so the view
 * translates it.
 */
import { z } from 'zod'
import { isValidVatNumber, isValidTaxCode, isValidPostalCode, isValidProvince, isValidEmail } from './format.js'

/**
 * FatturaPA accepts at most 100 characters in RiferimentoNormativo. A longer
 * legal text makes the SdI reject the invoice.
 */
export const LEGAL_TEXT_MAX = 100

/**
 * Text field: a missing value reads as empty text.
 */
const text = z.preprocess((value) => (value === undefined || value === null ? '' : String(value)), z.string())

/**
 * Number field: empty text reads as no value, other text becomes a number.
 * Text that is not a number becomes NaN, which the checks below reject.
 */
const amount = z.preprocess(
  (value) => (String(value ?? '').trim() === '' ? undefined : Number(value)),
  z.number().or(z.nan()).optional(),
)

/**
 * Add one issue on a field.
 *
 * @param {import('zod').RefinementCtx} context
 * @param {string} field
 * @param {string} key - error name under settingsForm.error
 */
function fail(context, field, key) {
  context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `settingsForm.error.${key}` })
}

/**
 * @param {number|undefined} value
 * @param {number} max
 * @returns {boolean} true when the value is a number from 0 to max
 */
function isInRange(value, max) {
  return typeof value === 'number' && value >= 0 && value <= max
}

/**
 * The settings schema. Unknown keys such as id, logo and confermato pass
 * through. The amounts of a switched-off option are not checked.
 *
 * @type {import('zod').ZodType}
 */
export const settingsSchema = z
  .object({
    nome: text,
    cognome: text,
    ragioneSociale: text,
    partitaIVA: text,
    codiceFiscale: text,
    indirizzo: text,
    cap: text,
    citta: text,
    provincia: text,
    nazione: text,
    email: text,
    pec: text,
    telefono: text,
    iban: text,
    intestatarioIban: text,
    banca: text,
    regimeFiscale: text,
    regimePrevidenziale: text,
    dicituraRegime: text,
    applicaRivalsaInps: z.boolean(),
    percentualeRivalsaInps: amount,
    prezziLordi: z.boolean(),
    applicaMarcaDaBollo: z.boolean(),
    addebitaBolloAlCliente: z.boolean(),
    sogliaBollo: amount,
    importoBollo: amount,
    testoBollo: text,
  })
  .passthrough()
  .superRefine((settings, context) => {
    for (const field of ['nome', 'cognome', 'indirizzo', 'citta']) {
      if (settings[field] === '') {
        fail(context, field, 'required')
      }
    }

    if (!isValidVatNumber(settings.partitaIVA)) {
      fail(context, 'partitaIVA', 'vatNumber')
    }

    if (!isValidTaxCode(settings.codiceFiscale)) {
      fail(context, 'codiceFiscale', 'taxCode')
    }

    if (!isValidPostalCode(settings.cap)) {
      fail(context, 'cap', 'postalCode')
    }

    if (!isValidProvince(settings.provincia)) {
      fail(context, 'provincia', 'province')
    }

    if (settings.email && !isValidEmail(settings.email)) {
      fail(context, 'email', 'email')
    }

    if (settings.pec && !isValidEmail(settings.pec)) {
      fail(context, 'pec', 'pec')
    }

    if (settings.dicituraRegime.length > LEGAL_TEXT_MAX) {
      fail(context, 'dicituraRegime', 'legalText')
    }

    if (settings.applicaRivalsaInps && !isInRange(settings.percentualeRivalsaInps, 100)) {
      fail(context, 'percentualeRivalsaInps', 'percent')
    }

    if (settings.applicaMarcaDaBollo) {
      for (const field of ['sogliaBollo', 'importoBollo']) {
        if (!isInRange(settings[field], Infinity)) {
          fail(context, field, 'amount')
        }
      }
    }
  })
