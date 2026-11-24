/**
 * @module lib/format
 * Display formats (euro, dates) and checks of Italian fiscal identifiers.
 */

// ---------- Formats ----------

/**
 * Format a number as Italian euro currency: 1234.5 -> "€ 1.234,50".
 *
 * @param {number|string} value
 * @returns {string}
 */
export function formatEuro(value) {
  const amount = Number(value) || 0

  return (
    '€ ' +
    amount.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  )
}

/**
 * Format an ISO date (YYYY-MM-DD) as dd/mm/yyyy.
 *
 * @param {string|number|null|undefined} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) {
    return ''
  }

  const parts = String(iso).slice(0, 10).split('-')

  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso
}

/**
 * @returns {string} today as an ISO date, YYYY-MM-DD
 */
export function todayIso() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Round to 2 decimals, without floating point drift.
 *
 * @param {number|string} value
 * @returns {number}
 */
export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

// ---------- Checks ----------

/**
 * Italian VAT number: 11 digits with the official check digit.
 *
 * @param {string|number|null|undefined} vatNumber
 * @returns {boolean}
 */
export function isValidVatNumber(vatNumber) {
  if (!vatNumber) {
    return false
  }

  const value = String(vatNumber).trim()

  if (!/^\d{11}$/.test(value)) {
    return false
  }

  let sum = 0

  for (let i = 0; i < 11; i++) {
    let digit = Number(value[i])

    if (i % 2 === 1) {
      digit *= 2

      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
  }

  return sum % 10 === 0
}

// Tax code of a person: 16 characters with a check character. A company tax
// code is 11 digits, the same as its VAT number.
const TAX_CODE_EVEN = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18,
  T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9
}

const TAX_CODE_ODD = {
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
  0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21
}

const TAX_CODE_CHECK = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Italian tax code (codice fiscale) of a person or a company.
 *
 * @param {string|number|null|undefined} taxCode
 * @returns {boolean}
 */
export function isValidTaxCode(taxCode) {
  if (!taxCode) {
    return false
  }

  const value = String(taxCode).trim().toUpperCase()

  // A company: the tax code can be the VAT number.
  if (/^\d{11}$/.test(value)) {
    return isValidVatNumber(value)
  }

  // A person: 16 letters and digits.
  if (!/^[A-Z0-9]{16}$/.test(value)) {
    return false
  }

  let sum = 0

  for (let i = 0; i < 15; i++) {
    const character = value[i]
    sum += (i % 2 === 0 ? TAX_CODE_ODD : TAX_CODE_EVEN)[character]
  }

  return TAX_CODE_CHECK[sum % 26] === value[15]
}

/**
 * Italian postal code (CAP): 5 digits.
 *
 * @param {string|number|null|undefined} postalCode
 * @returns {boolean}
 */
export function isValidPostalCode(postalCode = '') {
  return /^\d{5}$/.test(String(postalCode).trim())
}

/**
 * Italian province: 2 letters.
 *
 * @param {string|number|null|undefined} province
 * @returns {boolean}
 */
export function isValidProvince(province = '') {
  return /^[A-Z]{2}$/.test(String(province).trim().toUpperCase())
}

/**
 * SdI recipient code: exactly 7 letters or digits.
 *
 * @param {string|number|null|undefined} recipientCode
 * @returns {boolean}
 */
export function isValidRecipientCode(recipientCode = '') {
  return /^[A-Z0-9]{7}$/.test(String(recipientCode).trim().toUpperCase())
}

/**
 * Email or PEC address.
 *
 * @param {string|number|null|undefined} email
 * @returns {boolean}
 */
export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
}
