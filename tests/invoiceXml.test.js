import { describe, it, expect } from 'vitest'
import { buildInvoiceXml, checkXmlFields, xmlFileName } from '../src/lib/invoiceXml.js'
import { computeInvoice } from '../src/lib/invoiceMath.js'
import { DEFAULT_SETTINGS } from '../src/data/defaultSettings.js'

// Invented seller and clients.
const SELLER = {
  ...DEFAULT_SETTINGS,
  nome: 'Mario', cognome: 'Rossi',
  codiceFiscale: 'RSSMRA80A01H501U', partitaIVA: '12345678903',
  indirizzo: 'Via di Prova 1', cap: '00100', citta: 'Roma', provincia: 'RM',
  iban: 'IT00X0000000000000000000000',
}

const PERSON = {
  tipo: 'privato', nome: 'Anna', cognome: 'Bianchi', codiceFiscale: 'BNCNNA90A41F205X',
  indirizzo: 'Via Esempio 2', cap: '20100', citta: 'Milano', provincia: 'MI',
  codiceDestinatario: '0000000',
}

const COMPANY = {
  tipo: 'azienda', ragioneSociale: 'Esempio & Figli S.r.l.', partitaIVA: '12345678903',
  indirizzo: 'Via Esempio 3', cap: '10100', citta: 'Torino', provincia: 'TO',
  codiceDestinatario: 'ABC1234',
}

function invoice(lines, client = PERSON, settings = SELLER) {
  const amounts = computeInvoice(lines, settings)

  return {
    numero: 7, anno: 2026, data: '2026-03-15',
    clienteSnapshot: client, righe: lines,
    percentualeRivalsa: settings.percentualeRivalsaInps,
    ...amounts,
  }
}

// All the values of one tag.
const values = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map((m) => m[1])
const sum = (arr) => Math.round(arr.reduce((a, v) => a + Number(v), 0) * 100) / 100

describe('invoiceXml', () => {
  it('builds a flat-rate FPR12 with N2.2 and RF19', () => {
    const xml = buildInvoiceXml(invoice([{ descrizione: 'Consulenza', quantita: 1, prezzoUnitario: 50 }]), SELLER)
    expect(xml).toContain('versione="FPR12"')
    expect(xml).toContain('<RegimeFiscale>RF19</RegimeFiscale>')
    expect(xml).toContain('<TipoDocumento>TD01</TipoDocumento>')
    expect(xml).toContain('<Data>2026-03-15</Data>')
    expect(values(xml, 'Natura').every((n) => n === 'N2.2')).toBe(true)
  })

  it('the document total is the sum of the lines and of the summaries', () => {
    const cases = [
      [{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }],          // no stamp duty
      [{ descrizione: 'B', quantita: 2, prezzoUnitario: 100 }],         // stamp duty charged
      [{ descrizione: 'C', quantita: 1, prezzoUnitario: 75 }],          // stamp duty due to the INPS charge
    ]

    for (const lines of cases) {
      const document = invoice(lines)
      const xml = buildInvoiceXml(document, SELLER)
      const total = Number(values(xml, 'ImportoTotaleDocumento')[0])
      expect(total).toBe(document.totale)
      expect(sum(values(xml, 'PrezzoTotale'))).toBe(total)
      expect(sum(values(xml, 'ImponibileImporto'))).toBe(total)
    }
  })

  it('stamp duty charged: N1 line, N1 summary and DatiBollo', () => {
    const xml = buildInvoiceXml(invoice([{ descrizione: 'B', quantita: 1, prezzoUnitario: 200 }]), SELLER)
    expect(xml).toContain('<Descrizione>Rimborso imposta di bollo</Descrizione>')
    expect(values(xml, 'Natura').filter((n) => n === 'N1')).toHaveLength(2)
    expect(xml).toMatch(/<DatiBollo>\s*<BolloVirtuale>SI<\/BolloVirtuale>\s*<ImportoBollo>2\.00<\/ImportoBollo>/)
  })

  it('stamp duty paid by the seller: DatiBollo yes, line no (bug #3)', () => {
    const settings = { ...SELLER, addebitaBolloAlCliente: false }
    const xml = buildInvoiceXml(invoice([{ descrizione: 'B', quantita: 1, prezzoUnitario: 200 }], PERSON, settings), settings)
    expect(xml).toContain('<DatiBollo>')
    expect(xml).not.toContain('Rimborso imposta di bollo')
  })

  it('below the threshold there is no DatiBollo', () => {
    const xml = buildInvoiceXml(invoice([{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]), SELLER)
    expect(xml).not.toContain('<DatiBollo>')
  })

  it('a person with Nome/Cognome, a company with Denominazione and VAT number', () => {
    const lines = [{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]
    const xmlP = buildInvoiceXml(invoice(lines, PERSON), SELLER)
    expect(xmlP).toContain('<Nome>Anna</Nome>')
    expect(xmlP).toContain('<CodiceFiscale>BNCNNA90A41F205X</CodiceFiscale>')

    const xmlA = buildInvoiceXml(invoice(lines, COMPANY), SELLER)
    expect(xmlA).toContain('<CodiceDestinatario>ABC1234</CodiceDestinatario>')
    expect(xmlA).toMatch(/<CessionarioCommittente>[\s\S]*<IdCodice>12345678903<\/IdCodice>/)
  })

  it('escapes special characters', () => {
    const xml = buildInvoiceXml(invoice([{ descrizione: 'Corso <base> & "avanzato"', quantita: 1, prezzoUnitario: 10 }], COMPANY), SELLER)
    expect(xml).toContain('Esempio &amp; Figli S.r.l.')
    expect(xml).toContain('Corso &lt;base&gt; &amp; &quot;avanzato&quot;')
  })

  it('the legal text goes into RiferimentoNormativo', () => {
    const xml = buildInvoiceXml(invoice([{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]), SELLER)
    // The apostrophe of "d'acconto" comes out as &apos;: that is the correct
    // escape, an XML parser reads it back as '. Compare the decoded text.
    const text = values(xml, 'RiferimentoNormativo')[0].replaceAll('&apos;', "'")
    expect(text).toBe(SELLER.dicituraRegime)
  })
})

describe('checkXmlFields', () => {
  const lines = [{ descrizione: 'A', quantita: 1, prezzoUnitario: 50 }]

  it('a complete invoice has no errors', () => {
    expect(checkXmlFields(invoice(lines), SELLER)).toEqual([])
  })

  it('a person with 0000000 and no PEC is valid (bug #2)', () => {
    expect(checkXmlFields(invoice(lines, { ...PERSON, pec: '' }), SELLER)).toEqual([])
  })

  it('reports a draft with no number, an incomplete seller, a client with no tax code or VAT number', () => {
    const draft = { ...invoice(lines, { ...PERSON, codiceFiscale: '' }), numero: null }
    const errors = checkXmlFields(draft, { ...SELLER, partitaIVA: '' })
    expect(errors).toHaveLength(3)
  })

  it('reports a legal text over 100 characters (bug #16)', () => {
    const errors = checkXmlFields(invoice(lines), { ...SELLER, dicituraRegime: 'x'.repeat(101) })
    expect(errors.join(' ')).toMatch(/100 caratteri/)
  })

  it('reports an invoice with no lines', () => {
    expect(checkXmlFields({ ...invoice([]), righe: [] }, SELLER).join(' ')).toMatch(/righe/)
  })
})

describe('xmlFileName', () => {
  it('has the form IT{VAT number}_{5-character send number}.xml', () => {
    expect(xmlFileName(invoice([]), SELLER)).toMatch(/^IT12345678903_[0-9A-Z]{5}\.xml$/)
  })

  it('different numbers give different send numbers', () => {
    const a = xmlFileName({ anno: 2026, numero: 1 }, SELLER)
    const b = xmlFileName({ anno: 2026, numero: 2 }, SELLER)
    expect(a).not.toBe(b)
  })
})
