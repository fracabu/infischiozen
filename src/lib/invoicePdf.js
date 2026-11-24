/**
 * @module lib/invoicePdf
 * Courtesy copy of an invoice as a PDF, built with pdfmake. The document text
 * stays Italian: it is the invoice content.
 */
import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'
import { formatDate } from './format.js'
import { isStampDutyDue } from './invoiceMath.js'

// Register the pdfmake virtual fonts (the export shape differs between builds).
const vfs =
  (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) ||
  (pdfFonts && pdfFonts.vfs) ||
  (pdfFonts && pdfFonts.default && pdfFonts.default.vfs)

if (vfs) {
  pdfMake.vfs = vfs
}

/**
 * Amount as "1.234,56 €".
 *
 * @param {number|string} value
 * @returns {string}
 */
function euro(value) {
  return (
    (Number(value) || 0).toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €'
  )
}

/**
 * @param {object} client
 * @returns {string} surname and name of a person, else the company name
 */
function clientName(client) {
  if (!client) {
    return ''
  }

  if (client.tipo === 'privato') {
    return `${client.cognome || ''} ${client.nome || ''}`.trim()
  }

  return client.ragioneSociale || `${client.cognome || ''} ${client.nome || ''}`.trim()
}

/**
 * Build the courtesy-copy PDF of an invoice and download it.
 *
 * @param {object} invoice
 * @param {object} settings - seller data
 */
export async function downloadInvoicePdf(invoice, settings) {
  const seller = settings || {}
  const client = invoice.clienteSnapshot || {}

  // Logo from Settings. With no logo the heading is the seller name.
  const logo = seller.logoBase64
  const heading = (seller.ragioneSociale || `${seller.nome || ''} ${seller.cognome || ''}`).trim()

  const number = invoice.numero ? `${invoice.numero}/${invoice.anno}` : 'Bozza'

  // Seller column.
  const sellerColumn = [
    { text: `${seller.cognome || ''} ${seller.nome || ''}`.trim(), style: 'bigName' },
    { text: seller.indirizzo || '', style: 'dataLine' },
    { text: `${seller.cap || ''} ${seller.citta || ''} (${seller.provincia || ''})`, style: 'dataLine' },
    { text: `C.F.: ${seller.codiceFiscale || ''}`, style: 'dataLine' },
    { text: `P.IVA: ${seller.partitaIVA || ''}`, style: 'dataLine' }
  ]

  // Recipient column, aligned right.
  const recipientColumn = [
    { text: 'Destinatario:', style: 'dataLineRight' },
    { text: clientName(client), style: 'bigNameRight' },
    { text: client.indirizzo || '', style: 'dataLineRight' },
    { text: `${client.cap || ''} ${client.citta || ''} (${client.provincia || ''})`, style: 'dataLineRight' }
  ]

  if (client.codiceFiscale) {
    recipientColumn.push({ text: `C.F.: ${client.codiceFiscale}`, style: 'dataLineRight' })
  }

  if (client.partitaIVA) {
    recipientColumn.push({ text: `P.IVA: ${client.partitaIVA}`, style: 'dataLineRight' })
  }

  // Lines table: description and amount.
  const lineRows = (invoice.righe || []).map((line) => {
    const quantity = Number(line.quantita) || 0
    const description = quantity > 1 ? `${line.descrizione} (q.tà ${quantity})` : line.descrizione

    return [
      { text: description, style: 'descriptionCell' },
      { text: euro(line.totaleRiga ?? quantity * (Number(line.prezzoUnitario) || 0)), style: 'amountCell' }
    ]
  })

  // Amount summary.
  const summary = []

  if (invoice.rivalsaInps) {
    summary.push({
      columns: [
        { text: '', width: '*' },
        { text: `Totale prestazioni: ${euro(invoice.imponibile)}`, width: 'auto', style: 'summaryLine' }
      ],
      margin: [0, 8, 0, 0]
    }, {
      columns: [
        { text: `Rivalsa ${invoice.percentualeRivalsa || seller.percentualeRivalsaInps || 4}% GS INPS su ${euro(invoice.imponibile)}`, width: '*', style: 'summaryLabel' },
        { text: euro(invoice.rivalsaInps), width: 'auto', style: 'summaryLine' }
      ],
      margin: [0, 4, 0, 0]
    })
  }

  if (invoice.marcaDaBollo) {
    summary.push({
      columns: [
        { text: 'Marca da bollo', width: '*', style: 'summaryLabel' },
        { text: euro(invoice.marcaDaBollo), width: 'auto', style: 'summaryLine' }
      ],
      margin: [0, 4, 0, 0]
    })
  }

  summary.push({
    columns: [
      { text: '', width: '*' },
      { text: `Totale: ${euro(invoice.totale)}`, width: 'auto', style: 'bigTotal' }
    ],
    margin: [0, 18, 0, 0]
  })

  // Footer: payment and notes.
  const paymentLines = []
  const paymentMethod = (invoice.modalitaPagamento || '').toLowerCase()

  if (paymentMethod.includes('paypal')) {
    paymentLines.push(
      { text: 'PayPal', style: 'dataLine' },
      { text: `E-mail: ${seller.email || ''}`, style: 'dataLine' },
    )
  } else if (paymentMethod.includes('bonifico')) {
    paymentLines.push(
      { text: 'Bonifico', style: 'dataLine' },
      { text: `Intestato a: ${seller.intestatarioIban || (seller.nome + ' ' + seller.cognome)}`, style: 'dataLine' },
      { text: `IBAN: ${seller.iban || ''}`, style: 'dataLine' },
    )
  } else {
    // An em dash when the invoice has no payment method.
    paymentLines.push({ text: invoice.modalitaPagamento || '\u{2014}', style: 'dataLine' })
  }

  if (invoice.scadenzaPagamento) {
    paymentLines.push({ text: `Scadenza: ${formatDate(invoice.scadenzaPagamento)}`, style: 'dataLine' })
  }

  const noteLines = [{ text: seller.dicituraRegime || '', style: 'dataLine' }]

  if ((invoice.marcaDaBollo || isStampDutyDue(invoice, seller)) && seller.testoBollo) {
    noteLines.push({ text: seller.testoBollo, style: 'dataLine', margin: [0, 6, 0, 0] })
  }

  if (invoice.note) {
    noteLines.push({ text: invoice.note, style: 'dataLine', margin: [0, 6, 0, 0] })
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#1a1a1a' },
    content: [
      // Header: logo, number and date.
      {
        columns: [
          logo
            ? { image: logo, width: 150, margin: [0, 4, 0, 0] }
            : { text: heading.toUpperCase(), bold: true, fontSize: 16 },
          {
            text: `Fattura # ${number}    ${formatDate(invoice.data)}`,
            alignment: 'right',
            fontSize: 13,
            margin: [0, 10, 0, 0]
          }
        ]
      },
      { text: 'Copia di cortesia', style: 'smallGray', margin: [0, 22, 0, 0] },
      { text: 'Questo documento non ha alcuna valenza fiscale', style: 'smallGray' },

      // Seller and recipient, in two columns.
      {
        columns: [
          { stack: sellerColumn, width: '*' },
          { stack: recipientColumn, width: '*' }
        ],
        margin: [0, 30, 0, 0]
      },

      // Lines table.
      {
        margin: [0, 36, 0, 0],
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'Descrizione', style: 'columnHeader' },
              { text: 'Importo', style: 'columnHeaderRight' }
            ],
            ...lineRows
          ]
        },
        layout: {
          hLineWidth: (i, node) => ([0, 1, node.table.body.length].includes(i) ? 0.8 : 0.4),
          vLineWidth: () => 0,
          hLineColor: () => '#d0d0cc',
          paddingTop: () => 6,
          paddingBottom: () => 6
        }
      },

      ...summary,

      // Footer.
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Modalità di pagamento', style: 'footerHeader' },
              ...paymentLines
            ]
          },
          {
            width: '*',
            stack: [{ text: 'Note', style: 'footerHeader' }, ...noteLines]
          }
        ],
        margin: [0, 60, 0, 0]
      }
    ],
    styles: {
      smallGray: { fontSize: 9, color: '#8a8a86' },
      bigName: { fontSize: 18, bold: false, margin: [0, 0, 0, 6] },
      bigNameRight: { fontSize: 14, alignment: 'right', margin: [0, 2, 0, 4] },
      dataLine: { fontSize: 10, margin: [0, 1, 0, 1] },
      dataLineRight: { fontSize: 10, alignment: 'right', margin: [0, 1, 0, 1] },
      columnHeader: { bold: true, fontSize: 11 },
      columnHeaderRight: { bold: true, fontSize: 11, alignment: 'right' },
      descriptionCell: { fontSize: 10 },
      amountCell: { fontSize: 10, alignment: 'right' },
      summaryLabel: { fontSize: 10, color: '#555' },
      summaryLine: { fontSize: 10, alignment: 'right' },
      bigTotal: { fontSize: 16, alignment: 'right' },
      footerHeader: { bold: true, fontSize: 10, margin: [0, 0, 0, 6] }
    }
  }

  const fileName = `Fattura ${invoice.numero || 'bozza'}-${invoice.anno || ''} - ${clientName(client)}.pdf`.trim()
  pdfMake.createPdf(docDefinition).download(fileName)
}
