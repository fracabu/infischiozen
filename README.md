# infischiozen

**Fatturazione gratuita e in locale per partite IVA in regime forfettario.**

Anagrafica clienti, catalogo servizi, fatture con il calcolo automatico di
rivalsa INPS e marca da bollo, PDF di cortesia e **XML FatturaPA 1.2** pronto
per il Sistema di Interscambio (SdI). Senza abbonamenti: l'app gira sul tuo
computer e i dati stanno nel **tuo** database.

![Vue 3](https://img.shields.io/badge/Vue-3-42b883)
![Node 20+](https://img.shields.io/badge/Node-20%2B-339933)
![Postgres su Neon](https://img.shields.io/badge/DB-Neon%20Postgres-00e599)
![Stato: in sviluppo](https://img.shields.io/badge/stato-in%20sviluppo-orange)

> ⚠️ **Progetto giovane.** Calcoli e XML sono stati rivisti e provati in build,
> ma non ancora su un database nuovo né con il validatore ufficiale FatturaPA.
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
  Browser                 Vite (dev)                Server Node               Neon
┌──────────┐   /api/…   ┌────────────┐   proxy    ┌──────────────────┐  HTTP  ┌──────────┐
│ App Vue 3│ ─────────▶ │ :5173      │ ─────────▶ │ Express          │ ─────▶ │ Postgres │
│ Pinia    │            │            │            │ 127.0.0.1:3001   │        │ (tuo DB) │
└──────────┘            └────────────┘            └──────────────────┘        └──────────┘
                                                  conosce DATABASE_URL
```

Il browser non parla mai direttamente con il database: la connection string
resta nel processo Node, che ascolta solo su `127.0.0.1` e non è raggiungibile
da fuori. Così nessun segreto finisce nel bundle JavaScript.

PDF e XML si generano nel browser (`pdfmake` e un generatore XML scritto a mano
in `src/lib/generaXml.js`).

## Avvio rapido

**Requisiti**

- Node.js 20 o superiore
- Un database [Neon](https://neon.tech) (Postgres). Basta il piano gratuito.
  Scegli una **regione UE**: ci finiscono i dati fiscali dei tuoi clienti.

> Il driver `@neondatabase/serverless` parla HTTP e funziona solo con Neon.
> Per un Postgres qualsiasi va sostituito con `pg` in `scripts/_db.mjs`.

**Installazione**

```bash
git clone https://github.com/fracabu/infischiozen.git
cd infischiozen
npm install

cp .env.example .env.local    # poi metti la TUA connection string in .env.local
npm run db:schema             # crea le tabelle (si può rilanciare senza danni)
npm run dev                   # API su :3001 + interfaccia su http://localhost:5173
```

**Variabili d'ambiente** (in `.env.local`, escluso da git)

| Variabile | Obbligatoria | Descrizione |
|-----------|:---:|-------------|
| `DATABASE_URL` | sì | Connection string Neon (`postgresql://…?sslmode=require`). In alternativa `POSTGRES_URL`. |
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
| `npm run db:schema` | Applica `db/schema.sql` al database (idempotente) |

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
Impostazioni; i predefiniti sono in `src/data/impostazioniDefault.js`.

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
scripts/_db.mjs         connessione a Neon (legge DATABASE_URL o .env.local)
scripts/applica_schema.mjs
server/index.mjs        API Express, in ascolto solo su 127.0.0.1
server/mappa.mjs        traduzione fra righe del DB e oggetti dell'app
src/
  views/                pagine (Dashboard, Clienti, Fatture, Impostazioni…)
  components/           componenti riusabili
  stores/               stato Pinia (clienti, fatture, prodotti, impostazioni)
  lib/
    calcoloFattura.js   imponibile, rivalsa, bollo, totale
    generaXml.js        XML FatturaPA 1.2 (FPR12)
    generaPdf.js        PDF di cortesia
  data/impostazioniDefault.js
tests/                  test Vitest delle funzioni pure (calcolo, XML, validazioni)
```

**Stack:** Vue 3 · Vite · Pinia · Vue Router · Express 5 · Postgres
(`@neondatabase/serverless`) · pdfmake · Heroicons.

## Stato del progetto

Il codice nasce da un gestionale personale reso generico. In
[REVIEW.md](REVIEW.md) c'è la revisione completa: 17 bug corretti e i problemi
noti ancora aperti. In breve:

- ✅ build di produzione provata;
- ✅ **43 test automatici** (`npm test`) su calcolo fattura, rivalsa, bollo,
  XML FatturaPA e validazioni di CF/P.IVA, compresi i bug già corretti;
- ⏳ query del server **non ancora provate** su un database nuovo e vuoto;
- ⏳ XML **non ancora passato** dal validatore ufficiale FatturaPA;
- ❌ nessun test sul server e sulle query (servono un database di prova);
- ❌ nessuna autenticazione: va bene in locale, non online;
- la modalità di pagamento nell'XML è sempre bonifico (MP05).

## Roadmap

L'obiettivo è coprire quello che serve a un forfettario per non pagare un
servizio esterno:

- [ ] test del server su un database di prova
- [ ] invio allo SdI via PEC e lettura delle ricevute (consegna, scarto)
- [ ] note di credito (TD04) per correggere una fattura emessa
- [ ] stima di imposta sostitutiva e contributi INPS sull'incassato, con le
      scadenze di acconti e saldo
- [ ] promemoria delle scadenze fiscali (F24, dichiarazione)
- [ ] controllo della soglia di ricavi del forfettario
- [ ] conservazione a norma (quella gratuita dell'Agenzia va attivata a mano)
- [ ] modalità di pagamento nell'XML presa dalla fattura

## Contribuire

Segnalazioni e pull request sono benvenute, soprattutto su:

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
