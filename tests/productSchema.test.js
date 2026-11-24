import { describe, it, expect } from 'vitest'
import { productSchema, emptyProduct } from '../src/lib/productSchema.js'

/**
 * Valid product.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function product(overrides = {}) {
  return { ...emptyProduct(), nome: 'Consulenza', prezzo: 75, ...overrides }
}

/**
 * Field errors as { field: i18n key }.
 *
 * @param {object} data
 * @returns {Record<string, string>}
 */
function errorsOf(data) {
  const result = productSchema.safeParse(data)

  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('productSchema', () => {
  it('starts a new product as an active service at price 0', () => {
    expect(emptyProduct()).toEqual({
      nome: '',
      descrizione: '',
      categoria: '',
      prezzo: 0,
      unitaMisura: 'servizio',
      attivo: true,
    })
  })

  it('accepts a valid product, price 0 included', () => {
    expect(errorsOf(product())).toEqual({})
    expect(errorsOf(product({ prezzo: 0 }))).toEqual({})
  })

  it('requires a name', () => {
    expect(errorsOf(product({ nome: '' }))).toEqual({ nome: 'productForm.error.required' })
  })

  it('rejects an empty, negative or non-numeric price', () => {
    for (const prezzo of ['', -1, 'abc', undefined]) {
      expect(errorsOf(product({ prezzo }))).toEqual({ prezzo: 'productForm.error.price' })
    }
  })

  it('reads a numeric text price as a number', () => {
    const result = productSchema.safeParse(product({ prezzo: '12.50' }))

    expect(result.success).toBe(true)
    expect(result.data.prezzo).toBe(12.5)
  })

  it('keeps the record id and reads missing text as empty', () => {
    const result = productSchema.safeParse(product({ id: 4, categoria: undefined }))

    expect(result.success).toBe(true)
    expect(result.data.id).toBe(4)
    expect(result.data.categoria).toBe('')
  })
})
