# infischiozen

**Fatturazione gratuita e in locale per partite IVA in regime forfettario.**

Anagrafica clienti, catalogo servizi, fatture con il calcolo automatico di
rivalsa INPS e marca da bollo, PDF di cortesia e **XML FatturaPA 1.2** pronto
per il Sistema di Interscambio (SdI). Senza abbonamenti: l'app gira sul tuo
computer e i dati restano lì: **nessun account, nessun cloud**.

![Vue 3](https://img.shields.io/badge/Vue-3-42b883)
![Node 20+](https://img.shields.io/badge/Node-20%2B-339933)
![Postgres locale](https://img.shields.io/badge/DB-Postgres%20locale%20(PGlite)-336791)
![Stato: in sviluppo](https://img.shields.io/badge/stato-in%20sviluppo-orange)

> ⚠️ **Progetto giovane.** Calcoli, XML e API sono stati provati, ma l'XML non
> è ancora passato dal validatore ufficiale FatturaPA.
> Leggi [Stato del progetto](#stato-del-progetto) prima di emettere fatture vere.

---

## Indice

- [Cosa fa](#cosa-fa)
- [Come funziona](#come-funziona)
- [Avvio rapido](#avvio-rapido)
- [Primo avvio](#primo-avvio)
- [Regole fiscali applicate](#regole-fiscali-applicate)
- [Inviare la fattura all'Agenzia delle Entrate](#inviare-la-fattura-allagenzia-delle-entrate)
- [API locale](#api-locale)
- [Struttura del progetto](#struttura-del-progetto)
- [Regole del codice (rule-mcp)](#regole-del-codice-rule-mcp)
- [Stato del progetto](#stato-del-progetto)
- [Roadmap](#roadmap)
- [Contribuire](#contribuire)
- [Avvertenze](#avvertenze)
- [Licenza](#licenza)

---

## Cosa fa

| Area | Funzioni |
|------|----------|
| **Clienti** | Privati, aziende e PA. Codice fiscale e P.IVA validati, codice destinatario SdI, PEC. Nome e cognome separati per le persone fisiche, come chiede FatturaPA. |
| **Prodotti e servizi** | Catalogo con i prezzi, da richiamare nelle righe della fattura. |
| **Fatture** | Bozza → emissione, con il numero assegnato **dal database** solo al momento dell'emissione: progressivo, senza buchi né doppioni, in ordine di data. |
| | Stati: emessa, inviata, pagata, annullata. Una fattura numerata non si cancella: si annulla. |
| | **PDF** di cortesia e **XML FatturaPA** da scaricare. |
| | Registrazione delle fatture **emesse con un altro software**, con il loro numero: il fatturato resta completo e la numerazione continua da lì. |
| **Dashboard** | Fatturato per mese, andamento progressivo, fatture non pagate, concentrazione sui primi clienti. |

## Come funziona

```
  Browser                 Vite (dev)                Server Node            Database
┌──────────┐   /api/…   ┌────────────┐   proxy    ┌──────────────────┐     ┌────────────────┐
│ App Vue 3│ ─────────▶ │ :5173      │ ─────────▶ │ Express          │ ──▶ │ PGlite in dati/│
│ Pinia    │            │            │            │ 127.0.0.1:3001   │     │ oppure Neon    │
└──────────┘            └────────────┘            └──────────────────┘     └────────────────┘
```

Il database predefinito è [PGlite](https://pglite.dev): un Postgres vero che
gira dentro il processo Node e salva i dati nella cartella `dati/` (esclusa da
git). Lo schema si applica da solo all'avvio. Per un backup basta copiare
quella cartella a server spento.

Se preferisci i dati in cloud, imposta `DATABASE_URL` con una connection string
[Neon](https://neon.tech) (scegli una regione UE): l'app usa Neon al posto di
PGlite, con le stesse query.

Il browser non parla mai direttamente con il database: il server ascolta solo
su `127.0.0.1`, non è raggiungibile da fuori, e un'eventuale connection string
resta nel processo Node, mai nel bundle JavaScript.

PDF e XML si generano nel browser (`pdfmake` e un generatore XML scritto a mano
in `src/lib/invoiceXml.js`).

## Avvio rapido

**Requisiti**

- Node.js 20 o superiore. Nient'altro: il database è incluso.

**Installazione**

```bash
git clone https://github.com/fracabu/infischiozen.git
cd infischiozen
npm install
npm run dev                   # API su :3001 + interfaccia su http://localhost:5173
```

**Variabili d'ambiente** (tutte facoltative; in `.env.local`, escluso da git;
parti da `.env.example`)

| Variabile | Obbligatoria | Descrizione |
|-----------|:---:|-------------|
| `DATABASE_URL` | no | Connection string Neon (`postgresql://…?sslmode=require`). Se c'è, si usa Neon al posto del database locale, e lo schema si crea con `npm run db:schema`. In alternativa `POSTGRES_URL`. |
| `CARTELLA_DATI` | no | Dove PGlite salva i dati. Predefinita: `dati/` nel progetto. |
| `PORTA_API` | no | Porta del server API. Predefinita: `3001`. Se la cambi, aggiorna anche il proxy in `vite.config.js`. |

**Script npm**

| Comando | Cosa fa |
|---------|---------|
| `npm run dev` | Avvia insieme API e interfaccia |
| `npm run api` | Solo il server API |
| `npm run web` | Solo l'interfaccia Vite |
| `npm test` | Esegue i test (Vitest) |
| `npm run test:watch` | Test in modalità watch |
| `npm run build` | Build di produzione in `dist/` |
| `npm run preview` | Anteprima della build |
| `npm run db:schema` | Applica `db/schema.sql` (serve solo con Neon: in locale lo fa il server all'avvio) |

## Primo avvio

1. L'app apre **Impostazioni**: compila i tuoi dati (nome, codice fiscale,
   P.IVA, sede, IBAN) e conferma.
2. Se quest'anno hai già emesso fatture con un altro software, registrale da
   **Fatture → Registra fattura esterna** con il loro numero. La prossima
   fattura dell'app partirà dal numero successivo.
3. Aggiungi clienti e servizi, poi crea la prima fattura: resta **bozza** finché
   non la emetti.

## Regole fiscali applicate

Il regime gestito è **solo il forfettario (RF19)**: calcoli e XML non sono
pensati per il regime ordinario.

| Regola | Come la applica l'app |
|--------|------------------------|
| IVA | Nessuna. Ogni riga ha Natura **N2.2** nell'XML. |
| Ritenuta d'acconto | Nessuna. |
| Rivalsa INPS (Gestione Separata) | 4% predefinito. Due modi: **aggiunta** sopra il prezzo (29 € → 30,16 €) oppure **scorporata** da un prezzo già lordo (30 € = 28,85 € + 1,15 €). Si sceglie in Impostazioni e si può escludere sulla singola fattura. |
| Marca da bollo | 2 € quando imponibile **più rivalsa** supera 77,47 €. Può essere addebitata al cliente (riga a parte con Natura N1) o restare a tuo carico: in entrambi i casi l'XML la dichiara in `DatiBollo`, così il conteggio del bollo virtuale è giusto. |
| Dicitura di legge | Modificabile, al massimo 100 caratteri (limite di `RiferimentoNormativo`: oltre, lo SdI scarta). |
| Numerazione | Progressiva per anno, ricavato dalla data della fattura. Non si può emettere una fattura con data precedente all'ultima dell'anno. |
| Dati del cliente | Fotografati all'emissione: se poi cambi l'anagrafica, la fattura emessa non cambia. |

Tutti i valori (percentuale, soglia, importo del bollo, dicitura) sono in
Impostazioni; i predefiniti sono in `src/data/defaultSettings.js`.

## Inviare la fattura all'Agenzia delle Entrate

L'app genera l'XML ma **non lo invia ancora**. Oggi le strade sono:

1. caricare l'XML a mano sul portale **Fatture e Corrispettivi**
   dell'Agenzia delle Entrate;
2. *(in programma)* inviarlo via PEC al Sistema di Interscambio;
3. *(in programma)* passare da un intermediario accreditato con API.

Il cassetto fiscale serve a consultare, non a trasmettere.

Prima di usare l'XML per una fattura vera, controllalo con un validatore
FatturaPA (per esempio quello sul sito FatturaPA dell'Agenzia).

## API locale

Il server espone una API JSON su `http://127.0.0.1:3001`, usata dall'app
attraverso il proxy di Vite. **Non ha autenticazione**: non esporla in rete.

| Metodo | Percorso | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/stato` | Verifica la connessione al DB e conta fatture, clienti e prodotti |
| `GET` `POST` | `/api/clienti` | Elenco / creazione clienti |
| `GET` `PUT` `DELETE` | `/api/clienti/:id` | Lettura / modifica / eliminazione cliente |
| `GET` `POST` | `/api/fatture` | Elenco / creazione (bozza, emissione o fattura esterna) |
| `GET` `PUT` `DELETE` | `/api/fatture/:id` | Lettura / modifica / eliminazione (bozze ed esterne; una fattura interna numerata si annulla) |
| `PATCH` | `/api/fatture/:id/stato` | Cambio di stato |
| `GET` `PUT` | `/api/fatture/:id/pdf` | PDF salvato della fattura |
| `GET` `POST` | `/api/prodotti` | Elenco / creazione prodotti |
| `PUT` `DELETE` | `/api/prodotti/:id` | Modifica / eliminazione prodotto |
| `GET` `PUT` | `/api/impostazioni` | Dati del cedente e parametri fiscali |

Un numero già usato restituisce `409` con la spiegazione, non un errore generico.

## Struttura del progetto

```
db/schema.sql           schema completo del database (idempotente)
scripts/_db.mjs         connessione: PGlite locale, oppure Neon se c'è DATABASE_URL
scripts/apply-schema.mjs
server/index.mjs        API Express, in ascolto solo su 127.0.0.1
server/mapping.mjs      traduzione fra righe del DB e oggetti dell'app
src/
  views/                pagine; quelle già migrate hanno una cartella
                        (es. Clients/: index.js, _Nome.vue, _Nome.css se serve)
  components/           componenti riusabili
  stores/               stato Pinia (clients, invoices, products, settings)
  locales/it.json       tutti i testi dell'interfaccia (vue-i18n)
  lib/
    invoiceMath.js      imponibile, rivalsa, bollo, totale
    invoiceXml.js       XML FatturaPA 1.2 (FPR12)
    invoicePdf.js       PDF di cortesia
    clientSchema.js     validazione della scheda cliente (zod)
    productSchema.js    validazione della scheda prodotto (zod)
    displayNames.js     nome del cliente e numero fattura per le viste
    invoiceDraft.js     wizard della nuova fattura: regole e documento
    externalInvoice.js  fattura emessa altrove: regole e documento
    invoiceStatus.js    stati della fattura e passaggi consentiti
  data/defaultSettings.js
tests/                  test Vitest delle funzioni pure (calcolo, XML, validazioni)
docs/adr/               decisioni di architettura (ADR)
eslint.config.mjs       regole di stile del codice
```

**Stack:** Vue 3 · Vite · Pinia · Vue Router · vue-i18n · vee-validate + zod ·
Express 5 · Postgres (PGlite, oppure `@neondatabase/serverless`) · pdfmake ·
Heroicons · Vitest · ESLint.

## Regole del codice (rule-mcp)

Il progetto segue le regole di [rule-mcp](https://github.com/pixu1980/rule-mcp),
un server MCP che dà a un agente AI regole e controlli per scrivere il codice.
La scelta è nell'[ADR 001](docs/adr/001-adopt-rule-mcp-rules-enforced-with-eslint-and-rule-tool-check.md).
Le regole principali:

- **niente classi CSS e niente stili inline**: i selettori usano elementi e
  attributi `data-part`; ogni componente ha il suo file `.css`;
- **HTML semantico** al posto dei `<div>` generici;
- **testi dell'interfaccia in `src/locales/it.json`**, non nei componenti
  ([ADR 002](docs/adr/002-use-vue-i18n-for-ui-text.md));
- **codice, commenti e nomi dei file in inglese**; l'utente vede l'italiano;
- **form validati con vee-validate + zod**, con le regole in funzioni pure
  sotto `src/lib/` e i loro test;
- **ogni decisione di architettura in un'ADR** in `docs/adr/`.

La migrazione va **una schermata per volta** ed è in corso: le schermate non
ancora migrate usano ancora `src/assets/main.css` e nomi in italiano.
rule-mcp serve solo a chi sviluppa con un agente AI. Per usare l'app o
contribuire a mano non serve installarlo. ESLint (`npm run lint`) controlla lo
stile del JavaScript. Per CSS e HTML il modello sono le schermate già migrate.

## Stato del progetto

Il codice nasce da un gestionale personale reso generico. In
[REVIEW.md](REVIEW.md) c'è la revisione completa: 23 bug corretti e i problemi
noti ancora aperti. In breve:

- ✅ build di produzione provata;
- ✅ **106 test automatici** (`npm test`) su calcolo fattura, rivalsa, bollo,
  XML FatturaPA, validazioni di CF/P.IVA e schede cliente, prodotto e impostazioni, compresi i bug già corretti;
- ✅ API provate su un database vuoto: clienti, bozze, numerazione, ordine
  delle date, fatture esterne, PDF allegati, annullamento;
- ⏳ XML **non ancora passato** dal validatore ufficiale FatturaPA;
- ⏳ la prova delle API non è ancora un test automatico nel repository;
- ❌ nessuna autenticazione: va bene in locale, non online;
- la modalità di pagamento nell'XML è sempre bonifico (MP05).

## Roadmap

L'obiettivo è coprire quello che serve a un forfettario per non pagare un
servizio esterno:

- [ ] test automatici delle API su un database PGlite temporaneo
- [ ] invio allo SdI via PEC e lettura delle ricevute (consegna, scarto)
- [ ] note di credito (TD04) per correggere una fattura emessa
- [ ] stima di imposta sostitutiva e contributi INPS sull'incassato, con le
      scadenze di acconti e saldo
- [ ] promemoria delle scadenze fiscali (F24, dichiarazione)
- [ ] controllo della soglia di ricavi del forfettario
- [ ] conservazione a norma (quella gratuita dell'Agenzia va attivata a mano)
- [ ] modalità di pagamento nell'XML presa dalla fattura

## Contribuire

Segnalazioni e pull request sono benvenute: leggi prima
[CONTRIBUTING.md](CONTRIBUTING.md) (ambiente, stile del codice, test). Servono
soprattutto:

- casi fiscali che l'app gestisce male (con l'esempio, **senza dati reali**);
- XML scartati dallo SdI o dal validatore, con il messaggio di errore;
- i punti aperti di [REVIEW.md](REVIEW.md).

Non allegare mai fatture, connection string o dati di clienti veri a issue e PR.

## Avvertenze

Questo software non sostituisce un commercialista. Calcoli e tracciato XML
seguono le regole del forfettario come le abbiamo capite: verificali sui tuoi
casi prima di emettere fatture vere. Lo usi sotto la tua responsabilità.

## Licenza

[MIT](LICENSE): puoi usarlo, modificarlo e ridistribuirlo, anche per scopi
commerciali, mantenendo l'avviso di copyright.
