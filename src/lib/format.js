// ---------- Formattazione ----------

// Formatta un numero come valuta euro italiana: 1234.5 -> "€ 1.234,50"
export function formatEuro(n) {
  const v = Number(n) || 0

  return (
    '€ ' +
    v.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  )
}

// Formatta una data ISO (AAAA-MM-GG) in gg/mm/aaaa.
export function formatData(iso) {
  if (!iso) {
    return ''
  }

  const parti = String(iso).slice(0, 10).split('-')

  if (parti.length !== 3) {
    return iso
  }

  return `${parti[2]}/${parti[1]}/${parti[0]}`
}

// Data odierna in formato ISO AAAA-MM-GG.
export function oggiISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')

  return `${d.getFullYear()}-${m}-${g}`
}

// Arrotonda a 2 decimali (evita errori di virgola mobile).
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

// ---------- Validazioni ----------

// Partita IVA italiana: 11 cifre con checksum (algoritmo ufficiale Luhn-like).
export function validaPartitaIVA(piva) {
  if (!piva) {
    return false
  }

  const v = String(piva).trim()

  if (!/^\d{11}$/.test(v)) {
    return false
  }

  let somma = 0

  for (let i = 0; i < 11; i++) {
    let cifra = parseInt(v[i], 10)

    if (i % 2 === 1) {
      cifra *= 2

      if (cifra > 9) {
        cifra -= 9
      }
    }

    somma += cifra
  }

  return somma % 10 === 0
}

// Codice fiscale: persona fisica (16 caratteri con carattere di controllo)
// oppure azienda (11 cifre = partita IVA).
const CF_PARI = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18,
  T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9
}

const CF_DISPARI = {
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
  0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21
}

const CF_RESTO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function validaCodiceFiscale(cf) {
  if (!cf) {
    return false
  }

  const v = String(cf).trim().toUpperCase()

  // Azienda: può coincidere con la P.IVA.
  if (/^\d{11}$/.test(v)) {
    return validaPartitaIVA(v)
  }

  // Persona fisica: 16 caratteri alfanumerici.
  if (!/^[A-Z0-9]{16}$/.test(v)) {
    return false
  }

  let somma = 0

  for (let i = 0; i < 15; i++) {
    const c = v[i]
    somma += (i % 2 === 0 ? CF_DISPARI : CF_PARI)[c]
  }

  return CF_RESTO[somma % 26] === v[15]
}

// CAP: 5 cifre.
export function validaCap(cap) {
  return /^\d{5}$/.test(String(cap || '').trim())
}

// Provincia: 2 lettere maiuscole.
export function validaProvincia(p) {
  return /^[A-Z]{2}$/.test(String(p || '').trim().toUpperCase())
}

// Codice destinatario SdI: esattamente 7 caratteri alfanumerici.
export function validaCodiceDestinatario(cd) {
  return /^[A-Z0-9]{7}$/.test(String(cd || '').trim().toUpperCase())
}

// Email / PEC.
export function validaEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}
