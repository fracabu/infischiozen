import { describe, it, expect } from 'vitest'
import { generaXml, validaCampiXml, nomeFileXml } from '../src/lib/generaXml.js'
import { calcolaFattura } from '../src/lib/calcoloFattura.js'
import { IMPOSTAZIONI_DEFAULT } from '../src/data/impostazioniDefault.js'

// Cedente e clienti inventati.
const IMP = {
  ...IMPOSTAZIONI_DEFAULT,
  nome: 'Mario', cognome: 'Rossi',
  codiceFiscale: 'RSSMRA80A01H501U', partitaIVA: '12345678903',
  indirizzo: 'Via di Prova 1', cap: '00100', citta: 'Roma', provincia: 'RM',
  iban: 'IT00X0000000000000000000000',
}

const PRIVATO = {
  tipo: 'privato', nome: 'Anna', cognome: 'Bianchi', codiceFiscale: 'BNCNNA90A41F205X',
  indirizzo: 'Via Esempio 2', cap: '20100', citta: 'Milano', provincia: 'MI',
  codiceDestinatario: '0000000',
}

const AZIENDA = {
  tipo: 'azienda', ragioneSociale: 'Esempio & Figli S.r.l.', partitaIVA: '12345678903',
  indirizzo: 'Via Esempio 3', cap: '10100', citta: 'Torino', provincia: 'TO',
  codiceDestinatario: 'ABC1234',
}

function fattura(righe, cliente = PRIVATO, imp = IMP) {
  const calcolo = calcolaFattura(righe, imp)

  return {
    numero: 7, anno: 2026, data: '2026-03-15',
    clienteSnapshot: cliente, righe,
    percentualeRivalsa: imp.percentualeRivalsaInps,
    ...calcolo,
  }
}

// Estrae tutti i valori di un tag.
const valori = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map((m) => m[1])
const somma = (arr) => Math.round(arr.reduce((a, v) => a + Number(v), 0) * 100) / 100

describe('generaXml', () => {
  it('produce un FPR12 forfettario con N2.2 e RF19', () => {
    const xml = generaXml(fattura([{ descrizione: 'Consulenza', quantita: 1, prezzoUnitario: 50 }]), IMP)
    expect(xml).toContain('versione="FPR12"')
    expect(xml).toContain('<RegimeFiscale>RF19</RegimeFiscale>')
    expect(xml).toContain('<TipoDocumento>TD01</TipoDocumento>')
    expect(xml).toContain('<Data>2026-03-15</Data>')
    expect(valori(xml, 'Natura').every((n) => n === 'N2.2')).toBe(true)
  })

  it('il totale del documento è la somma delle righe e dei riepiloghi', () => {
    const casi = [
      [{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }],          // senza bollo
      [{ descrizione: 'B', quantita: 2, prezzoUnitario: 100 }],         // con bollo addebitato
      [{ descrizione: 'C', quantita: 1, prezzoUnitario: 75 }],          // bollo per effetto della rivalsa
    ]

    for (const righe of casi) {
      const f = fattura(righe)
      const xml = generaXml(f, IMP)
      const totale = Number(valori(xml, 'ImportoTotaleDocumento')[0])
      expect(totale).toBe(f.totale)
      expect(somma(valori(xml, 'PrezzoTotale'))).toBe(totale)
      expect(somma(valori(xml, 'ImponibileImporto'))).toBe(totale)
    }
  })

  it('bollo addebitato: riga N1, riepilogo N1 e DatiBollo', () => {
    const xml = generaXml(fattura([{ descrizione: 'B', quantita: 1, prezzoUnitario: 200 }]), IMP)
    expect(xml).toContain('<Descrizione>Rimborso imposta di bollo</Descrizione>')
    expect(valori(xml, 'Natura').filter((n) => n === 'N1')).toHaveLength(2)
    expect(xml).toMatch(/<DatiBollo>\s*<BolloVirtuale>SI<\/BolloVirtuale>\s*<ImportoBollo>2\.00<\/ImportoBollo>/)
  })

  it('bollo a carico del prestatore: DatiBollo c\'è, la riga no (bug #3)', () => {
    const imp = { ...IMP, addebitaBolloAlCliente: false }
    const xml = generaXml(fattura([{ descrizione: 'B', quantita: 1, prezzoUnitario: 200 }], PRIVATO, imp), imp)
    expect(xml).toContain('<DatiBollo>')
    expect(xml).not.toContain('Rimborso imposta di bollo')
  })

  it('sotto soglia niente DatiBollo', () => {
    const xml = generaXml(fattura([{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]), IMP)
    expect(xml).not.toContain('<DatiBollo>')
  })

  it('privato con Nome/Cognome, azienda con Denominazione e P.IVA', () => {
    const righe = [{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]
    const xmlP = generaXml(fattura(righe, PRIVATO), IMP)
    expect(xmlP).toContain('<Nome>Anna</Nome>')
    expect(xmlP).toContain('<CodiceFiscale>BNCNNA90A41F205X</CodiceFiscale>')

    const xmlA = generaXml(fattura(righe, AZIENDA), IMP)
    expect(xmlA).toContain('<CodiceDestinatario>ABC1234</CodiceDestinatario>')
    expect(xmlA).toMatch(/<CessionarioCommittente>[\s\S]*<IdCodice>12345678903<\/IdCodice>/)
  })

  it('fa l\'escape dei caratteri speciali', () => {
    const xml = generaXml(fattura([{ descrizione: 'Corso <base> & "avanzato"', quantita: 1, prezzoUnitario: 10 }], AZIENDA), IMP)
    expect(xml).toContain('Esempio &amp; Figli S.r.l.')
    expect(xml).toContain('Corso &lt;base&gt; &amp; &quot;avanzato&quot;')
  })

  it('la dicitura di legge va in RiferimentoNormativo', () => {
    const xml = generaXml(fattura([{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]), IMP)
    // L'apostrofo di "d'acconto" esce come &apos;: è l'escape corretto, un
    // parser XML lo rilegge come '. Si confronta il testo decodificato.
    const testo = valori(xml, 'RiferimentoNormativo')[0].replaceAll('&apos;', "'")
    expect(testo).toBe(IMP.dicituraRegime)
  })
})

describe('validaCampiXml', () => {
  const righe = [{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]

  it('una fattura completa non ha errori', () => {
    expect(validaCampiXml(fattura(righe), IMP)).toEqual([])
  })

  it('un privato con 0000000 senza PEC è valido (bug #2)', () => {
    expect(validaCampiXml(fattura(righe, { ...PRIVATO, pec: '' }), IMP)).toEqual([])
  })

  it('segnala bozza senza numero, cedente incompleto, cliente senza CF/P.IVA', () => {
    const f = { ...fattura(righe, { ...PRIVATO, codiceFiscale: '' }), numero: null }
    const errori = validaCampiXml(f, { ...IMP, partitaIVA: '' })
    expect(errori).toHaveLength(3)
  })

  it('segnala la dicitura oltre i 100 caratteri (bug #16)', () => {
    const errori = validaCampiXml(fattura(righe), { ...IMP, dicituraRegime: 'x'.repeat(101) })
    expect(errori.join(' ')).toMatch(/100 caratteri/)
  })

  it('segnala la fattura senza righe', () => {
    expect(validaCampiXml({ ...fattura([]), righe: [] }, IMP).join(' ')).toMatch(/righe/)
  })
})

describe('nomeFileXml', () => {
  it('ha la forma IT{PIVA}_{progressivo di 5 caratteri}.xml', () => {
    expect(nomeFileXml(fattura([]), IMP)).toMatch(/^IT12345678903_[0-9A-Z]{5}\.xml$/)
  })

  it('numeri diversi danno progressivi diversi', () => {
    const a = nomeFileXml({ anno: 2026, numero: 1 }, IMP)
    const b = nomeFileXml({ anno: 2026, numero: 2 }, IMP)
    expect(a).not.toBe(b)
  })
})
