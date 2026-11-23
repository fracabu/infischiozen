import { round2 } from './format.js'
import { bolloDovuto } from './calcoloFattura.js'

// Escape XML di un valore testuale.
function esc(v) {
  return String(v == null ? '' : v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

// Importo con punto decimale e 2 cifre.
function importo(n) {
  return (Number(n) || 0).toFixed(2)
}

// Progressivo invio: contatore base36 di 5 caratteri ricavato da anno+numero.
function progressivo(fattura) {
  const base = (Number(fattura.anno) || 0) * 100_000 + (Number(fattura.numero) || 0)

  return base.toString(36).toUpperCase().padStart(5, '0').slice(-5)
}

/**
 * Valida la presenza dei campi obbligatori prima di generare l'XML.
 * @returns {string[]} elenco di errori (vuoto se tutto ok)
 */
export function validaCampiXml(fattura, impostazioni) {
  const errori = []
  const imp = impostazioni || {}
  const c = fattura.clienteSnapshot || {}

  if (!fattura.numero) {
    errori.push('La fattura deve essere emessa (numero assegnato).')
  }

  if (!imp.partitaIVA) {
    errori.push('Partita IVA del cedente mancante (Impostazioni).')
  }

  if (!imp.codiceFiscale) {
    errori.push('Codice fiscale del cedente mancante (Impostazioni).')
  }

  if (!imp.indirizzo || !imp.cap || !imp.citta || !imp.provincia) {
    errori.push('Indirizzo completo del cedente mancante (Impostazioni).')
  }

  if (!c.indirizzo || !c.cap || !c.citta) {
    errori.push('Indirizzo del cliente incompleto.')
  }

  if (!c.partitaIVA && !c.codiceFiscale) {
    errori.push('Il cliente deve avere Partita IVA o Codice fiscale.')
  }

  // '0000000' senza PEC e' valido: e' il caso normale dei privati, la fattura
  // resta a disposizione nel loro cassetto fiscale.
  const cd = (c.codiceDestinatario || '').trim()

  if (!cd) {
    errori.push('Codice destinatario del cliente mancante.')
  }

  if ((imp.dicituraRegime || '').length > 100) {
    errori.push('La dicitura di legge supera i 100 caratteri ammessi (Impostazioni).')
  }

  if (!fattura.righe || fattura.righe.length === 0) {
    errori.push('La fattura non ha righe.')
  }

  return errori
}

/**
 * Genera l'XML FatturaPA 1.2 (tracciato FPR12).
 * @returns {string} XML
 */
export function generaXml(fattura, impostazioni) {
  const imp = impostazioni || {}
  const c = fattura.clienteSnapshot || {}
  const naz = (imp.nazione || 'IT').toUpperCase()
  const nazC = (c.nazione || 'IT').toUpperCase()

  const cd = (c.codiceDestinatario || '0000000').toUpperCase()
  const pecDest = cd === '0000000' && c.pec ? `\n      <PECDestinatario>${esc(c.pec)}</PECDestinatario>` : ''

  // Anagrafica cessionario: azienda/PA usa Denominazione, privato usa Nome+Cognome.
  let anagraficaCliente

  if (c.tipo === 'privato') {
    anagraficaCliente = `        <Nome>${esc(c.nome)}</Nome>
        <Cognome>${esc(c.cognome)}</Cognome>`
  } else {
    anagraficaCliente = `        <Denominazione>${esc(c.ragioneSociale || (c.cognome + ' ' + c.nome).trim())}</Denominazione>`
  }

  // Identificativi fiscali cliente.
  let idFiscaleCliente = ''

  if (c.partitaIVA) {
    idFiscaleCliente = `      <IdFiscaleIVA>
        <IdPaese>${esc(nazC)}</IdPaese>
        <IdCodice>${esc(c.partitaIVA)}</IdCodice>
      </IdFiscaleIVA>\n`
  }

  const cfCliente = c.codiceFiscale
    ? `      <CodiceFiscale>${esc(c.codiceFiscale)}</CodiceFiscale>\n`
    : ''

  // Dettaglio linee: una per riga + una per la rivalsa INPS.
  let numLinea = 0

  const linee = (fattura.righe || [])
    .map((r) => {
      numLinea++
      const q = Number(r.quantita) || 0
      const prezzoUnit = Number(r.prezzoUnitario) || 0
      const totale = r.totaleRiga != null ? Number(r.totaleRiga) : round2(q * prezzoUnit)

      return `      <DettaglioLinee>
        <NumeroLinea>${numLinea}</NumeroLinea>
        <Descrizione>${esc(r.descrizione)}</Descrizione>
        <Quantita>${importo(q)}</Quantita>
        <PrezzoUnitario>${importo(prezzoUnit)}</PrezzoUnitario>
        <PrezzoTotale>${importo(totale)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
      </DettaglioLinee>`
    })
    .join('\n')

  let lineaRivalsa = ''

  if (fattura.rivalsaInps && Number(fattura.rivalsaInps) > 0) {
    numLinea++

    lineaRivalsa = `\n      <DettaglioLinee>
        <NumeroLinea>${numLinea}</NumeroLinea>
        <Descrizione>Rivalsa ${esc(fattura.percentualeRivalsa || imp.percentualeRivalsaInps || 4)}% Gestione Separata INPS</Descrizione>
        <PrezzoUnitario>${importo(fattura.rivalsaInps)}</PrezzoUnitario>
        <PrezzoTotale>${importo(fattura.rivalsaInps)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
      </DettaglioLinee>`
  }

  // Bollo addebitato al cliente: e' un rimborso escluso dalla base (art. 15
  // DPR 633/72), quindi una riga a parte con Natura N1 e un suo riepilogo.
  // Senza questa riga il totale del documento non torna con le righe.
  const bolloAddebitato = Number(fattura.marcaDaBollo) > 0
  let lineaBollo = ''
  let riepilogoBollo = ''

  if (bolloAddebitato) {
    numLinea++

    lineaBollo = `\n      <DettaglioLinee>
        <NumeroLinea>${numLinea}</NumeroLinea>
        <Descrizione>Rimborso imposta di bollo</Descrizione>
        <PrezzoUnitario>${importo(fattura.marcaDaBollo)}</PrezzoUnitario>
        <PrezzoTotale>${importo(fattura.marcaDaBollo)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N1</Natura>
      </DettaglioLinee>`

    riepilogoBollo = `\n      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N1</Natura>
        <ImponibileImporto>${importo(fattura.marcaDaBollo)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
        <RiferimentoNormativo>Escluse art. 15 DPR 633/72</RiferimentoNormativo>
      </DatiRiepilogo>`
  }

  const imponibileRiepilogo = round2(
    (Number(fattura.imponibile) || 0) + (Number(fattura.rivalsaInps) || 0)
  )

  // DatiBollo va dichiarato ogni volta che il bollo e' DOVUTO, anche quando
  // resta a carico del prestatore: e' da qui che l'Agenzia calcola quanto
  // bollo virtuale va versato. Prima compariva solo se addebitato al cliente.
  const datiBollo = bolloAddebitato || bolloDovuto(fattura, imp)
    ? `\n        <DatiBollo>
          <BolloVirtuale>SI</BolloVirtuale>
          <ImportoBollo>${importo(bolloAddebitato ? fattura.marcaDaBollo : imp.importoBollo || 2)}</ImportoBollo>
        </DatiBollo>`
    : ''

  // Blocco DatiPagamento.
  const scadenza = fattura.scadenzaPagamento
    ? `\n        <DataScadenzaPagamento>${esc(fattura.scadenzaPagamento)}</DataScadenzaPagamento>`
    : ''

  const ibanRiga = imp.iban
    ? `\n        <IBAN>${esc(imp.iban)}</IBAN>`
    : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>${esc(naz)}</IdPaese>
        <IdCodice>${esc(imp.partitaIVA)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${progressivo(fattura)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${esc(cd)}</CodiceDestinatario>${pecDest}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>${esc(naz)}</IdPaese>
          <IdCodice>${esc(imp.partitaIVA)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${esc(imp.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          <Nome>${esc(imp.nome)}</Nome>
          <Cognome>${esc(imp.cognome)}</Cognome>
        </Anagrafica>
        <RegimeFiscale>${esc(imp.regimeFiscale || 'RF19')}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(imp.indirizzo)}</Indirizzo>
        <CAP>${esc(imp.cap)}</CAP>
        <Comune>${esc(imp.citta)}</Comune>
        <Provincia>${esc(imp.provincia)}</Provincia>
        <Nazione>${esc(naz)}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
${idFiscaleCliente}${cfCliente}        <Anagrafica>
${anagraficaCliente}
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(c.indirizzo)}</Indirizzo>
        <CAP>${esc(c.cap)}</CAP>
        <Comune>${esc(c.citta)}</Comune>
        <Provincia>${esc(c.provincia)}</Provincia>
        <Nazione>${esc(nazC)}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${esc(fattura.data)}</Data>
        <Numero>${esc(fattura.numero)}</Numero>${datiBollo}
        <ImportoTotaleDocumento>${importo(fattura.totale)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${linee}${lineaRivalsa}${lineaBollo}
      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
        <ImponibileImporto>${importo(imponibileRiepilogo)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
        <RiferimentoNormativo>${esc(imp.dicituraRegime)}</RiferimentoNormativo>
      </DatiRiepilogo>${riepilogoBollo}
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP05</ModalitaPagamento>${scadenza}
        <ImportoPagamento>${importo(fattura.totale)}</ImportoPagamento>${ibanRiga}
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  return xml
}

// Nome file suggerito: IT{PIVAcedente}_{progressivo}.xml
export function nomeFileXml(fattura, impostazioni) {
  const naz = ((impostazioni && impostazioni.nazione) || 'IT').toUpperCase()
  const piva = (impostazioni && impostazioni.partitaIVA) || '00000000000'

  return `${naz}${piva}_${progressivo(fattura)}.xml`
}
