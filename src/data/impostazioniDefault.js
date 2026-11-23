// ============================================================================
// Valori di partenza delle Impostazioni (dati del cedente/prestatore).
//
// Usati dal server quando il database non ha ancora una riga `impostazioni`:
// al primo avvio l'app porta l'utente a compilarli (`confermato: false`).
// Nessun dato personale qui: ognuno inserisce i suoi dall'app.
// Nessuna dipendenza: il file viene importato sia dal server Node sia da Vite.
// ============================================================================
export const IMPOSTAZIONI_DEFAULT = {
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
  // false = il prezzo di riga e' l'imponibile e la rivalsa si aggiunge sopra.
  prezziLordi: false,
  // Sopra i 77,47 EUR la marca da bollo da 2 EUR e' dovuta. Chi la paga
  // (cliente o prestatore) e' una scelta: l'XML la dichiara in ogni caso.
  applicaMarcaDaBollo: true,
  addebitaBolloAlCliente: true,
  sogliaBollo: 77.47,
  importoBollo: 2,
  testoBollo: 'Imposta di bollo assolta in modo virtuale ai sensi del DM 17/06/2014',
  logoBase64: '',
  // Massimo 100 caratteri: e' il limite di RiferimentoNormativo in FatturaPA.
  dicituraRegime:
    "Regime forfettario: operazione in franchigia IVA e senza ritenuta d'acconto Art.1 c.54-89 L.190/2014",
  confermato: false
}
