<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientiStore } from '../stores/clienti'
import { useProdottiStore } from '../stores/prodotti'
import { useFattureStore } from '../stores/fatture'
import { useImpostazioniStore } from '../stores/impostazioni'
import { calcolaFattura, totaleRiga } from '../lib/calcoloFattura'
import { formatEuro, oggiISO } from '../lib/format'
import RigaFattura from '../components/RigaFattura.vue'

const router = useRouter()
const clientiStore = useClientiStore()
const prodottiStore = useProdottiStore()
const fattureStore = useFattureStore()
const impostazioniStore = useImpostazioniStore()

const step = ref(1)
const clienteId = ref('')
const righe = ref([rigaVuota()])
const data = ref(oggiISO())
const modalitaPagamento = ref('Bonifico')
const scadenzaPagamento = ref('')
const note = ref('')
const errore = ref('')
const applicaRivalsa = ref(true)

onMounted(async () => {
  await Promise.all([
    clientiStore.carica(),
    prodottiStore.carica(),
    impostazioniStore.carica()
  ])
  // La rivalsa INPS sulla singola fattura parte dal default delle Impostazioni.
  applicaRivalsa.value = !!(impostazioniStore.dati && impostazioniStore.dati.applicaRivalsaInps)
})

function rigaVuota() {
  return { prodottoId: null, descrizione: '', quantita: 1, prezzoUnitario: 0 }
}

function nomeCliente(c) {
  if (!c) return ''
  if (c.tipo === 'privato') return `${c.cognome || ''} ${c.nome || ''}`.trim()
  return c.ragioneSociale || `${c.cognome || ''} ${c.nome || ''}`.trim()
}

const clienteSelezionato = computed(() =>
  clientiStore.lista.find((c) => String(c.id) === String(clienteId.value))
)

// Config di calcolo: parte dalle Impostazioni ma applica l'override per-fattura della rivalsa.
const configCalcolo = computed(() => ({
  ...(impostazioniStore.dati || {}),
  applicaRivalsaInps: applicaRivalsa.value
}))
const calcolo = computed(() => calcolaFattura(righe.value, configCalcolo.value))

function aggiungiRiga() {
  righe.value.push(rigaVuota())
}
function aggiornaRiga(i, nuova) {
  righe.value[i] = nuova
}
function rimuoviRiga(i) {
  righe.value.splice(i, 1)
  if (!righe.value.length) righe.value.push(rigaVuota())
}

function avanti() {
  errore.value = ''
  if (step.value === 1) {
    if (!clienteSelezionato.value) {
      errore.value = 'Seleziona un cliente per proseguire.'
      return
    }
  }
  if (step.value === 2) {
    const valide = righe.value.filter((r) => r.descrizione && totaleRiga(r) >= 0)
    if (!valide.length || !righe.value.some((r) => r.descrizione)) {
      errore.value = 'Aggiungi almeno una riga con descrizione.'
      return
    }
  }
  step.value++
}
function indietro() {
  errore.value = ''
  step.value--
}

function costruisciFattura() {
  const c = clienteSelezionato.value
  const calc = calcolo.value
  const righePulite = righe.value
    .filter((r) => r.descrizione)
    .map((r) => ({
      prodottoId: r.prodottoId || null,
      descrizione: r.descrizione,
      quantita: Number(r.quantita) || 0,
      prezzoUnitario: Number(r.prezzoUnitario) || 0,
      totaleRiga: totaleRiga(r)
    }))
  return {
    data: data.value,
    origine: 'interna',
    clienteId: c.id,
    clienteSnapshot: { ...c },
    righe: righePulite,
    imponibile: calc.imponibile,
    applicaRivalsaInps: applicaRivalsa.value,
    percentualeRivalsa: applicaRivalsa.value
      ? Number(impostazioniStore.dati?.percentualeRivalsaInps) || 0
      : 0,
    rivalsaInps: calc.rivalsaInps,
    marcaDaBollo: calc.marcaDaBollo,
    totale: calc.totale,
    note: note.value,
    modalitaPagamento: modalitaPagamento.value,
    scadenzaPagamento: scadenzaPagamento.value,
    xmlString: '',
    pdfEsternoBlob: null
  }
}

async function salvaBozza() {
  if (!clienteSelezionato.value) {
    errore.value = 'Seleziona un cliente.'
    return
  }
  const id = await fattureStore.salvaBozza(costruisciFattura())
  router.push({ name: 'fattura-dettaglio', params: { id } })
}

async function emetti() {
  if (!righe.value.some((r) => r.descrizione)) {
    errore.value = 'Aggiungi almeno una riga.'
    return
  }
  const id = await fattureStore.emetti(costruisciFattura())
  router.push({ name: 'fattura-dettaglio', params: { id } })
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Nuova fattura</h1>
      <button class="btn" @click="router.push({ name: 'fatture' })">Annulla</button>
    </div>

    <div class="wizard-steps">
      <div class="wizard-step" :class="{ attivo: step === 1, completo: step > 1 }">1. Cliente</div>
      <div class="wizard-step" :class="{ attivo: step === 2, completo: step > 2 }">2. Righe</div>
      <div class="wizard-step" :class="{ attivo: step === 3 }">3. Riepilogo</div>
    </div>

    <div v-if="errore" class="avviso avviso-err">{{ errore }}</div>

    <!-- STEP 1 — Cliente -->
    <div v-if="step === 1" class="card">
      <div class="card-titolo">Seleziona il cliente</div>
      <div v-if="!clientiStore.lista.length" class="avviso avviso-warn">
        Nessun cliente in anagrafica.
        <span class="link-azione" @click="router.push({ name: 'cliente-nuovo' })">Crea un cliente</span>.
      </div>
      <div v-else class="data-field">
        <label>Cliente <span class="obbligatorio">*</span></label>
        <select v-model="clienteId">
          <option value="">— Seleziona —</option>
          <option v-for="c in clientiStore.lista" :key="c.id" :value="c.id">
            {{ nomeCliente(c) }}
          </option>
        </select>
        <div class="hint">
          <span class="link-azione" @click="router.push({ name: 'cliente-nuovo' })">+ Nuovo cliente</span>
        </div>
      </div>

      <div v-if="clienteSelezionato" class="riquadro-cliente">
        <strong>{{ nomeCliente(clienteSelezionato) }}</strong><br />
        {{ clienteSelezionato.indirizzo }}<br />
        {{ clienteSelezionato.cap }} {{ clienteSelezionato.citta }} ({{ clienteSelezionato.provincia }})<br />
        <span class="muted small">
          {{ clienteSelezionato.partitaIVA ? 'P.IVA: ' + clienteSelezionato.partitaIVA : 'C.F.: ' + clienteSelezionato.codiceFiscale }}
        </span>
      </div>
    </div>

    <!-- STEP 2 — Righe -->
    <div v-if="step === 2" class="card">
      <div class="card-titolo">Righe della fattura</div>
      <div class="riga-intestazione">
        <div>Prodotto a catalogo</div>
        <div>Descrizione</div>
        <div>Q.tà</div>
        <div>Prezzo unit.</div>
        <div style="text-align:right">Totale</div>
        <div></div>
      </div>
      <RigaFattura
        v-for="(r, i) in righe"
        :key="i"
        :riga="r"
        :prodotti="prodottiStore.attivi"
        @update="(nuova) => aggiornaRiga(i, nuova)"
        @rimuovi="rimuoviRiga(i)"
      />
      <button class="btn btn-sm" style="margin-top:12px" @click="aggiungiRiga">+ Aggiungi riga</button>

      <div class="riepilogo-importi" style="margin-top:20px">
        <div class="riga"><span>Imponibile</span><span>{{ formatEuro(calcolo.imponibile) }}</span></div>
        <div v-if="calcolo.rivalsaInps" class="riga">
          <span>Rivalsa INPS</span><span>{{ formatEuro(calcolo.rivalsaInps) }}</span>
        </div>
        <div v-if="calcolo.marcaDaBollo" class="riga">
          <span>Marca da bollo</span><span>{{ formatEuro(calcolo.marcaDaBollo) }}</span>
        </div>
        <div class="riga totale"><span>Totale</span><span>{{ formatEuro(calcolo.totale) }}</span></div>
      </div>
    </div>

    <!-- STEP 3 — Riepilogo -->
    <div v-if="step === 3">
      <div class="card">
        <div class="card-titolo">Dati documento</div>
        <div class="form-griglia">
          <div class="data-field">
            <label>Data fattura</label>
            <input type="date" v-model="data" />
          </div>
          <div class="data-field">
            <label>Modalità di pagamento</label>
            <select v-model="modalitaPagamento">
              <option>Bonifico</option>
              <option>PayPal</option>
              <option>Contanti</option>
              <option>Altro</option>
            </select>
          </div>
          <div class="data-field">
            <label>Scadenza pagamento</label>
            <input type="date" v-model="scadenzaPagamento" />
          </div>
          <div class="data-field">
            <label>Rivalsa INPS</label>
            <label class="small" style="display:flex;align-items:center;gap:8px;font-weight:500;">
              <input type="checkbox" v-model="applicaRivalsa" style="width:auto;" />
              Applica rivalsa {{ impostazioniStore.dati?.percentualeRivalsaInps || 4 }}% GS INPS
            </label>
          </div>
          <div class="data-field full">
            <label>Note</label>
            <textarea v-model="note" placeholder="Note aggiuntive (facoltative)"></textarea>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-titolo">Riepilogo importi</div>
        <table>
          <thead><tr><th>Descrizione</th><th class="num">Q.tà</th><th class="num">Prezzo</th><th class="num">Totale</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in righe.filter(x => x.descrizione)" :key="i">
              <td>{{ r.descrizione }}</td>
              <td class="num">{{ r.quantita }}</td>
              <td class="num">{{ formatEuro(r.prezzoUnitario) }}</td>
              <td class="num">{{ formatEuro(totaleRiga(r)) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="riepilogo-importi" style="margin-top:16px">
          <div class="riga"><span>Totale prestazioni</span><span>{{ formatEuro(calcolo.imponibile) }}</span></div>
          <div v-if="calcolo.rivalsaInps" class="riga">
            <span>Rivalsa {{ impostazioniStore.dati?.percentualeRivalsaInps }}% GS INPS</span>
            <span>{{ formatEuro(calcolo.rivalsaInps) }}</span>
          </div>
          <div v-if="calcolo.marcaDaBollo" class="riga">
            <span>Marca da bollo</span><span>{{ formatEuro(calcolo.marcaDaBollo) }}</span>
          </div>
          <div class="riga totale"><span>Totale documento</span><span>{{ formatEuro(calcolo.totale) }}</span></div>
        </div>
      </div>
    </div>

    <!-- Navigazione -->
    <div class="btn-row" style="margin-top:20px">
      <button v-if="step > 1" class="btn" @click="indietro">← Indietro</button>
      <button v-if="step < 3" class="btn btn-primario" @click="avanti">Avanti →</button>
      <template v-if="step === 3">
        <button class="btn" @click="salvaBozza">Salva bozza</button>
        <button class="btn btn-primario" @click="emetti">Emetti fattura</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.riquadro-cliente {
  margin-top: 16px;
  padding: 14px;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--bordo);
}
.riga-intestazione {
  display: grid;
  grid-template-columns: 1.3fr 2fr 0.7fr 1fr 1fr 40px;
  gap: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--testo-soft);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--bordo);
}
@media (max-width: 720px) {
  .riga-intestazione { display: none; }
}
</style>
