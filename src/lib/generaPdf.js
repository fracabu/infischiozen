import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'
import { formatData } from './format.js'
import { bolloDovuto } from './calcoloFattura.js'

// Registra i font virtuali di pdfmake (compatibile con diverse build).
const vfs =
  (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) ||
  (pdfFonts && pdfFonts.vfs) ||
  (pdfFonts && pdfFonts.default && pdfFonts.default.vfs)

if (vfs) {
  pdfMake.vfs = vfs
}

// Importo in formato "1.234,56 €"
function euro(n) {
  return (
    (Number(n) || 0).toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €'
  )
}

function nomeCliente(c) {
  if (!c) {
    return ''
  }

  if (c.tipo === 'privato') {
    return `${c.cognome || ''} ${c.nome || ''}`.trim()
  }

  return c.ragioneSociale || `${c.cognome || ''} ${c.nome || ''}`.trim()
}

/**
 * Genera e scarica il PDF "copia di cortesia" della fattura.
 */
export async function generaPdf(fattura, impostazioni) {
  const imp = impostazioni || {}
  const cliente = fattura.clienteSnapshot || {}

  // Logo caricato in Impostazioni; senza logo l'intestazione e' il nome.
  const logo = imp.logoBase64 || null
  const intestazione = (imp.ragioneSociale || `${imp.nome || ''} ${imp.cognome || ''}`).trim()

  const numero = fattura.numero ? `${fattura.numero}/${fattura.anno}` : 'Bozza'

  // Colonna cedente.
  const cedente = [
    { text: `${imp.cognome || ''} ${imp.nome || ''}`.trim(), style: 'nomeGrande' },
    { text: imp.indirizzo || '', style: 'datiRiga' },
    { text: `${imp.cap || ''} ${imp.citta || ''} (${imp.provincia || ''})`, style: 'datiRiga' },
    { text: `C.F.: ${imp.codiceFiscale || ''}`, style: 'datiRiga' },
    { text: `P.IVA: ${imp.partitaIVA || ''}`, style: 'datiRiga' }
  ]

  // Colonna destinatario (allineata a destra).
  const dest = [
    { text: 'Destinatario:', style: 'datiRigaR' },
    { text: nomeCliente(cliente), style: 'nomeGrandeR' },
    { text: cliente.indirizzo || '', style: 'datiRigaR' },
    { text: `${cliente.cap || ''} ${cliente.citta || ''} (${cliente.provincia || ''})`, style: 'datiRigaR' }
  ]

  if (cliente.codiceFiscale) {
    dest.push({ text: `C.F.: ${cliente.codiceFiscale}`, style: 'datiRigaR' })
  }

  if (cliente.partitaIVA) {
    dest.push({ text: `P.IVA: ${cliente.partitaIVA}`, style: 'datiRigaR' })
  }

  // Tabella righe: Descrizione / Importo.
  const corpoRighe = (fattura.righe || []).map((r) => {
    const q = Number(r.quantita) || 0
    const descr = q > 1 ? `${r.descrizione} (q.tà ${q})` : r.descrizione

    return [
      { text: descr, style: 'cellaDescr' },
      { text: euro(r.totaleRiga != null ? r.totaleRiga : q * (Number(r.prezzoUnitario) || 0)), style: 'cellaImporto' }
    ]
  })

  // Riepilogo importi.
  const riepilogo = []

  if (fattura.rivalsaInps) {
    riepilogo.push({
      columns: [
        { text: '', width: '*' },
        { text: `Totale prestazioni: ${euro(fattura.imponibile)}`, width: 'auto', style: 'riepRiga' }
      ],
      margin: [0, 8, 0, 0]
    })

    riepilogo.push({
      columns: [
        { text: `Rivalsa ${fattura.percentualeRivalsa || imp.percentualeRivalsaInps || 4}% GS INPS su ${euro(fattura.imponibile)}`, width: '*', style: 'riepEtichetta' },
        { text: euro(fattura.rivalsaInps), width: 'auto', style: 'riepRiga' }
      ],
      margin: [0, 4, 0, 0]
    })
  }

  if (fattura.marcaDaBollo) {
    riepilogo.push({
      columns: [
        { text: 'Marca da bollo', width: '*', style: 'riepEtichetta' },
        { text: euro(fattura.marcaDaBollo), width: 'auto', style: 'riepRiga' }
      ],
      margin: [0, 4, 0, 0]
    })
  }

  riepilogo.push({
    columns: [
      { text: '', width: '*' },
      { text: `Totale: ${euro(fattura.totale)}`, width: 'auto', style: 'totaleGrande' }
    ],
    margin: [0, 18, 0, 0]
  })

  // Footer: pagamento + note.
  const pagamentoLines = []

  if ((fattura.modalitaPagamento || '').toLowerCase().includes('paypal')) {
    pagamentoLines.push({ text: 'PayPal', style: 'datiRiga' })
    pagamentoLines.push({ text: `E-mail: ${imp.email || ''}`, style: 'datiRiga' })
  } else if ((fattura.modalitaPagamento || '').toLowerCase().includes('bonifico')) {
    pagamentoLines.push({ text: 'Bonifico', style: 'datiRiga' })
    pagamentoLines.push({ text: `Intestato a: ${imp.intestatarioIban || (imp.nome + ' ' + imp.cognome)}`, style: 'datiRiga' })
    pagamentoLines.push({ text: `IBAN: ${imp.iban || ''}`, style: 'datiRiga' })
  } else {
    pagamentoLines.push({ text: fattura.modalitaPagamento || '—', style: 'datiRiga' })
  }

  if (fattura.scadenzaPagamento) {
    pagamentoLines.push({ text: `Scadenza: ${formatData(fattura.scadenzaPagamento)}`, style: 'datiRiga' })
  }

  const noteLines = [{ text: imp.dicituraRegime || '', style: 'datiRiga' }]

  if ((fattura.marcaDaBollo || bolloDovuto(fattura, imp)) && imp.testoBollo) {
    noteLines.push({ text: imp.testoBollo, style: 'datiRiga', margin: [0, 6, 0, 0] })
  }

  if (fattura.note) {
    noteLines.push({ text: fattura.note, style: 'datiRiga', margin: [0, 6, 0, 0] })
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#1a1a1a' },
    content: [
      // Header: logo + numero/data
      {
        columns: [
          logo
            ? { image: logo, width: 150, margin: [0, 4, 0, 0] }
            : { text: intestazione.toUpperCase(), bold: true, fontSize: 16 },
          {
            text: `Fattura # ${numero}    ${formatData(fattura.data)}`,
            alignment: 'right',
            fontSize: 13,
            margin: [0, 10, 0, 0]
          }
        ]
      },
      { text: 'Copia di cortesia', style: 'piccoloGrigio', margin: [0, 22, 0, 0] },
      { text: 'Questo documento non ha alcuna valenza fiscale', style: 'piccoloGrigio' },

      // Due colonne anagrafiche
      {
        columns: [
          { stack: cedente, width: '*' },
          { stack: dest, width: '*' }
        ],
        margin: [0, 30, 0, 0]
      },

      // Tabella righe
      {
        margin: [0, 36, 0, 0],
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Descrizione', style: 'intestColonna' },
              { text: 'Importo', style: 'intestColonnaR' }
            ],
            ...corpoRighe
          ]
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.4),
          vLineWidth: () => 0,
          hLineColor: () => '#d0d0cc',
          paddingTop: () => 6,
          paddingBottom: () => 6
        }
      },

      ...riepilogo,

      // Footer
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Modalità di pagamento', style: 'intestFooter' },
              ...pagamentoLines
            ]
          },
          {
            width: '*',
            stack: [{ text: 'Note', style: 'intestFooter' }, ...noteLines]
          }
        ],
        margin: [0, 60, 0, 0]
      }
    ],
    styles: {
      piccoloGrigio: { fontSize: 9, color: '#8a8a86' },
      nomeGrande: { fontSize: 18, bold: false, margin: [0, 0, 0, 6] },
      nomeGrandeR: { fontSize: 14, alignment: 'right', margin: [0, 2, 0, 4] },
      datiRiga: { fontSize: 10, margin: [0, 1, 0, 1] },
      datiRigaR: { fontSize: 10, alignment: 'right', margin: [0, 1, 0, 1] },
      intestColonna: { bold: true, fontSize: 11 },
      intestColonnaR: { bold: true, fontSize: 11, alignment: 'right' },
      cellaDescr: { fontSize: 10 },
      cellaImporto: { fontSize: 10, alignment: 'right' },
      riepEtichetta: { fontSize: 10, color: '#555' },
      riepRiga: { fontSize: 10, alignment: 'right' },
      totaleGrande: { fontSize: 16, alignment: 'right' },
      intestFooter: { bold: true, fontSize: 10, margin: [0, 0, 0, 6] }
    }
  }

  const nomeFile = `Fattura ${fattura.numero || 'bozza'}-${fattura.anno || ''} - ${nomeCliente(cliente)}.pdf`.trim()
  pdfMake.createPdf(docDefinition).download(nomeFile)
}
