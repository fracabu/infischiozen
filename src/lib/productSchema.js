/**
 * @module lib/productSchema
 * Validation rules of a catalog product, as a zod schema. Each error message
 * is an i18n key under productForm.error, so the view translates it.
 */
import { z } from 'zod'

/**
 * Text field: a missing value reads as empty text.
 */
const text = z.preprocess((value) => (value === undefined || value === null ? '' : String(value)), z.string())

/**
 * Price: a number of 0 or more. Empty text is not a price.
 */
const price = z.preprocess(
  (value) => (String(value ?? '').trim() === '' ? NaN : Number(value)),
  z.number({ message: 'productForm.error.price' }).min(0, 'productForm.error.price'),
)

/**
 * Units of measure the form offers. Old records can hold other text.
 *
 * @type {string[]}
 */
export const productUnits = ['servizio', 'ora', 'pz', 'giornata']

/**
 * A new product: an active service at price 0.
 *
 * @returns {object}
 */
export function emptyProduct() {
  return {
    nome: '',
    descrizione: '',
    categoria: '',
    prezzo: 0,
    unitaMisura: 'servizio',
    attivo: true,
  }
}

/**
 * The product schema. Unknown keys such as id pass through.
 *
 * @type {import('zod').ZodType}
 */
export const productSchema = z
  .object({
    nome: text.refine(Boolean, 'productForm.error.required'),
    descrizione: text,
    categoria: text,
    prezzo: price,
    unitaMisura: text,
    attivo: z.boolean(),
  })
  .passthrough()
