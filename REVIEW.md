# Review del codice di partenza

Questo progetto nasce da un gestionale personale. Prima di renderlo generico ne
abbiamo rivisto il codice. Qui c'è cosa abbiamo trovato e cosa è già stato
corretto in questa versione, così chi ci lavora sa da dove si parte.

Stato: **verificato con `vite build`, con 106 test Vitest sulle funzioni pure,
con 31 test Playwright nel browser (27 di accessibilità con axe-core) e con una
prova di tutte le API su un database PGlite nuovo e vuoto** (23 controlli).
Quella prova ha trovato il bug #18. I test di accessibilità hanno trovato i bug
#25 e #26.

## Bug corretti

| # | Dove | Problema | Effetto | Correzione |
|---|------|----------|---------|------------|
| 1 | `src/lib/generaXml.js` | `const imp = impostazioni` copriva la funzione `imp()` che formatta gli importi | **L'export XML falliva sempre** con `imp is not a function` (riprodotto) | Funzione rinominata `importo()` |
| 2 | `validaCampiXml` | Con codice destinatario `0000000` pretendeva la PEC del cliente | XML bloccato per quasi tutti i privati, che non hanno PEC | Controllo tolto: `0000000` senza PEC è il caso normale |
| 3 | `generaXml` | `DatiBollo` compariva solo se il bollo era addebitato al cliente | Se il bollo restava a tuo carico, l'XML non lo dichiarava e il conteggio del bollo virtuale da versare veniva sbagliato | `DatiBollo` c'è ogni volta che il bollo è dovuto |
| 4 | `generaXml` | Il bollo addebitato entrava nel totale ma non c'era una riga per lui | Totale del documento diverso dalla somma delle righe | Riga "Rimborso imposta di bollo" con Natura N1 e il suo riepilogo |
| 5 | `calcoloFattura.js` | La soglia del bollo si confrontava con l'imponibile senza la rivalsa | Fatture tra 74,49 € e 77,47 € di imponibile restavano senza bollo anche quando, rivalsa compresa, la soglia era superata | Soglia su imponibile + rivalsa (`bolloDovuto()`) |
| 6 | `PATCH /api/fatture/:id/stato` + `FatturaDettaglio` | Il pulsante "→ Emessa" su una bozza cambiava solo lo stato | **Fattura "emessa" senza numero** | Il pulsante passa dall'emissione vera; il server rifiuta il cambio di stato senza numero |
| 7 | `POST /api/fatture` | Le fatture esterne prendevano il numero successivo dell'app e non quello inserito | Il numero vero si perdeva e la numerazione dell'app veniva spostata | Le esterne conservano il loro numero |
| 8 | `PUT /api/fatture/:id` | Una fattura già emessa si poteva modificare in tutto (importi, cliente, data) | Documento fiscale emesso alterabile dopo l'invio | Su una fattura interna numerata si salva solo l'XML |
| 9 | server | Nessun controllo sull'ordine delle date | Si poteva emettere la n. 5 con data precedente alla n. 4 | Emissione rifiutata se la data è prima dell'ultima fattura dell'anno |
| 10 | server | Il numero veniva dall'`annoCorrente` salvato nelle impostazioni, non dalla data | A gennaio, finché nessuno cambiava le impostazioni, la numerazione continuava sull'anno vecchio | L'anno si ricava dalla data della fattura |
| 11 | Impostazioni | Il campo "Prossimo numero fattura" era modificabile ma il server lo ignorava | Si credeva di impostare il numero e non succedeva nulla | Ora è in sola lettura, con la spiegazione di come si parte da un numero diverso |
| 12 | `GET /api/impostazioni` | Su un database vuoto rispondeva 404 | Al primo avvio l'app non partiva | Restituisce i valori predefiniti con `confermato: false` |
| 13 | `schema` | `numero` era `NOT NULL` mentre le bozze lo salvano `NULL` | Salvare una bozza falliva su un database creato dallo schema | Schema unico e coerente: `numero` vuoto solo per le bozze (con un `CHECK`) |
| 14 | PDF/XML | La percentuale di rivalsa stampata veniva dalle impostazioni di oggi, non da quella della fattura | Una fattura vecchia ristampata dopo un cambio di percentuale mostrava un numero sbagliato | Si usa `percentualeRivalsa` salvata sulla fattura |
| 15 | Impostazioni | Si poteva scegliere il regime RF01 (ordinario) | Calcoli e XML sono solo da forfettario: con RF01 si generava un XML sbagliato | Solo RF19 |
| 16 | Impostazioni | La dicitura di legge non aveva limite | Oltre i 100 caratteri di `RiferimentoNormativo` lo SdI scarta la fattura | Controllo sia in Impostazioni sia prima di generare l'XML |
| 17 | server | Un numero già usato produceva un 500 generico | Messaggio incomprensibile | Risposta 409 con la spiegazione |
| 18 | `POST /api/fatture` (esterne) | La query della correzione #7 usava `$1` sia come intero (`numero`) sia come testo (`$1 \|\| '/'`) | **Registrare una fattura esterna dava sempre 500** (`inconsistent types deduced for parameter $1`), su PGlite come su Neon | Cast espliciti `$1::int::text` |
| 19 | Scheda cliente | Con codice destinatario `0000000` pretendeva la PEC: lo stesso errore del #2, rimasto nel form | **Un privato senza PEC non si poteva salvare** | Schema zod in `src/lib/clientSchema.js`: `0000000` senza PEC è valido. La PEC si controlla solo se c'è |
| 20 | Nuova fattura e fattura esterna | Una riga con prezzo ma senza descrizione entrava negli importi, ma non veniva salvata fra le righe | **Totale della fattura diverso dalla somma delle sue righe**, anche nell'XML | Gli importi si calcolano solo sulle righe salvate (`buildInvoice` in `src/lib/invoiceDraft.js`), in tutte e due le schermate |
| 21 | Fattura esterna | Il form chiedeva l'anno, ma dopo la correzione #10 il server lo prende dalla data | Registrando la 7/2025 con una data del 2026 si salvava la **7/2026**, senza avviso | Campo Anno tolto. Il form mostra il numero che risulterà, con l'anno preso dalla data |
| 22 | Impostazioni | I campi soglia e importo del bollo e % rivalsa non avevano controlli: un campo svuotato si salvava vuoto | Con la soglia vuota, una fattura da 50 € prendeva **2 € di bollo**, dovuto solo sopra 77,47 € | Schema zod: con l'opzione attiva, importi obbligatori e di 0 o più, percentuale da 0 a 100 |
| 23 | Avvio | Al primo avvio la Dashboard doveva portare alle Impostazioni, ma il controllo leggeva la rotta prima che il router la risolvesse | Con i dati del cedente mai confermati, l'app restava sulla Dashboard, senza benvenuto | `App.vue` aspetta `router.isReady()` prima del controllo |
| 24 | Clienti, Prodotti, Dettaglio fattura | L'eliminazione non gestiva l'errore del server: il 409 di un cliente con fatture, o un server spento | **La conferma restava aperta senza nessun messaggio**, e cliccare di nuovo non cambiava niente | La conferma si chiude e compare il messaggio del server. Test Playwright in `tests/e2e/_delete-errors.spec.js` |
| 25 | Nuova fattura e fattura esterna | I link erano nel verde del marchio (`#a8d418`) su fondo chiaro | Contrasto sotto 4.5:1: il link "crea cliente" dell'avviso senza clienti era **quasi illeggibile** (WCAG 1.4.3) | Il link prende il colore del testo intorno ed è sottolineato. Test in `tests/a11y/_basic.spec.js` con la lista clienti forzata vuota |
| 26 | Finestra di conferma | La vista smonta il `<dialog>` invece di chiuderlo, e il browser non rimette il focus | Dopo Esc o Annulla il focus finiva sulla pagina: **con la tastiera si ripartiva dall'inizio** (WCAG 2.4.3) | `ConfirmDialog` ricorda chi aveva il focus all'apertura e glielo rende quando si smonta. Test in `tests/a11y/_navigation.spec.js` |

## Cose tolte perché legate al progetto d'origine

- dati personali del titolare e dei clienti, in codice e documentazione;
- connessione al database di un altro progetto e tabelle che non sono di questa
  app (ordini, preventivi, anteprime, statistiche di vendita);
- "materie" (categorie specifiche di un'attività) su fatture e dashboard;
- catalogo prodotti precaricato, loghi, script di import dei PDF storici.

## Da fare: problemi noti non ancora corretti

- **Concorrenza sul numero**: `MAX(numero)+1` dentro l'INSERT è corretto ma non
  serializzato. Due emissioni nello stesso istante: una riceve 409 e va
  ripetuta. Per un utente solo va bene; con più utenti sullo stesso database
  serve un advisory lock o una tabella contatore con `SELECT … FOR UPDATE`.
- **Dati del cedente nell'XML**: si prendono dalle impostazioni di oggi, non da
  una fotografia salvata all'emissione. Se cambi indirizzo e rigeneri l'XML di
  una fattura vecchia, esce il nuovo. Conviene salvare `cedente_snapshot`
  come già si fa per il cliente.
- **Modalità di pagamento nell'XML**: è sempre MP05 (bonifico), anche se sulla
  fattura c'è PayPal o contanti.
- **Nessuna autenticazione sulle API**: oggi va bene perché il server ascolta
  solo su 127.0.0.1. Prima di metterlo online serve un login.
- **Test solo sulle funzioni pure**: `invoiceMath`, `invoiceXml` e le
  validazioni di CF/P.IVA e gli schemi dei form hanno 106 test Vitest
  (`npm test`), compresi i bug #2, #3, #5, #16, #19, #20, #21 e #22. Server e query non hanno ancora test: servono un database
  di prova. I test Playwright (`npm run test:e2e`) partono già su un database
  di prova, ma oggi provano l'accessibilità e le eliminazioni rifiutate (bug
  #24), non le regole fiscali del server.
- **Accessibilità oltre axe**: un controllo automatico non vede tutto (ordine
  di lettura, testi che hanno senso solo a vista). Mancano una prova con un
  lettore di schermo (NVDA) e una prova di zoom al 200%.
- **Bundle**: `FatturaDettaglio` pesa 2,2 MB perché include pdfmake con i
  font. Si può caricare pdfmake solo quando si genera il PDF (`import()`).
- **XML da validare**: il tracciato va provato con il validatore ufficiale
  FatturaPA su casi reali (privato, azienda, PA, con e senza bollo) prima di
  usarlo per fatture vere.
