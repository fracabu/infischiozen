/**
 * @module lib/invoiceXml
 * FatturaPA 1.2 XML (FPR12) for an invoice, and the field checks that come
 * first. The check messages stay Italian: the UI shows them as they are.
 */
import { round2 } from './format.js'
import { isStampDutyDue } from './invoiceMath.js'

/**
 * Escape a text value for XML.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeXml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

/**
 * Amount with a decimal point and 2 digits.
 *
 * @param {number|string} value
 * @returns {string}
 */
function amount(value) {
  return (Number(value) || 0).toFixed(2)
}

/**
 * Send number (ProgressivoInvio): 5 base-36 characters from year and number.
 *
 * @param {object} invoice
 * @returns {string}
 */
function sendNumber(invoice) {
  const base = (Number(invoice.anno) || 0) * 100_000 + (Number(invoice.numero) || 0)

  return base.toString(36).toUpperCase().padStart(5, '0').slice(-5)
}

/**
 * Check the required fields before building the XML.
 *
 * @param {object} invoice
 * @param {object} settings - seller data
 * @returns {string[]} error messages, empty when all is correct
 */
export function checkXmlFields(invoice, settings) {
  const errors = []
  const seller = settings || {}
  const client = invoice.clienteSnapshot || {}

  if (!invoice.numero) {
    errors.push('La fattura deve essere emessa (numero assegnato).')
  }

  if (!seller.partitaIVA) {
    errors.push('Partita IVA del cedente mancante (Impostazioni).')
  }

  if (!seller.codiceFiscale) {
    errors.push('Codice fiscale del cedente mancante (Impostazioni).')
  }

  if (!seller.indirizzo || !seller.cap || !seller.citta || !seller.provincia) {
    errors.push('Indirizzo completo del cedente mancante (Impostazioni).')
  }

  if (!client.indirizzo || !client.cap || !client.citta) {
    errors.push('Indirizzo del cliente incompleto.')
  }

  if (!client.partitaIVA && !client.codiceFiscale) {
    errors.push('Il cliente deve avere Partita IVA o Codice fiscale.')
  }

  // '0000000' with no PEC is valid: it is the normal case of private clients.
  // The invoice waits for them in their tax drawer (cassetto fiscale).
  const recipientCode = (client.codiceDestinatario || '').trim()

  if (!recipientCode) {
    errors.push('Codice destinatario del cliente mancante.')
  }

  if ((seller.dicituraRegime || '').length > 100) {
    errors.push('La dicitura di legge supera i 100 caratteri ammessi (Impostazioni).')
  }

  if (!invoice.righe || invoice.righe.length === 0) {
    errors.push('La fattura non ha righe.')
  }

  return errors
}

/**
 * Build the FatturaPA 1.2 XML (FPR12 layout).
 *
 * @param {object} invoice
 * @param {object} settings - seller data
 * @returns {string} XML
 */
export function buildInvoiceXml(invoice, settings) {
  const seller = settings || {}
  const client = invoice.clienteSnapshot || {}
  const sellerCountry = (seller.nazione || 'IT').toUpperCase()
  const clientCountry = (client.nazione || 'IT').toUpperCase()

  const recipientCode = (client.codiceDestinatario || '0000000').toUpperCase()
  const recipientPec = recipientCode === '0000000' && client.pec ? `\n      <PECDestinatario>${escapeXml(client.pec)}</PECDestinatario>` : ''

  // Client identity: a company or public body uses Denominazione, a person
  // uses Nome and Cognome.
  let clientIdentity

  if (client.tipo === 'privato') {
    clientIdentity = `        <Nome>${escapeXml(client.nome)}</Nome>
        <Cognome>${escapeXml(client.cognome)}</Cognome>`
  } else {
    clientIdentity = `        <Denominazione>${escapeXml(client.ragioneSociale || (client.cognome + ' ' + client.nome).trim())}</Denominazione>`
  }

  // Client tax identifiers.
  let clientVatId = ''

  if (client.partitaIVA) {
    clientVatId = `      <IdFiscaleIVA>
        <IdPaese>${escapeXml(clientCountry)}</IdPaese>
        <IdCodice>${escapeXml(client.partitaIVA)}</IdCodice>
      </IdFiscaleIVA>\n`
  }

  const clientTaxCode = client.codiceFiscale
    ? `      <CodiceFiscale>${escapeXml(client.codiceFiscale)}</CodiceFiscale>\n`
    : ''

  // Detail lines: one for each invoice line, plus one for the INPS charge.
  let lineNumber = 0

  const lines = (invoice.righe || [])
    .map((line) => {
      lineNumber++
      const quantity = Number(line.quantita) || 0
      const unitPrice = Number(line.prezzoUnitario) || 0
      const total = line.totaleRiga != null ? Number(line.totaleRiga) : round2(quantity * unitPrice)

      return `      <DettaglioLinee>
        <NumeroLinea>${lineNumber}</NumeroLinea>
        <Descrizione>${escapeXml(line.descrizione)}</Descrizione>
        <Quantita>${amount(quantity)}</Quantita>
        <PrezzoUnitario>${amount(unitPrice)}</PrezzoUnitario>
        <PrezzoTotale>${amount(total)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
      </DettaglioLinee>`
    })
    .join('\n')

  let rivalsaLine = ''

  if (invoice.rivalsaInps && Number(invoice.rivalsaInps) > 0) {
    lineNumber++

    rivalsaLine = `\n      <DettaglioLinee>
        <NumeroLinea>${lineNumber}</NumeroLinea>
        <Descrizione>Rivalsa ${escapeXml(invoice.percentualeRivalsa || seller.percentualeRivalsaInps || 4)}% Gestione Separata INPS</Descrizione>
        <PrezzoUnitario>${amount(invoice.rivalsaInps)}</PrezzoUnitario>
        <PrezzoTotale>${amount(invoice.rivalsaInps)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
      </DettaglioLinee>`
  }

  // Stamp duty charged to the client: it is a refund out of the tax base
  // (art. 15 DPR 633/72), so a separate line with Natura N1 and its own
  // summary. Without this line the document total does not match the lines.
  const stampDutyCharged = Number(invoice.marcaDaBollo) > 0
  let stampDutyLine = ''
  let stampDutySummary = ''

  if (stampDutyCharged) {
    lineNumber++

    stampDutyLine = `\n      <DettaglioLinee>
        <NumeroLinea>${lineNumber}</NumeroLinea>
        <Descrizione>Rimborso imposta di bollo</Descrizione>
        <PrezzoUnitario>${amount(invoice.marcaDaBollo)}</PrezzoUnitario>
        <PrezzoTotale>${amount(invoice.marcaDaBollo)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N1</Natura>
      </DettaglioLinee>`

    stampDutySummary = `\n      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N1</Natura>
        <ImponibileImporto>${amount(invoice.marcaDaBollo)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
        <RiferimentoNormativo>Escluse art. 15 DPR 633/72</RiferimentoNormativo>
      </DatiRiepilogo>`
  }

  const summaryTaxable = round2(
    (Number(invoice.imponibile) || 0) + (Number(invoice.rivalsaInps) || 0)
  )

  // DatiBollo goes in each time the stamp duty is DUE, also when the seller
  // pays it: the tax agency uses it to compute the virtual stamp duty to pay.
  const stampDutyData = stampDutyCharged || isStampDutyDue(invoice, seller)
    ? `\n        <DatiBollo>
          <BolloVirtuale>SI</BolloVirtuale>
          <ImportoBollo>${amount(stampDutyCharged ? invoice.marcaDaBollo : seller.importoBollo || 2)}</ImportoBollo>
        </DatiBollo>`
    : ''

  // DatiPagamento block.
  const dueDate = invoice.scadenzaPagamento
    ? `\n        <DataScadenzaPagamento>${escapeXml(invoice.scadenzaPagamento)}</DataScadenzaPagamento>`
    : ''

  const ibanLine = seller.iban
    ? `\n        <IBAN>${escapeXml(seller.iban)}</IBAN>`
    : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>${escapeXml(sellerCountry)}</IdPaese>
        <IdCodice>${escapeXml(seller.partitaIVA)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${sendNumber(invoice)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escapeXml(recipientCode)}</CodiceDestinatario>${recipientPec}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>${escapeXml(sellerCountry)}</IdPaese>
          <IdCodice>${escapeXml(seller.partitaIVA)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${escapeXml(seller.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          <Nome>${escapeXml(seller.nome)}</Nome>
          <Cognome>${escapeXml(seller.cognome)}</Cognome>
        </Anagrafica>
        <RegimeFiscale>${escapeXml(seller.regimeFiscale || 'RF19')}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(seller.indirizzo)}</Indirizzo>
        <CAP>${escapeXml(seller.cap)}</CAP>
        <Comune>${escapeXml(seller.citta)}</Comune>
        <Provincia>${escapeXml(seller.provincia)}</Provincia>
        <Nazione>${escapeXml(sellerCountry)}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
${clientVatId}${clientTaxCode}        <Anagrafica>
${clientIdentity}
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(client.indirizzo)}</Indirizzo>
        <CAP>${escapeXml(client.cap)}</CAP>
        <Comune>${escapeXml(client.citta)}</Comune>
        <Provincia>${escapeXml(client.provincia)}</Provincia>
        <Nazione>${escapeXml(clientCountry)}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${escapeXml(invoice.data)}</Data>
        <Numero>${escapeXml(invoice.numero)}</Numero>${stampDutyData}
        <ImportoTotaleDocumento>${amount(invoice.totale)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${lines}${rivalsaLine}${stampDutyLine}
      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
        <ImponibileImporto>${amount(summaryTaxable)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
        <RiferimentoNormativo>${escapeXml(seller.dicituraRegime)}</RiferimentoNormativo>
      </DatiRiepilogo>${stampDutySummary}
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP05</ModalitaPagamento>${dueDate}
        <ImportoPagamento>${amount(invoice.totale)}</ImportoPagamento>${ibanLine}
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  return xml
}

/**
 * Suggested file name: IT{seller VAT number}_{send number}.xml
 *
 * @param {object} invoice
 * @param {object} settings - seller data
 * @returns {string}
 */
export function xmlFileName(invoice, settings) {
  const country = ((settings && settings.nazione) || 'IT').toUpperCase()
  const vatNumber = (settings && settings.partitaIVA) || '00000000000'

  return `${country}${vatNumber}_${sendNumber(invoice)}.xml`
}
