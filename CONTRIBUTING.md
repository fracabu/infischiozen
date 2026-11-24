# Contribuire a infischiozen

Grazie per l'interesse. infischiozen è piccolo e giovane: ogni contributo si
vede, anche una segnalazione di due righe.

## Prima di tutto: niente dati reali

È un software di fatturazione, quindi il rischio più grosso non è un bug ma un
dato personale finito in pubblico. In issue, pull request, test e screenshot:

- **mai** fatture vere, nomi, codici fiscali, P.IVA, IBAN o indirizzi di
  persone e aziende reali;
- **mai** connection string o credenziali (`.env.local` è escluso da git:
  lascialo così);
- per gli esempi usa dati inventati. Nei test ci sono già un codice fiscale e
  una P.IVA di prova validi (`RSSMRA80A01H501U`, `12345678903`).

## Preparare l'ambiente

Serve solo Node.js 20 o superiore: il database (PGlite) è incluso.

```bash
git clone https://github.com/fracabu/infischiozen.git
cd infischiozen
npm install
npm run dev      # API su 127.0.0.1:3001 + interfaccia su http://localhost:5173
npm test         # test Vitest
```

I dati di sviluppo finiscono in `dati/`. Per ripartire da un database vuoto,
ferma il server e cancella quella cartella.

## Da dove partire

- **[REVIEW.md](REVIEW.md)**, sezione *Da fare*: problemi noti, già descritti,
  con l'effetto e la direzione della correzione.
- **[Roadmap](README.md#roadmap)** nel README: le funzioni che mancano. La più
  attesa è l'invio allo SdI via PEC.
- **XML scartati**: se hai provato un XML generato dall'app con il validatore
  FatturaPA o con lo SdI ed è stato scartato, apri una issue con il messaggio
  di errore e il caso (privato/azienda/PA, con o senza bollo), con dati
  inventati.

Per un cambiamento grosso (una funzione nuova, un cambio di architettura)
apri prima una issue: così si decide insieme la strada prima che tu scriva il
codice.

## Come è scritto il codice

Il progetto segue le regole di [rule-mcp](https://github.com/pixu1980/rule-mcp)
([ADR 001](docs/adr/001-adopt-rule-mcp-rules-enforced-with-eslint-and-rule-tool-check.md)).
La migrazione va una schermata per volta: il codice vecchio ha ancora nomi
italiani e classi CSS. **Il codice nuovo segue le regole nuove.** Come modello,
guarda `src/views/Clients/` e `src/views/ClientForm/`.

- **Codice, commenti e nomi dei file in inglese.** I campi dei dati
  (`codiceFiscale`, `partitaIVA`) restano in italiano finché store e server
  non cambiano nome.
- **Testi dell'interfaccia in `src/locales/it.json`**, letti con `t()` di
  vue-i18n ([ADR 002](docs/adr/002-use-vue-i18n-for-ui-text.md)).
- **Un componente è una cartella**: `index.js` che esporta, `_Nome.vue` e
  `_Nome.css`. Niente classi CSS né stili inline: selettori su elementi e
  `data-part`. Niente `<div>` dove esiste un elemento semantico.
- **Form con vee-validate + zod.** Lo schema è una funzione pura in `src/lib/`
  (vedi `clientSchema.js`) con i suoi test.
- **`npm run lint` deve passare** sui file che tocchi.
- **Una decisione di architettura va in un'ADR** in `docs/adr/`.
- **I commenti spiegano il perché**, non il cosa. Quando una regola viene da una
  norma o da un vincolo FatturaPA, scrivilo (vedi `calcoloFattura.js` e
  `generaXml.js`).
- **Le date sono testo `YYYY-MM-DD`**, mai oggetti `Date`: vedi la nota in
  `server/mappa.mjs`. Una data fiscale spostata di un giorno è un errore vero.
- **Il calcolo sta in funzioni pure** in `src/lib/`, senza dipendenze da Vue o
  dal database, così si testa da solo.
- **Le query usano sempre parametri** (`$1`, oppure il template `` sql`...` ``),
  mai valori incollati nel testo SQL.
- **Le regole fiscali le fa rispettare il server**, non solo l'interfaccia:
  numerazione, ordine delle date, fatture emesse non modificabili.

## Test

```bash
npm test             # una volta
npm run test:watch   # mentre lavori
```

- Ogni correzione di un bug porta con sé un test che lo riproduce: nei test
  attuali i casi dei bug di `REVIEW.md` sono segnati con il loro numero.
- Ogni regola fiscale nuova porta con sé un test con i numeri: soglie, casi
  limite, arrotondamenti.
- Se tocchi il server, provalo su un database vuoto: avvialo con una cartella
  temporanea (`CARTELLA_DATI=/tmp/prova npm run api`) e chiama le API.

## Pull request

Prima di aprirla:

- [ ] `npm test` passa
- [ ] `npm run build` passa
- [ ] nessun dato reale né credenziale nel diff
- [ ] se hai cambiato una regola fiscale, hai aggiornato la tabella *Regole
      fiscali applicate* nel README
- [ ] se hai corretto un problema di `REVIEW.md`, lo hai spostato fra i bug
      corretti

Nella descrizione scrivi cosa cambia per chi usa l'app e come l'hai provato.
Una pull request piccola e mirata viene rivista prima di una grande.

## Una nota sulle regole fiscali

Se una regola ti sembra sbagliata, è probabile che tu abbia ragione: il
progetto segue le regole del forfettario come le abbiamo capite, e non è
rivisto da un commercialista. Apri una issue citando la fonte (norma,
circolare, specifiche tecniche FatturaPA): è il contributo più prezioso.

## Licenza

Contribuendo accetti che il tuo codice sia distribuito con la stessa
[licenza MIT](LICENSE) del progetto.
