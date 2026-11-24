import { describe, it, expect } from 'vitest'
import { settingsSchema, LEGAL_TEXT_MAX } from '../src/lib/settingsSchema.js'
import { IMPOSTAZIONI_DEFAULT } from '../src/data/impostazioniDefault.js'

const valid = {
  ...IMPOSTAZIONI_DEFAULT,
  nome: 'Mario',
  cognome: 'Rossi',
  partitaIVA: '01234567897',
  codiceFiscale: 'RSSMRA80A01H501U',
  indirizzo: 'Via Roma 1',
  cap: '00100',
  citta: 'Roma',
  provincia: 'RM',
}

/**
 * Error messages of a parse, by field.
 *
 * @param {object} values
 * @returns {Record<string, string>}
 */
function errorsOf(values) {
  const result = settingsSchema.safeParse(values)

  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('settingsSchema', () => {
  it('accepts complete settings and keeps unknown keys', () => {
    const result = settingsSchema.safeParse({ ...valid, confermato: true })

    expect(result.success).toBe(true)
    expect(result.data.confermato).toBe(true)
  })

  it('requires the identity and the address', () => {
    const errors = errorsOf(IMPOSTAZIONI_DEFAULT)

    expect(errors.nome).toBe('settingsForm.error.required')
    expect(errors.cognome).toBe('settingsForm.error.required')
    expect(errors.partitaIVA).toBe('settingsForm.error.vatNumber')
    expect(errors.codiceFiscale).toBe('settingsForm.error.taxCode')
    expect(errors.indirizzo).toBe('settingsForm.error.required')
    expect(errors.cap).toBe('settingsForm.error.postalCode')
    expect(errors.citta).toBe('settingsForm.error.required')
    expect(errors.provincia).toBe('settingsForm.error.province')
  })

  it('checks email and PEC only when they are filled in', () => {
    expect(errorsOf({ ...valid, email: '', pec: '' })).toEqual({})

    expect(errorsOf({ ...valid, email: 'no', pec: 'no' })).toEqual({
      email: 'settingsForm.error.email',
      pec: 'settingsForm.error.pec',
    })
  })

  it('limits the legal text to the FatturaPA length', () => {
    expect(errorsOf({ ...valid, dicituraRegime: 'x'.repeat(LEGAL_TEXT_MAX) })).toEqual({})

    expect(errorsOf({ ...valid, dicituraRegime: 'x'.repeat(LEGAL_TEXT_MAX + 1) })).toEqual({
      dicituraRegime: 'settingsForm.error.legalText',
    })
  })

  it('turns number fields into numbers', () => {
    const result = settingsSchema.parse({ ...valid, percentualeRivalsaInps: '4', sogliaBollo: '77.47', importoBollo: 2 })

    expect(result.percentualeRivalsaInps).toBe(4)
    expect(result.sogliaBollo).toBe(77.47)
    expect(result.importoBollo).toBe(2)
  })

  it('requires the stamp duty amounts when stamp duty is on (bug 22)', () => {
    expect(errorsOf({ ...valid, sogliaBollo: '', importoBollo: '' })).toEqual({
      sogliaBollo: 'settingsForm.error.amount',
      importoBollo: 'settingsForm.error.amount',
    })

    expect(errorsOf({ ...valid, sogliaBollo: -1 })).toEqual({ sogliaBollo: 'settingsForm.error.amount' })
  })

  it('requires a percent from 0 to 100 when the INPS charge is on', () => {
    expect(errorsOf({ ...valid, percentualeRivalsaInps: '' })).toEqual({
      percentualeRivalsaInps: 'settingsForm.error.percent',
    })

    expect(errorsOf({ ...valid, percentualeRivalsaInps: 101 })).toEqual({
      percentualeRivalsaInps: 'settingsForm.error.percent',
    })
  })

  it('skips the amounts of a switched-off option', () => {
    expect(
      errorsOf({
        ...valid,
        applicaRivalsaInps: false,
        percentualeRivalsaInps: '',
        applicaMarcaDaBollo: false,
        sogliaBollo: '',
        importoBollo: '',
      }),
    ).toEqual({})
  })
})
