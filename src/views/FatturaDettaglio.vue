<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFattureStore } from '../stores/fatture'
import { useImpostazioniStore } from '../stores/impostazioni'
import { formatEuro, formatData } from '../lib/format'
import { generaPdf } from '../lib/generaPdf'
import { generaXml, validaCampiXml, nomeFileXml } from '../lib/generaXml'
import ModaleConferma from '../components/ModaleConferma.vue'

const route = useRoute()
const router = useRouter()
const fattureStore = useFattureStore()
const impostazioniStore = useImpostazioniStore()

const fattura = ref(null)
const erroreXml = ref([])
const messaggio = ref('')
const daEliminare = ref(false)

onMounted(async () => {
  await impostazioniStore.carica()
  fattura.value = await fattureStore.get(route.params.id)
  if (!fattura.value) router.replace({ name: 'fatture' })
})

const etichettaStato = {
  bozza: 'Bozza', emessa: 'Emessa', inviata: 'Inviata',
  pagata: 'Pagata', annullata: 'Annullata'
}

// Transizioni di stato consentite.
const statiDisponibili = computed(() => {
  const f = fattura.value
  if (!f) return []
  const mappa = {
    bozza: ['emessa', 'annullata'],
    emessa: ['inviata', 'pagata', 'annullata'],
    inviata: ['pagata', 'annullata'],
    pagata: ['annullata'],
    annullata: []
  }
  return mappa[f.stato] || []
})

const isBozza = computed(() => fattura.value && fattura.value.stato === 'bozza')
const isEsterna = computed(() => fattura.value && fattura.value.origine === 'esterna')

function nomeCliente(c) {
  if (!c) return ''
  if (c.tipo === 'privato') return `${c.cognome || ''} ${c.nome || ''}`.trim()
  return c.ragioneSociale || `${c.cognome || ''} ${c.nome || ''}`.trim()
}

const numero = computed(() =>
  fattura.value && fattura.value.numero
    ? `${fattura.value.numero}/${fattura.value.anno}`
    : 'Bozza'
)

async function scaricaPdf() {
  messaggio.value = ''
  try {
    await generaPdf(fattura.value, impostazioniStore.dati)
  } catch (e) {
    messaggio.value = 'Errore nella generazione del PDF: ' + e.message
  }
}

async function scaricaXml() {
  erroreXml.value = []
  messaggio.value = ''
  const errori = validaCampiXml(fattura.value, impostazioniStore.dati)
  if (errori.length) {
    erroreXml.value = errori
    return
  }
  const xml = generaXml(fattura.value, impostazioniStore.dati)
  // Salva l'XML sulla fattura alla prima generazione.
  if (!fattura.value.xmlString) {
    await fattureStore.salvaXml(fattura.value.id, xml)
    fattura.value.xmlString = xml
  }
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFileXml(fattura.value, impostazioniStore.dati)
  a.click()
  URL.revokeObjectURL(url)
}

async function cambiaStato(nuovo) {
  messaggio.value = ''
  try {
    // Una bozza che diventa emessa deve prendere il suo numero: passa
    // dall'emissione, non da un semplice cambio di stato.
    if (nuovo === 'emessa' && !fattura.value.numero) {
      await fattureStore.emetti(fattura.value)
    } else {
      await fattureStore.cambiaStato(fattura.value.id, nuovo)
    }
    fattura.value = await fattureStore.get(fattura.value.id)
  } catch (e) {
    messaggio.value = e.message
  }
}

async function confermaElimina() {
  await fattureStore.elimina(fattura.value.id)
  router.push({ name: 'fatture' })
}

async function inviaSdI() {
  try {
    await fattureStore.inviaSdI(fattura.value)
  } catch (e) {
    messaggio.value = e.message
  }
}

// Scarica il PDF allegato a una fattura esterna.
function scaricaPdfEsterno() {
  if (!fattura.value.pdfEsternoBlob) return
  const url = URL.createObjectURL(fattura.value.pdfEsternoBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Fattura ${fattura.value.numero}-${fattura.value.anno} (esterna).pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// Allega o sostituisce il PDF di una fattura esterna.
async function allegaPdf(e) {
  const file = e.target.files[0]
  if (!file) return
  await fattureStore.allegaPdfEsterno(fattura.value.id, file)
  fattura.value = await fattureStore.get(fattura.value.id)
  messaggio.value = ''
}
</script>

<template>
  <div v-if="fattura">
    <div class="page-header">
      <h1>Fattura {{ numero }}</h1>
      <div class="btn-row" style="align-items:center">
        <span class="badge" :class="isEsterna ? 'badge-pa' : 'badge-emessa'">
          {{ isEsterna ? 'Esterna' : 'Creata con l\'app' }}
        </span>
        <span class="badge" :class="`badge-${fattura.stato}`">{{ etichettaStato[fattura.stato] }}</span>
      </div>
    </div>

    <div v-if="messaggio" class="avviso avviso-warn">{{ messaggio }}</div>
    <div v-if="erroreXml.length" class="avviso avviso-err">
      <strong>Impossibile generare l'XML:</strong>
      <ul style="margin:6px 0 0 18px">
        <li v-for="(e, i) in erroreXml" :key="i">{{ e }}</li>
      </ul>
    </div>

    <!-- Azioni — fattura interna -->
    <div v-if="!isEsterna" class="card">
      <div class="btn-row">
        <button class="btn btn-primario" @click="scaricaPdf">⬇ Scarica PDF</button>
        <button class="btn" @click="scaricaXml">⬇ Scarica XML FatturaPA</button>
        <button
          class="btn"
          disabled
          title="Disponibile in una versione futura"
          @click="inviaSdI"
        >
          Invia a SdI
        </button>
        <button
          v-if="isBozza"
          class="btn btn-pericolo"
          @click="daEliminare = true"
        >
          Elimina bozza
        </button>
      </div>
      <p class="muted small" style="margin-top:10px">
        L'invio automatico al Sistema di Interscambio sarà disponibile in una
        versione futura. Per ora carica l'XML scaricato sul portale
        «Fatture e Corrispettivi» dell'Agenzia delle Entrate.
      </p>
    </div>

    <!-- Azioni — fattura esterna -->
    <div v-else class="card">
      <div class="btn-row">
        <button
          v-if="fattura.pdfEsternoBlob"
          class="btn btn-primario"
          @click="scaricaPdfEsterno"
        >
          ⬇ Scarica PDF allegato
        </button>
        <label class="btn">
          {{ fattura.pdfEsternoBlob ? 'Sostituisci PDF allegato' : 'Allega PDF' }}
          <input type="file" accept="application/pdf" style="display:none" @change="allegaPdf" />
        </label>
      </div>
      <p class="muted small" style="margin-top:10px">
        Questa fattura è stata emessa con un altro software o intermediario e
        registrata qui solo per il fatturato. Il documento fiscale ufficiale è
        quello dell'intermediario: l'app non genera PDF né XML per le fatture
        esterne.
      </p>
    </div>

    <!-- Cambio stato -->
    <div v-if="statiDisponibili.length" class="card">
      <div class="card-titolo">Cambia stato</div>
      <div class="btn-row">
        <button
          v-for="s in statiDisponibili"
          :key="s"
          class="btn btn-sm"
          @click="cambiaStato(s)"
        >
          → {{ etichettaStato[s] }}
        </button>
      </div>
    </div>

    <!-- Anagrafiche -->
    <div class="card">
      <div class="due-col">
        <div>
          <div class="card-titolo">Cliente</div>
          <strong>{{ nomeCliente(fattura.clienteSnapshot) }}</strong><br />
          {{ fattura.clienteSnapshot?.indirizzo }}<br />
          {{ fattura.clienteSnapshot?.cap }} {{ fattura.clienteSnapshot?.citta }}
          ({{ fattura.clienteSnapshot?.provincia }})<br />
          <span class="muted small">
            <template v-if="fattura.clienteSnapshot?.codiceFiscale">C.F.: {{ fattura.clienteSnapshot.codiceFiscale }}<br /></template>
            <template v-if="fattura.clienteSnapshot?.partitaIVA">P.IVA: {{ fattura.clienteSnapshot.partitaIVA }}</template>
          </span>
        </div>
        <div>
          <div class="card-titolo">Documento</div>
          <div class="small">Data: <strong>{{ formatData(fattura.data) }}</strong></div>
          <div class="small">Pagamento: {{ fattura.modalitaPagamento || '—' }}</div>
          <div class="small">Scadenza: {{ fattura.scadenzaPagamento ? formatData(fattura.scadenzaPagamento) : '—' }}</div>
        </div>
      </div>
    </div>

    <!-- Righe -->
    <div class="card" style="padding:0">
      <table>
        <thead>
          <tr>
            <th>Descrizione</th>
            <th class="num">Q.tà</th>
            <th class="num">Prezzo unit.</th>
            <th class="num">Totale</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in fattura.righe" :key="i">
            <td>{{ r.descrizione }}</td>
            <td class="num">{{ r.quantita }}</td>
            <td class="num">{{ formatEuro(r.prezzoUnitario) }}</td>
            <td class="num">{{ formatEuro(r.totaleRiga) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Riepilogo -->
    <div class="card">
      <div class="riepilogo-importi">
        <div class="riga"><span>Totale prestazioni</span><span>{{ formatEuro(fattura.imponibile) }}</span></div>
        <div v-if="fattura.rivalsaInps" class="riga">
          <span>Rivalsa INPS</span><span>{{ formatEuro(fattura.rivalsaInps) }}</span>
        </div>
        <div v-if="fattura.marcaDaBollo" class="riga">
          <span>Marca da bollo</span><span>{{ formatEuro(fattura.marcaDaBollo) }}</span>
        </div>
        <div class="riga totale"><span>Totale documento</span><span>{{ formatEuro(fattura.totale) }}</span></div>
      </div>
    </div>

    <!-- Diciture di legge -->
    <div class="card">
      <div class="card-titolo">Diciture di legge</div>
      <p class="small muted">{{ impostazioniStore.dati?.dicituraRegime }}</p>
      <p v-if="fattura.marcaDaBollo" class="small muted" style="margin-top:8px">
        {{ impostazioniStore.dati?.testoBollo }}
      </p>
      <p v-if="fattura.note" class="small" style="margin-top:8px">
        <strong>Note:</strong> {{ fattura.note }}
      </p>
    </div>

    <ModaleConferma
      v-if="daEliminare"
      titolo="Elimina bozza"
      messaggio="Eliminare definitivamente questa bozza di fattura?"
      testoConferma="Elimina"
      pericolo
      @conferma="confermaElimina"
      @annulla="daEliminare = false"
    />
  </div>
  <div v-else class="muted">Caricamento…</div>
</template>

<style scoped>
.due-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 720px) {
  .due-col { grid-template-columns: 1fr; }
}
</style>
