import { describe, it, expect } from 'vitest'
import { calcolaFattura, bolloDovuto, totaleRiga } from '../src/lib/calcoloFattura.js'
import { IMPOSTAZIONI_DEFAULT } from '../src/data/impostazioniDefault.js'

const base = { ...IMPOSTAZIONI_DEFAULT }
const riga = (prezzoUnitario, quantita = 1) => ({ quantita, prezzoUnitario })

describe('calcolaFattura: rivalsa aggiunta (default)', () => {
  it('aggiunge il 4% sopra il prezzo', () => {
    const r = calcolaFattura([riga(29)], base)
    expect(r).toEqual({ imponibile: 29, rivalsaInps: 1.16, marcaDaBollo: 0, totale: 30.16 })
  })

  it('somma più righe con quantità', () => {
    const r = calcolaFattura([riga(10, 3), riga(5.5, 2)], base)
    expect(r.imponibile).toBe(41)
    expect(r.rivalsaInps).toBe(1.64)
  })

  it('senza rivalsa il totale è l\'imponibile', () => {
    const r = calcolaFattura([riga(50)], { ...base, applicaRivalsaInps: false })
    expect(r).toEqual({ imponibile: 50, rivalsaInps: 0, marcaDaBollo: 0, totale: 50 })
  })
})

describe('calcolaFattura: prezzi lordi (rivalsa scorporata)', () => {
  it('scorpora la rivalsa e il totale resta il prezzo', () => {
    const r = calcolaFattura([riga(30)], { ...base, prezziLordi: true })
    expect(r).toEqual({ imponibile: 28.85, rivalsaInps: 1.15, marcaDaBollo: 0, totale: 30 })
  })

  it('imponibile + rivalsa torna sempre al prezzo, anche con arrotondamenti', () => {
    for (const p of [0.01, 1, 9.99, 33.33, 77.77, 123.45, 999.99]) {
      const r = calcolaFattura([riga(p)], { ...base, prezziLordi: true })
      expect(Math.round((r.imponibile + r.rivalsaInps) * 100)).toBe(Math.round(p * 100))
    }
  })
})

describe('marca da bollo', () => {
  it('non è dovuta fino a 77,47 € compresi', () => {
    const r = calcolaFattura([riga(77.47)], { ...base, applicaRivalsaInps: false })
    expect(r.marcaDaBollo).toBe(0)
  })

  it('è dovuta sopra 77,47 € e entra nel totale', () => {
    const r = calcolaFattura([riga(77.48)], { ...base, applicaRivalsaInps: false })
    expect(r.marcaDaBollo).toBe(2)
    expect(r.totale).toBe(79.48)
  })

  it('la soglia conta anche la rivalsa (bug #5 di REVIEW.md)', () => {
    // 75 + 3 di rivalsa = 78 > 77,47: il bollo è dovuto anche se 75 < soglia
    const r = calcolaFattura([riga(75)], base)
    expect(r.rivalsaInps).toBe(3)
    expect(r.marcaDaBollo).toBe(2)
    expect(r.totale).toBe(80)
  })

  it('se resta a carico del prestatore non entra nel totale ma resta dovuto', () => {
    const imp = { ...base, addebitaBolloAlCliente: false }
    const r = calcolaFattura([riga(100)], imp)
    expect(r.marcaDaBollo).toBe(0)
    expect(r.totale).toBe(104)
    expect(bolloDovuto(r, imp)).toBe(true)
  })

  it('disattivato da impostazioni non è mai dovuto', () => {
    expect(bolloDovuto({ imponibile: 1000, rivalsaInps: 40 }, { ...base, applicaMarcaDaBollo: false })).toBe(false)
  })
})

describe('casi limite', () => {
  it('nessuna riga dà tutto zero', () => {
    expect(calcolaFattura([], base)).toEqual({ imponibile: 0, rivalsaInps: 0, marcaDaBollo: 0, totale: 0 })
    expect(calcolaFattura(null, base).totale).toBe(0)
  })

  it('valori non numerici valgono zero', () => {
    expect(totaleRiga({ quantita: 'x', prezzoUnitario: 10 })).toBe(0)
  })

  it('niente errori di virgola mobile', () => {
    expect(totaleRiga({ quantita: 3, prezzoUnitario: 0.1 })).toBe(0.3)
  })
})
