# infischiozen

Fatturazione per partite IVA in **regime forfettario**: anagrafica clienti,
catalogo servizi, fatture con calcolo automatico di rivalsa INPS e marca da
bollo, PDF di cortesia e **XML FatturaPA 1.2** pronto per il Sistema di
Interscambio.

Gira in locale: un'app Vue nel browser e un piccolo server Node che parla al
tuo database Neon. Ognuno usa **il proprio database**: i dati non passano
mai da questo repository.

## Cosa fa oggi

- **Clienti**: privati, aziende e PA, con CF/P.IVA validati, codice
  destinatario SdI e PEC.
- **Prodotti e servizi**: un catalogo con i prezzi, da richiamare nelle righe.
- **Fatture**:
  - bozza → emissione, con il numero assegnato dal database al momento
    dell'emissione (progressivo, niente buchi né doppioni, in ordine di data);
  - forfettario: niente IVA (Natura N2.2), rivalsa INPS 4% aggiunta oppure
    scorporata dal prezzo, marca da bollo sopra 77,47 €;
  - stati: emessa, inviata, pagata, annullata (una fattura numerata non si
    cancella, si annulla);
  - **PDF** di cortesia e **XML FatturaPA** da scaricare;
  - registrazione delle fatture **emesse con un altro software**, con il
    loro numero, così il fatturato è completo e la numerazione continua.
- **Dashboard**: fatturato per mese, andamento progressivo, fatture non pagate,
  concentrazione sui primi clienti.

## Avvio

Serve Node 20+ e un database [Neon](https://neon.tech) (Postgres): basta il
piano gratuito. Scegli una regione UE, perché ci finiscono i dati fiscali dei
tuoi clienti. Il driver usato (`@neondatabase/serverless`) parla HTTP e
funziona solo con Neon; per un Postgres qualsiasi andrebbe sostituito con `pg`.

```bash
npm install
cp .env.example .env.local     # poi metti la TUA connection string in .env.local
npm run db:schema              # crea le tabelle (si può rilanciare senza danni)
npm run dev                    # API su :3001 + interfaccia su http://localhost:5173
```

Al primo avvio l'app apre **Impostazioni**: compila i tuoi dati (nome, CF,
P.IVA, sede, IBAN). Se hai già emesso fatture quest'anno con un altro software,
registrale da *Fatture → Registra fattura esterna* con il loro numero: la
prossima fattura dell'app partirà dal numero successivo.

## Inviare la fattura all'Agenzia delle Entrate

L'app genera l'XML ma **non lo invia ancora**. Oggi le strade sono:

1. caricare l'XML a mano sul portale *Fatture e Corrispettivi* dell'Agenzia
   delle Entrate;
2. *(in programma)* inviarlo via PEC al Sistema di Interscambio;
3. *(in programma)* passare da un intermediario accreditato con API.

Il cassetto fiscale non è un canale di invio: serve a consultare, non a
trasmettere.

Prima di usare l'XML per una fattura vera, controllalo con un validatore
FatturaPA (per esempio quello sul sito FatturaPA dell'Agenzia).

## Dove vogliamo arrivare

L'obiettivo è coprire quello che serve a un forfettario per non pagare un
servizio esterno:

- [ ] invio allo SdI via PEC e lettura delle ricevute (consegna, scarto)
- [ ] note di credito (TD04) per correggere una fattura emessa
- [ ] stima di imposta sostitutiva e contributi INPS sull'incassato, con le
      scadenze di acconti e saldo
- [ ] promemoria delle scadenze fiscali (F24, dichiarazione)
- [ ] controllo della soglia di ricavi del forfettario
- [ ] conservazione a norma (quella gratuita dell'Agenzia va attivata a mano)
- [ ] modalità di pagamento nell'XML presa dalla fattura (oggi è sempre bonifico)

## Struttura

```
server/        API Express (solo 127.0.0.1) e traduzione DB ↔ app
scripts/       connessione al DB e applicazione dello schema
db/schema.sql  lo schema completo
src/           app Vue 3 (views, stores Pinia, lib di calcolo/PDF/XML)
```

Stack: Vue 3 · Vite · Pinia · Vue Router · Express · Postgres
(`@neondatabase/serverless`) · pdfmake.

## Avvertenze

Questo software non sostituisce un commercialista. I calcoli e il tracciato XML
seguono le regole del forfettario come le abbiamo capite: verificali sui tuoi
casi prima di emettere fatture vere.
