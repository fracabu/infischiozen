<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientiStore } from '../stores/clienti'
import ModaleConferma from '../components/ModaleConferma.vue'

const router = useRouter()
const store = useClientiStore()
const ricerca = ref('')
const daEliminare = ref(null)

onMounted(() => store.carica())

function nomeCliente(c) {
  if (c.tipo === 'privato') return `${c.cognome || ''} ${c.nome || ''}`.trim()
  return c.ragioneSociale || `${c.cognome || ''} ${c.nome || ''}`.trim()
}

const filtrati = computed(() => {
  const q = ricerca.value.trim().toLowerCase()
  if (!q) return store.lista
  return store.lista.filter((c) =>
    [nomeCliente(c), c.email, c.partitaIVA, c.codiceFiscale, c.citta]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  )
})

const etichettaTipo = { privato: 'Privato', azienda: 'Azienda', pa: 'PA' }

async function confermaElimina() {
  await store.elimina(daEliminare.value.id)
  daEliminare.value = null
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Clienti</h1>
      <button class="btn btn-primario" @click="router.push({ name: 'cliente-nuovo' })">
        + Nuovo cliente
      </button>
    </div>

    <div class="toolbar">
      <input v-model="ricerca" class="ricerca" placeholder="Cerca per nome, ragione sociale, P.IVA, città…" />
    </div>

    <div class="card" style="padding:0;">
      <table v-if="filtrati.length">
        <thead>
          <tr>
            <th>Nome / Ragione sociale</th>
            <th>Tipo</th>
            <th>P.IVA / C.F.</th>
            <th>Città</th>
            <th>Email</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in filtrati"
            :key="c.id"
            class="cliccabile"
            @click="router.push({ name: 'cliente-modifica', params: { id: c.id } })"
          >
            <td><strong>{{ nomeCliente(c) }}</strong></td>
            <td><span class="badge" :class="`badge-${c.tipo}`">{{ etichettaTipo[c.tipo] }}</span></td>
            <td>{{ c.partitaIVA || c.codiceFiscale || '—' }}</td>
            <td>{{ c.citta || '—' }}</td>
            <td>{{ c.email || '—' }}</td>
            <td class="num" @click.stop>
              <button class="btn btn-ghost btn-sm" @click="router.push({ name: 'cliente-modifica', params: { id: c.id } })">Modifica</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--err)" @click="daEliminare = c">Elimina</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <div class="grande">👥</div>
        <p v-if="store.lista.length">Nessun cliente corrisponde alla ricerca.</p>
        <p v-else>Nessun cliente ancora. Aggiungi il primo cliente per iniziare.</p>
      </div>
    </div>

    <ModaleConferma
      v-if="daEliminare"
      titolo="Elimina cliente"
      :messaggio="`Eliminare definitivamente «${nomeCliente(daEliminare)}»? Le fatture già emesse non verranno modificate.`"
      testoConferma="Elimina"
      pericolo
      @conferma="confermaElimina"
      @annulla="daEliminare = null"
    />
  </div>
</template>
