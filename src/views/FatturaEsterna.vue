<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientiStore } from '../stores/clienti'
import { useFattureStore } from '../stores/fatture'
import { useImpostazioniStore } from '../stores/impostazioni'
import { calcolaFattura, totaleRiga } from '../lib/calcoloFattura'
import { formatEuro, oggiISO } from '../lib/format'
import RigaFattura from '../components/RigaFattura.vue'

const router = useRouter()
const clientiStore = useClientiStore()
const fattureStore = useFattureStore()
const impostazioniStore = useImpostazioniStore()

const errore = ref('')
const fileNome = ref('')
let pdfBlob = null

const form = ref({
  numero: '',
  anno: new Date().getFullYear(),
  data: oggiISO(),
  clienteId: '',
  modalitaPagamento: 'Bonifico',
  stato: 'pagata',
  note: ''
})
const righe = ref([rigaVuota()])
const applicaRivalsa = ref(true)

function rigaVuota() {
  return { prodottoId: null, descrizione: '', quantita: 1, prezzoUnitario: 0 }
}

onMounted(async () => {
  await Promise.all([
    clientiStore.carica(),
    impostazioniStore.carica()
  ])
  applicaRivalsa.value = !!(impostazioniStore.dati && impostazioniStore.dati.applicaRivalsaInps)
})

function nomeCliente(c) {
  if (!c) return ''
  if (c.tipo === 'privato') return `${c.cognome || ''} ${c.nome || ''}`.trim()
  return c.ragioneSociale || `${c.cognome || ''} ${c.nome || ''}`.trim()
}

const clienteSelezionato = computed(() =>
  clientiStore.lista.find((c) => String(c.id) === String(form.value.clienteId))
)

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

function caricaPdf(e) {
  const file = e.target.files[0]
  if (!file) return
  pdfBlob = file
  fileNome.value = file.name
}
function rimuoviPdf() {
  pdfBlob = null
  fileNome.value = ''
}

const statiOpzioni = [
  { value: 'emessa', label: 'Emessa' },
  { value: 'inviata', label: 'Inviata' },
  { value: 'pagata', label: 'Pagata' },
  { value: 'annullata', label: 'Annullata' }
]

async function salva() {
  errore.value = ''
  const f = form.value
  if (!f.numero) { errore.value = 'Inserisci il numero della fattura.'; return }
  if (!f.anno) { errore.value = 'Inserisci l\'anno.'; return }
  if (!clienteSelezionato.value) { errore.value = 'Seleziona un cliente.'; return }
  if (!righe.value.some((r) => r.descrizione)) { errore.value = 'Aggiungi almeno una riga con descrizione.'; return }

  const righePulite = righe.value
    .filter((r) => r.descrizione)
    .map((r) => ({
      prodottoId: r.prodottoId || null,
      descrizione: r.descrizione,
      quantita: Number(r.quantita) || 0,
      prezzoUnitario: Number(r.prezzoUnitario) || 0,
      totaleRiga: totaleRiga(r)
    }))

  const calc = calcolo.value
  const c = clienteSelezionato.value
  const id = await fattureStore.salvaEsterna({
    numero: Number(f.numero),
    anno: Number(f.anno),
    data: f.data,
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
    stato: f.stato,
    note: f.note,
    modalitaPagamento: f.modalitaPagamento,
    scadenzaPagamento: '',
    pdfEsternoBlob: pdfBlob
  })
  router.push({ name: 'fattura-dettaglio', params: { id } })
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Registra fattura esterna</h1>
      <button class="btn" @click="router.push({ name: 'fatture' })">Annulla</button>
    </div>

    <div class="avviso avviso-info">
      Registra una fattura emessa altrove (es. con un altro software o un intermediario) per contabilizzarla
      nel fatturato. Non viene generato XML né PDF: il documento ufficiale resta
      quello dell'intermediario. Il numero che inserisci viene conservato così
      com'è: la numerazione è una sola per partita IVA, quindi le fatture create
      dall'app continueranno dal numero successivo.
    </div>
    <div v-if="errore" class="avviso avviso-err">{{ errore }}</div>

    <div class="card">
      <div class="card-titolo">Dati documento</div>
      <div class="form-griglia">
        <div class="data-field">
          <label>Numero fattura <span class="obbligatorio">*</span></label>
          <input type="number" v-model="form.numero" step="1" min="1" />
        </div>
        <div class="data-field">
          <label>Anno <span class="obbligatorio">*</span></label>
          <input type="number" v-model="form.anno" step="1" />
        </div>
        <div class="data-field">
          <label>Data</label>
          <input type="date" v-model="form.data" />
        </div>
        <div class="data-field">
          <label>Stato</label>
          <select v-model="form.stato">
            <option v-for="s in statiOpzioni" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="data-field">
          <label>Modalità di pagamento</label>
          <select v-model="form.modalitaPagamento">
            <option>Bonifico</option>
            <option>PayPal</option>
            <option>Contanti</option>
            <option>Altro</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Cliente</div>
      <div v-if="!clientiStore.lista.length" class="avviso avviso-warn">
        Nessun cliente in anagrafica.
        <span class="link-azione" @click="router.push({ name: 'cliente-nuovo' })">Crea un cliente</span>.
      </div>
      <div v-else class="data-field">
        <label>Cliente <span class="obbligatorio">*</span></label>
        <select v-model="form.clienteId">
          <option value="">— Seleziona —</option>
          <option v-for="c in clientiStore.lista" :key="c.id" :value="c.id">
            {{ nomeCliente(c) }}
          </option>
        </select>
        <div class="hint">
          <span class="link-azione" @click="router.push({ name: 'cliente-nuovo' })">+ Nuovo cliente</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Righe</div>
      <RigaFattura
        v-for="(r, i) in righe"
        :key="i"
        :riga="r"
        :prodotti="[]"
        @update="(nuova) => aggiornaRiga(i, nuova)"
        @rimuovi="rimuoviRiga(i)"
      />
      <button class="btn btn-sm" style="margin-top:12px" @click="aggiungiRiga">+ Aggiungi riga</button>

      <div class="data-field" style="margin-top:16px">
        <label>Rivalsa INPS</label>
        <label class="small" style="display:flex;align-items:center;gap:8px;font-weight:500;">
          <input type="checkbox" v-model="applicaRivalsa" style="width:auto;" />
          Applica rivalsa {{ impostazioniStore.dati?.percentualeRivalsaInps || 4 }}% GS INPS
        </label>
      </div>

      <div class="riepilogo-importi" style="margin-top:12px">
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

    <div class="card">
      <div class="card-titolo">PDF della fattura (allegato)</div>
      <p v-if="!fileNome" class="muted small">
        Allega il PDF originale della fattura (quello generato dal software con cui l'hai emessa).
      </p>
      <p v-else class="small">📎 {{ fileNome }}</p>
      <div class="btn-row" style="margin-top:10px">
        <label class="btn btn-sm">
          {{ fileNome ? 'Sostituisci PDF' : 'Allega PDF' }}
          <input type="file" accept="application/pdf" style="display:none" @change="caricaPdf" />
        </label>
        <button v-if="fileNome" class="btn btn-sm" @click="rimuoviPdf">Rimuovi</button>
      </div>
    </div>

    <div class="card">
      <div class="data-field">
        <label>Note</label>
        <textarea v-model="form.note" placeholder="Note (facoltative)"></textarea>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn" @click="router.push({ name: 'fatture' })">Annulla</button>
      <button class="btn btn-primario" @click="salva">Registra fattura</button>
    </div>
  </div>
</template>
