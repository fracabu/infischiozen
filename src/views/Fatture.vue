<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFattureStore } from '../stores/fatture'
import { formatEuro, formatData } from '../lib/format'

const router = useRouter()
const store = useFattureStore()
const filtroAnno = ref('')
const filtroStato = ref('')

onMounted(() => store.carica())

const anniDisponibili = computed(() => {
  const set = new Set(store.lista.map((f) => f.anno).filter(Boolean))
  return [...set].sort((a, b) => b - a)
})

const statiOpzioni = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'bozza', label: 'Bozza' },
  { value: 'emessa', label: 'Emessa' },
  { value: 'inviata', label: 'Inviata' },
  { value: 'pagata', label: 'Pagata' },
  { value: 'annullata', label: 'Annullata' }
]

const etichettaStato = {
  bozza: 'Bozza', emessa: 'Emessa', inviata: 'Inviata',
  pagata: 'Pagata', annullata: 'Annullata'
}

const filtrate = computed(() =>
  store.lista.filter((f) => {
    if (filtroAnno.value && String(f.anno) !== String(filtroAnno.value)) return false
    if (filtroStato.value && f.stato !== filtroStato.value) return false
    return true
  })
)

function nomeCliente(f) {
  const c = f.clienteSnapshot || {}
  if (c.tipo === 'privato') return `${c.cognome || ''} ${c.nome || ''}`.trim()
  return c.ragioneSociale || `${c.cognome || ''} ${c.nome || ''}`.trim() || '—'
}

function numeroFattura(f) {
  return f.numero ? `${f.numero}/${f.anno}` : 'Bozza'
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Fatture</h1>
      <div class="btn-row">
        <button class="btn" @click="router.push({ name: 'fattura-registra' })">
          Registra fattura esterna
        </button>
        <button class="btn btn-primario" @click="router.push({ name: 'fattura-nuova' })">
          + Crea fattura
        </button>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="filtroAnno">
        <option value="">Tutti gli anni</option>
        <option v-for="a in anniDisponibili" :key="a" :value="a">{{ a }}</option>
      </select>
      <select v-model="filtroStato">
        <option v-for="s in statiOpzioni" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </div>

    <div class="card" style="padding:0;">
      <table v-if="filtrate.length">
        <thead>
          <tr>
            <th>Numero</th>
            <th>Data</th>
            <th>Cliente</th>
            <th class="num">Totale</th>
            <th>Stato</th>
            <th>Origine</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="f in filtrate"
            :key="f.id"
            class="cliccabile"
            @click="router.push({ name: 'fattura-dettaglio', params: { id: f.id } })"
          >
            <td><strong>{{ numeroFattura(f) }}</strong></td>
            <td>{{ formatData(f.data) }}</td>
            <td>{{ nomeCliente(f) }}</td>
            <td class="num">{{ formatEuro(f.totale) }}</td>
            <td><span class="badge" :class="`badge-${f.stato}`">{{ etichettaStato[f.stato] }}</span></td>
            <td>
              <span class="badge" :class="f.origine === 'esterna' ? 'badge-pa' : 'badge-emessa'">
                {{ f.origine === 'esterna' ? 'Esterna' : 'App' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <div class="grande">📄</div>
        <p v-if="store.lista.length">Nessuna fattura corrisponde ai filtri.</p>
        <p v-else>Nessuna fattura ancora. Crea la prima fattura.</p>
      </div>
    </div>
  </div>
</template>
