/**
 * @module lib/invoiceMath
 * Invoice amounts for the flat-rate regime (RF19).
 */
import { round2 } from './format.js'

/**
 * Invoice amounts for the FLAT-RATE REGIME (RF19).
 *
 * Rules:
 *  - No VAT (each line is exempt, Natura N2.2 in the XML).
 *  - No withholding tax.
 *  - marcaDaBollo = importoBollo when charged and the amount is above sogliaBollo.
 *  - totale = imponibile + rivalsaInps + marcaDaBollo.
 *
 * TWO WAYS TO TREAT THE INPS CHARGE (rivalsa), and they give different numbers:
 *
 *  - `prezziLordi: false`: the line price is the taxable amount and the charge
 *    is ADDED on top. A report at 29 becomes 30.16 for the client.
 *  - `prezziLordi: true`: the line price is what the client pays, and the
 *    taxable amount comes out by division (total / 1.04). A report at 30 stays
 *    30, with taxable amount 28.85 and charge 1.15.
 *
 * The default is the first (charge added). Settings switch on the second
 * ("prices already include the INPS charge").
 *
 * @param {Array} lines - [{ quantita, prezzoUnitario, ... }]
 * @param {object} settings - seller data
 * @returns {{ imponibile, rivalsaInps, marcaDaBollo, totale }}
 */
export function computeInvoice(lines, settings) {
  const options = settings || {}
  const list = Array.isArray(lines) ? lines : []

  let rawSum = 0

  for (const line of list) {
    const quantity = Number(line.quantita) || 0
    const price = Number(line.prezzoUnitario) || 0
    rawSum += quantity * price
  }

  const linesSum = round2(rawSum)

  const percent = options.applicaRivalsaInps ? Number(options.percentualeRivalsaInps) || 0 : 0
  const isGrossPrices = options.prezziLordi === true

  let imponibile
  let rivalsaInps = 0

  if (percent === 0) {
    imponibile = linesSum
  } else if (isGrossPrices) {
    // The line price is already the total: divide back. The charge is the
    // difference, so the three numbers always add up to the exact sum, also
    // after rounding.
    imponibile = round2(linesSum / (1 + percent / 100))
    rivalsaInps = round2(linesSum - imponibile)
  } else {
    imponibile = linesSum
    rivalsaInps = round2(imponibile * (percent / 100))
  }

  // Above the threshold the stamp duty is due. The client can pay it (it goes
  // into the total) or the seller can keep it: in both cases the XML declares
  // it, see isStampDutyDue().
  let marcaDaBollo = 0

  if (isStampDutyDue({ imponibile, rivalsaInps }, options) && options.addebitaBolloAlCliente !== false) {
    marcaDaBollo = round2(Number(options.importoBollo) || 0)
  }

  const totale = round2(imponibile + rivalsaInps + marcaDaBollo)

  return { imponibile, rivalsaInps, marcaDaBollo, totale }
}

/**
 * The stamp duty is due when the invoice amount (operations without VAT, INPS
 * charge included: it is part of the fee) is above the threshold. It does not
 * depend on WHO pays it: the XML (DatiBollo) and the legal text need it.
 *
 * @param {object} invoice - with imponibile and rivalsaInps
 * @param {object} settings
 * @returns {boolean}
 */
export function isStampDutyDue(invoice, settings) {
  const options = settings || {}

  if (!options.applicaMarcaDaBollo) {
    return false
  }

  const amount = (Number(invoice.imponibile) || 0) + (Number(invoice.rivalsaInps) || 0)

  return amount > (Number(options.sogliaBollo) || 0)
}

/**
 * Total of one invoice line.
 *
 * @param {object} line - with quantita and prezzoUnitario
 * @returns {number}
 */
export function lineTotal(line) {
  const quantity = Number(line.quantita) || 0
  const price = Number(line.prezzoUnitario) || 0

  return round2(quantity * price)
}
