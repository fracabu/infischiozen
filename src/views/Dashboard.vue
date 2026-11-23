<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useClientiStore } from '../stores/clienti'
import { useFattureStore } from '../stores/fatture'
import { useImpostazioniStore } from '../stores/impostazioni'
import { formatEuro, formatData } from '../lib/format'

const router = useRouter()
const clientiStore = useClientiStore()
const fattureStore = useFattureStore()
const impostazioniStore = useImpostazioniStore()

const annoSelezionato = ref(new Date().getFullYear())

onMounted(async () => {
  await Promise.all([
    clientiStore.carica(),
    fattureStore.carica(),
    impostazioniStore.carica()
  ])
})

// Anni presenti tra le fatture (più l'anno corrente).
const anniDisponibili = computed(() => {
  const set = new Set(fattureStore.lista.map((f) => f.anno).filter(Boolean))
  set.add(annoSelezionato.value)
  return [...set].sort((a, b) => b - a)
})

// Fatture "valide" = non bozza e non annullate (contano interne ed esterne).
const fattureValide = computed(() =>
  fattureStore.lista.filter(
    (f) => f.stato !== 'bozza' && f.stato !== 'annullata'
  )
)

const fattureAnno = computed(() =>
  fattureValide.value.filter((f) => String(f.anno) === String(annoSelezionato.value))
)

const fatturatoAnno = computed(() =>
  fattureAnno.value.reduce((acc, f) => acc + (Number(f.imponibile) || 0), 0)
)

const totaleIncassato = computed(() =>
  fattureAnno.value.reduce((acc, f) => acc + (Number(f.totale) || 0), 0)
)

const nonPagate = computed(() =>
  fattureValide.value.filter((f) => f.stato !== 'pagata')
)

const ultime = computed(() => fattureStore.lista.slice(0, 6))

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

// Imponibile per mese nell'anno selezionato.
const fatturatoMensile = computed(() => {
  const tot = Array(12).fill(0)
  for (const f of fattureAnno.value) {
    const mese = Number(String(f.data).slice(5, 7)) - 1
    if (mese >= 0 && mese < 12) tot[mese] += Number(f.imponibile) || 0
  }
  return tot.map((valore, i) => ({ mese: MESI[i], valore }))
})

const maxMensile = computed(() =>
  Math.max(1, ...fatturatoMensile.value.map((m) => m.valore))
)

const haFatturato = computed(() =>
  fatturatoMensile.value.some((m) => m.valore > 0)
)

// Fatturato cumulato (progressivo) mese per mese, con coordinate per il grafico.
const serieCumulata = computed(() => {
  let somma = 0
  const punti = fatturatoMensile.value.map((m) => {
    somma += m.valore
    return { mese: m.mese, valore: somma }
  })
  const max = Math.max(1, ...punti.map((p) => p.valore))
  const n = punti.length
  return punti.map((p, i) => ({
    ...p,
    x: n > 1 ? (i / (n - 1)) * 100 : 0,
    y: 100 - (p.valore / max) * 100
  }))
})

const lineaPunti = computed(() =>
  serieCumulata.value.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
)

const lineaArea = computed(() => {
  const pts = serieCumulata.value
  if (!pts.length) return ''
  const ultimo = pts[pts.length - 1]
  return `0,100 ${lineaPunti.value} ${ultimo.x.toFixed(2)},100`
})

// Concentrazione: quanta parte del fatturato dell'anno arriva dai primi
// clienti. Un numero alto e' un rischio, non un merito.
const perCliente = computed(() => {
  const mappa = new Map()
  for (const f of fattureAnno.value) {
    const k = f.clienteId ?? nomeCliente(f)
    mappa.set(k, (mappa.get(k) || 0) + (Number(f.totale) || 0))
  }
  return [...mappa.values()].sort((a, b) => b - a)
})

function quotaPrimi(n) {
  const tot = perCliente.value.reduce((s, v) => s + v, 0)
  if (!tot) return 0
  return Math.round((perCliente.value.slice(0, n).reduce((s, v) => s + v, 0) / tot) * 100)
}
const quotaPrimoCliente = computed(() => quotaPrimi(1))
const quotaTop3Clienti = computed(() => quotaPrimi(3))

const etichettaStato = {
  bozza: 'Bozza', emessa: 'Emessa', inviata: 'Inviata',
  pagata: 'Pagata', annullata: 'Annullata'
}

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
      <h1>Dashboard</h1>
      <div class="btn-row" style="align-items:center">
        <select v-model="annoSelezionato" style="padding:9px 12px;border:1px solid var(--bordo);border-radius:8px;font-family:inherit;font-size:14px;">
          <option v-for="a in anniDisponibili" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="btn btn-primario" @click="router.push({ name: 'fattura-nuova' })">
          + Crea fattura
        </button>
      </div>
    </div>

    <div class="grid-cards">
      <div class="card stat-card">
        <span class="valore">{{ clientiStore.lista.length }}</span>
        <span class="etichetta">Clienti in anagrafica</span>
      </div>
      <div class="card stat-card">
        <span class="valore">{{ fattureAnno.length }}</span>
        <span class="etichetta">Fatture {{ annoSelezionato }}</span>
      </div>
      <div class="card stat-card">
        <span class="valore">{{ formatEuro(fatturatoAnno) }}</span>
        <span class="etichetta">Fatturato {{ annoSelezionato }} (imponibile)</span>
      </div>
      <div class="card stat-card">
        <span class="valore">{{ formatEuro(totaleIncassato) }}</span>
        <span class="etichetta">Totale documenti {{ annoSelezionato }}</span>
      </div>
      <div class="card stat-card">
        <span class="valore" :style="nonPagate.length ? 'color:var(--warn)' : ''">
          {{ nonPagate.length }}
        </span>
        <span class="etichetta">Fatture non ancora pagate</span>
      </div>
    </div>

    <div class="grafici-griglia">
      <div class="card">
        <div class="card-titolo">Fatturato {{ annoSelezionato }} per mese</div>
        <div v-if="haFatturato" class="grafico-barre">
          <div v-for="m in fatturatoMensile" :key="m.mese" class="grafico-col">
            <div class="grafico-valore">{{ m.valore ? formatEuro(m.valore) : '' }}</div>
            <div class="grafico-barra-wrap">
              <div
                class="grafico-barra"
                :style="{ height: (m.valore / maxMensile * 100) + '%' }"
                :title="`${m.mese}: ${formatEuro(m.valore)}`"
              ></div>
            </div>
            <div class="grafico-mese">{{ m.mese }}</div>
          </div>
        </div>
        <div v-else class="grafico-vuoto">Nessun dato per il {{ annoSelezionato }}.</div>
      </div>

      <div class="card">
        <div class="card-titolo">Andamento progressivo {{ annoSelezionato }}</div>
        <template v-if="haFatturato">
          <svg class="grafico-linea-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon class="grafico-linea-area" :points="lineaArea" />
            <polyline class="grafico-linea-path" :points="lineaPunti" />
          </svg>
          <div class="grafico-linea-mesi">
            <span v-for="m in fatturatoMensile" :key="m.mese">{{ m.mese }}</span>
          </div>
        </template>
        <div v-else class="grafico-vuoto">Nessun dato per il {{ annoSelezionato }}.</div>
      </div>
    </div>

    <!-- Concentrazione clienti -->
    <div class="grid-cards" style="grid-template-columns:repeat(3,1fr)">
      <div class="card stat-card">
        <span class="valore">{{ quotaPrimoCliente }}%</span>
        <span class="etichetta">Fatturato {{ annoSelezionato }} dal primo cliente</span>
      </div>
      <div class="card stat-card">
        <span class="valore">{{ quotaTop3Clienti }}%</span>
        <span class="etichetta">Fatturato {{ annoSelezionato }} dai primi 3 clienti</span>
      </div>
      <div class="card stat-card">
        <span class="valore">{{ perCliente.length }}</span>
        <span class="etichetta">Clienti fatturati nel {{ annoSelezionato }}</span>
      </div>
    </div>

    <div class="card" style="padding:0">
      <div style="padding:16px 20px 0">
        <div class="card-titolo">Ultime fatture</div>
      </div>
      <table v-if="ultime.length">
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
            v-for="f in ultime"
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
        <p>Nessuna fattura ancora. Crea la prima fattura per iniziare.</p>
      </div>
    </div>
  </div>
</template>
