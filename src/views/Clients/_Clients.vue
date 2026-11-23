<script setup>
/**
 * Client list: search, table, edit and delete with confirmation.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientiStore } from '../../stores/clienti'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import './_Clients.css'

const router = useRouter()
const store = useClientiStore()
const query = ref('')
const toDelete = ref(null)

onMounted(() => store.carica())

/** Labels shown in the client type badge. */
const typeLabels = { privato: 'Privato', azienda: 'Azienda', pa: 'PA' }

/**
 * Display name: surname and name for a person, company name otherwise.
 *
 * @param {object} client
 * @returns {string}
 */
function clientName(client) {
  const person = `${client.cognome || ''} ${client.nome || ''}`.trim()

  if (client.tipo === 'privato') {
    return person
  }

  return client.ragioneSociale || person
}

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()

  if (!needle) {
    return store.lista
  }

  return store.lista.filter((client) =>
    [clientName(client), client.email, client.partitaIVA, client.codiceFiscale, client.citta]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)),
  )
})

/**
 * Open the edit form of a client.
 *
 * @param {object} client
 */
function openClient(client) {
  router.push({ name: 'cliente-modifica', params: { id: client.id } })
}

async function confirmDelete() {
  await store.elimina(toDelete.value.id)
  toDelete.value = null
}
</script>

<template>
  <article data-part="clients">
    <header data-part="page-header">
      <h1>Clienti</h1>
      <button type="button" data-variant="primary" @click="router.push({ name: 'cliente-nuovo' })">
        + Nuovo cliente
      </button>
    </header>

    <search data-part="search">
      <label for="clients-search" data-visually-hidden>Cerca clienti</label>
      <input
        id="clients-search"
        v-model="query"
        type="search"
        placeholder="Cerca per nome, ragione sociale, P.IVA, città..."
      >
    </search>

    <section data-part="list" aria-label="Elenco clienti">
      <table v-if="filtered.length > 0">
        <thead>
          <tr>
            <th scope="col">
              Nome / Ragione sociale
            </th>
            <th scope="col">
              Tipo
            </th>
            <th scope="col">
              P.IVA / C.F.
            </th>
            <th scope="col">
              Città
            </th>
            <th scope="col">
              Email
            </th>
            <th scope="col">
              <span data-visually-hidden>Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filtered" :key="client.id" @click="openClient(client)">
            <th scope="row">
              <router-link :to="{ name: 'cliente-modifica', params: { id: client.id } }" @click.stop>
                {{ clientName(client) }}
              </router-link>
            </th>
            <td>
              <span data-part="badge" :data-kind="client.tipo">{{ typeLabels[client.tipo] }}</span>
            </td>
            <td>{{ client.partitaIVA || client.codiceFiscale || '-' }}</td>
            <td>{{ client.citta || '-' }}</td>
            <td>{{ client.email || '-' }}</td>
            <td data-part="actions" @click.stop>
              <button type="button" data-variant="ghost" data-size="small" @click="openClient(client)">
                Modifica
              </button>
              <button
                type="button"
                data-variant="ghost"
                data-size="small"
                data-tone="danger"
                @click="toDelete = client"
              >
                Elimina
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="store.lista.length > 0" data-part="empty">
        Nessun cliente corrisponde alla ricerca.
      </p>
      <p v-else data-part="empty">
        Nessun cliente ancora. Aggiungi il primo cliente per iniziare.
      </p>
    </section>

    <ConfirmDialog
      v-if="toDelete"
      title="Elimina cliente"
      :message="`Eliminare definitivamente «${clientName(toDelete)}»? Le fatture già emesse non verranno modificate.`"
      confirm-label="Elimina"
      danger
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
  </article>
</template>
