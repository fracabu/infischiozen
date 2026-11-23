import { describe, it, expect } from 'vitest'
import {
  validaPartitaIVA, validaCodiceFiscale, validaCap, validaProvincia,
  validaCodiceDestinatario, validaEmail, formatData, round2,
} from '../src/lib/format.js'

// Dati di prova inventati (non di persone o aziende reali).
const PIVA_OK = '12345678903'
const CF_OK = 'RSSMRA80A01H501U'

describe('validaPartitaIVA', () => {
  it('accetta una P.IVA con checksum giusto', () => expect(validaPartitaIVA(PIVA_OK)).toBe(true))
  it('rifiuta checksum sbagliato', () => expect(validaPartitaIVA('12345678901')).toBe(false))
  it('rifiuta lunghezza e caratteri sbagliati', () => {
    for (const v of ['', null, '1234567890', '123456789031', '1234567890A']) {
      expect(validaPartitaIVA(v)).toBe(false)
    }
  })
  it('ignora gli spazi ai lati', () => expect(validaPartitaIVA(` ${PIVA_OK} `)).toBe(true))
})

describe('validaCodiceFiscale', () => {
  it('accetta un CF di persona fisica valido', () => expect(validaCodiceFiscale(CF_OK)).toBe(true))
  it('accetta le minuscole', () => expect(validaCodiceFiscale(CF_OK.toLowerCase())).toBe(true))
  it('rifiuta il carattere di controllo sbagliato', () => {
    expect(validaCodiceFiscale('RSSMRA80A01H501X')).toBe(false)
  })
  it('accetta il CF numerico di un\'azienda (= P.IVA)', () => expect(validaCodiceFiscale(PIVA_OK)).toBe(true))
  it('rifiuta formati sbagliati', () => {
    for (const v of ['', null, 'RSSMRA80A01H501', 'RSSMRA80A01H501U1', 'RSSMRA80A01H50-U']) {
      expect(validaCodiceFiscale(v)).toBe(false)
    }
  })
})

describe('altre validazioni', () => {
  it('CAP', () => {
    expect(validaCap('00100')).toBe(true)
    expect(validaCap('0010')).toBe(false)
  })
  it('provincia', () => {
    expect(validaProvincia('rm')).toBe(true)
    expect(validaProvincia('ROM')).toBe(false)
  })
  it('codice destinatario SdI', () => {
    expect(validaCodiceDestinatario('0000000')).toBe(true)
    expect(validaCodiceDestinatario('abc1234')).toBe(true)
    expect(validaCodiceDestinatario('ABC123')).toBe(false)
  })
  it('email', () => {
    expect(validaEmail('nome@esempio.it')).toBe(true)
    expect(validaEmail('nome@esempio')).toBe(false)
  })
})

describe('formattazione', () => {
  it('data ISO in gg/mm/aaaa senza spostamenti di fuso', () => {
    expect(formatData('2026-09-06')).toBe('06/09/2026')
    expect(formatData('')).toBe('')
  })
  it('round2', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
})
