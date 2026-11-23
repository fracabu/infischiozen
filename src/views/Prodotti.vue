<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProdottiStore } from '../stores/prodotti'
import { formatEuro } from '../lib/format'
import ModaleConferma from '../components/ModaleConferma.vue'

const router = useRouter()
const store = useProdottiStore()
const ricerca = ref('')
const daEliminare = ref(null)

onMounted(() => store.carica())

const filtrati = computed(() => {
  const q = ricerca.value.trim().toLowerCase()
  if (!q) return store.lista
  return store.lista.filter((p) =>
    [p.nome, p.categoria, p.descrizione].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  )
})

async function toggleAttivo(p) {
  await store.salva({ ...p, attivo: !p.attivo })
}

async function confermaElimina() {
  await store.elimina(daEliminare.value.id)
  daEliminare.value = null
}

async function caricaSeed() {
  await store.caricaSeed()
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Prodotti & Servizi</h1>
      <button class="btn btn-primario" @click="router.push({ name: 'prodotto-nuovo' })">
        + Nuovo prodotto
      </button>
    </div>

    <div v-if="store.caricato && !store.lista.length" class="avviso avviso-info">
      Il catalogo è vuoto: crea i tuoi prodotti o servizi con «Nuovo prodotto».
    </div>

    <div class="toolbar">
      <input v-model="ricerca" class="ricerca" placeholder="Cerca per nome, categoria…" />
    </div>

    <div class="card" style="padding:0;">
      <table v-if="filtrati.length">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Unità</th>
            <th class="num">Prezzo</th>
            <th>Stato</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtrati" :key="p.id">
            <td>
              <strong>{{ p.nome }}</strong>
              <div v-if="p.descrizione" class="muted small">{{ p.descrizione }}</div>
            </td>
            <td>{{ p.categoria || '—' }}</td>
            <td>{{ p.unitaMisura || 'servizio' }}</td>
            <td class="num">{{ formatEuro(p.prezzo) }}</td>
            <td>
              <span class="badge" :class="p.attivo ? 'badge-pagata' : 'badge-bozza'">
                {{ p.attivo ? 'Attivo' : 'Disattivato' }}
              </span>
            </td>
            <td class="num">
              <button class="btn btn-ghost btn-sm" @click="toggleAttivo(p)">
                {{ p.attivo ? 'Disattiva' : 'Attiva' }}
              </button>
              <button class="btn btn-ghost btn-sm" @click="router.push({ name: 'prodotto-modifica', params: { id: p.id } })">Modifica</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--err)" @click="daEliminare = p">Elimina</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <div class="grande">📦</div>
        <p>Nessun prodotto da mostrare.</p>
      </div>
    </div>

    <ModaleConferma
      v-if="daEliminare"
      titolo="Elimina prodotto"
      :messaggio="`Eliminare «${daEliminare.nome}» dal catalogo?`"
      testoConferma="Elimina"
      pericolo
      @conferma="confermaElimina"
      @annulla="daEliminare = null"
    />
  </div>
</template>
