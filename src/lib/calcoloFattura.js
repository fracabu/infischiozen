import { round2 } from './format.js'

/**
 * Calcolo fattura per il REGIME FORFETTARIO (RF19).
 *
 * Regole:
 *  - Nessuna IVA (ogni riga esente, Natura N2.2 in XML).
 *  - Nessuna ritenuta d'acconto.
 *  - marcaDaBollo = importoBollo se addebitata e imponibile > sogliaBollo.
 *  - totale = imponibile + rivalsaInps + marcaDaBollo.
 *
 * DUE MODI DI TRATTARE LA RIVALSA, e fanno numeri diversi:
 *
 *  - `prezziLordi: false` — il prezzo di riga e' l'imponibile e la rivalsa si
 *    AGGIUNGE sopra. Un report a 29 diventa 30,16 per il cliente.
 *  - `prezziLordi: true`  — il prezzo di riga e' quello che il cliente paga, e
 *    l'imponibile si ricava per scorporo (totale / 1,04). Un report a 30 resta
 *    30, con imponibile 28,85 e rivalsa 1,15.
 *
 * Il default e' il primo (rivalsa aggiunta): il secondo si attiva da
 * Impostazioni ("prezzi gia' comprensivi di rivalsa").
 *
 * @param {Array} righe - [{ quantita, prezzoUnitario, ... }]
 * @param {Object} impostazioni - dati cedente
 * @returns {{ imponibile, rivalsaInps, marcaDaBollo, totale }}
 */
export function calcolaFattura(righe, impostazioni) {
  const imp = impostazioni || {}
  const lista = Array.isArray(righe) ? righe : []

  const sommaRighe = round2(
    lista.reduce((acc, r) => {
      const q = Number(r.quantita) || 0
      const p = Number(r.prezzoUnitario) || 0
      return acc + q * p
    }, 0)
  )

  const perc = imp.applicaRivalsaInps ? Number(imp.percentualeRivalsaInps) || 0 : 0
  const prezziLordi = imp.prezziLordi === true

  let imponibile
  let rivalsaInps = 0
  if (perc === 0) {
    imponibile = sommaRighe
  } else if (prezziLordi) {
    // Il prezzo di riga e' gia' il totale: si scorpora all'indietro. La
    // rivalsa e' la differenza, cosi' i tre numeri tornano sempre alla
    // somma esatta anche dopo gli arrotondamenti.
    imponibile = round2(sommaRighe / (1 + perc / 100))
    rivalsaInps = round2(sommaRighe - imponibile)
  } else {
    imponibile = sommaRighe
    rivalsaInps = round2(imponibile * (perc / 100))
  }

  // Sopra soglia il bollo e' dovuto. Puo' essere addebitato al cliente
  // (entra nel totale) oppure restare a carico del prestatore: in entrambi i
  // casi va dichiarato nell'XML, vedi bolloDovuto().
  let marcaDaBollo = 0
  if (bolloDovuto({ imponibile, rivalsaInps }, imp) && imp.addebitaBolloAlCliente !== false) {
    marcaDaBollo = round2(Number(imp.importoBollo) || 0)
  }

  const totale = round2(imponibile + rivalsaInps + marcaDaBollo)

  return { imponibile, rivalsaInps, marcaDaBollo, totale }
}

/**
 * La marca da bollo e' dovuta quando l'importo della fattura (operazioni senza
 * IVA, rivalsa compresa: e' parte del corrispettivo) supera la soglia.
 * Indipendente da CHI la paga: serve all'XML (DatiBollo) e alla dicitura.
 */
export function bolloDovuto(fattura, impostazioni) {
  const imp = impostazioni || {}
  if (!imp.applicaMarcaDaBollo) return false
  const importo = (Number(fattura.imponibile) || 0) + (Number(fattura.rivalsaInps) || 0)
  return importo > (Number(imp.sogliaBollo) || 0)
}

// Calcola il totale di una singola riga.
export function totaleRiga(riga) {
  const q = Number(riga.quantita) || 0
  const p = Number(riga.prezzoUnitario) || 0
  return round2(q * p)
}
