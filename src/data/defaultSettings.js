/**
 * @module data/defaultSettings
 * Start values of the settings (seller data). The server uses them while the
 * database has no settings row: on first launch the app sends the user to
 * fill them in (confermato: false). No personal data here: each user enters
 * their own in the app. No dependencies: both the Node server and Vite import
 * this file.
 */
export const DEFAULT_SETTINGS = {
  id: 1,
  nome: '',
  cognome: '',
  ragioneSociale: '',
  codiceFiscale: '',
  partitaIVA: '',
  indirizzo: '',
  cap: '',
  citta: '',
  provincia: '',
  nazione: 'IT',
  email: '',
  pec: '',
  telefono: '',
  iban: '',
  banca: '',
  intestatarioIban: '',
  regimeFiscale: 'RF19',
  regimePrevidenziale: 'Gestione Separata INPS',
  applicaRivalsaInps: true,
  percentualeRivalsaInps: 4,
  // false = the line price is the taxable amount and the INPS charge goes on top.
  prezziLordi: false,
  // Above 77.47 EUR the 2 EUR stamp duty is due. Who pays it (client or
  // seller) is a choice: the XML declares it in both cases.
  applicaMarcaDaBollo: true,
  addebitaBolloAlCliente: true,
  sogliaBollo: 77.47,
  importoBollo: 2,
  testoBollo: 'Imposta di bollo assolta in modo virtuale ai sensi del DM 17/06/2014',
  logoBase64: '',
  // At most 100 characters: the RiferimentoNormativo limit of FatturaPA.
  dicituraRegime:
    "Regime forfettario: operazione in franchigia IVA e senza ritenuta d'acconto Art.1 c.54-89 L.190/2014",
  confermato: false
}
