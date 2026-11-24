<script setup>
/**
 * Client list: search, table, edit and delete with confirmation.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useClientiStore } from '../../stores/clienti'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { clientName } from '../../lib/displayNames'
import './_Clients.css'

const router = useRouter()
const { t } = useI18n()
const store = useClientiStore()
const query = ref('')
const toDelete = ref(null)

onMounted(() => store.carica())

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
      <h1>{{ t('clients.title') }}</h1>
      <button type="button" data-variant="primary" @click="router.push({ name: 'cliente-nuovo' })">
        {{ t('clients.new') }}
      </button>
    </header>

    <search data-part="search">
      <label for="clients-search" data-visually-hidden>{{ t('clients.searchLabel') }}</label>
      <input
        id="clients-search"
        v-model="query"
        type="search"
        :placeholder="t('clients.searchPlaceholder')"
      >
    </search>

    <section data-part="list" :aria-label="t('clients.listLabel')">
      <table v-if="filtered.length > 0">
        <thead>
          <tr>
            <th scope="col">
              {{ t('clients.column.name') }}
            </th>
            <th scope="col">
              {{ t('clients.column.type') }}
            </th>
            <th scope="col">
              {{ t('clients.column.taxId') }}
            </th>
            <th scope="col">
              {{ t('clients.column.city') }}
            </th>
            <th scope="col">
              {{ t('clients.column.email') }}
            </th>
            <th scope="col">
              <span data-visually-hidden>{{ t('common.actions') }}</span>
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
              <span data-part="badge" :data-kind="client.tipo">{{ t(`clientType.${client.tipo}`) }}</span>
            </td>
            <td>{{ client.partitaIVA || client.codiceFiscale || t('common.empty') }}</td>
            <td>{{ client.citta || t('common.empty') }}</td>
            <td>{{ client.email || t('common.empty') }}</td>
            <td data-part="actions" @click.stop>
              <button type="button" data-variant="ghost" data-size="small" @click="openClient(client)">
                {{ t('common.edit') }}
              </button>
              <button
                type="button"
                data-variant="ghost"
                data-size="small"
                data-tone="danger"
                @click="toDelete = client"
              >
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="store.lista.length > 0" data-part="empty">
        {{ t('clients.noMatch') }}
      </p>
      <p v-else data-part="empty">
        {{ t('clients.noneYet') }}
      </p>
    </section>

    <ConfirmDialog
      v-if="toDelete"
      :title="t('clients.deleteTitle')"
      :message="t('clients.deleteMessage', { name: clientName(toDelete) })"
      :confirm-label="t('common.delete')"
      danger
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
  </article>
</template>
