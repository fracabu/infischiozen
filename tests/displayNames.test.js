import { describe, it, expect } from 'vitest'
import { clientName, invoiceNumber } from '../src/lib/displayNames.js'

describe('clientName', () => {
  it('shows surname and name for a private client', () => {
    expect(clientName({ tipo: 'privato', nome: 'Mario', cognome: 'Rossi', ragioneSociale: 'Ignored' })).toBe('Rossi Mario')
  })

  it('shows the company name for a company or a public body', () => {
    expect(clientName({ tipo: 'azienda', ragioneSociale: 'Esempio Srl', nome: 'Mario' })).toBe('Esempio Srl')
    expect(clientName({ tipo: 'pa', ragioneSociale: 'Comune di Prova' })).toBe('Comune di Prova')
  })

  it('falls back to the person when a company has no company name', () => {
    expect(clientName({ tipo: 'azienda', nome: 'Mario', cognome: 'Rossi' })).toBe('Rossi Mario')
  })

  it('returns empty text for a missing or empty client', () => {
    expect(clientName()).toBe('')
    expect(clientName({})).toBe('')
  })
})

describe('invoiceNumber', () => {
  it('shows number/year for a numbered invoice', () => {
    expect(invoiceNumber({ numero: 12, anno: 2026 })).toBe('12/2026')
  })

  it('returns empty text for a draft', () => {
    expect(invoiceNumber({ numero: undefined, anno: undefined })).toBe('')
    expect(invoiceNumber({})).toBe('')
  })
})
