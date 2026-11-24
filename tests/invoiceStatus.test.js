import { describe, it, expect } from 'vitest'
import { invoiceStatuses, nextStatuses } from '../src/lib/invoiceStatus.js'

describe('invoiceStatuses', () => {
  it('lists every status in life-cycle order', () => {
    expect(invoiceStatuses).toEqual(['bozza', 'emessa', 'inviata', 'pagata', 'annullata'])
  })
})

describe('nextStatuses', () => {
  it('lets a draft be issued or canceled', () => {
    expect(nextStatuses('bozza')).toEqual(['emessa', 'annullata'])
  })

  it('moves an issued invoice forward or cancels it, never back to draft', () => {
    expect(nextStatuses('emessa')).toEqual(['inviata', 'pagata', 'annullata'])
    expect(nextStatuses('inviata')).toEqual(['pagata', 'annullata'])
    expect(nextStatuses('pagata')).toEqual(['annullata'])
  })

  it('ends at canceled, and knows no unknown status', () => {
    expect(nextStatuses('annullata')).toEqual([])
    expect(nextStatuses('sconosciuto')).toEqual([])
  })
})
