<script setup>
/**
 * Product catalog: search, table, activate or deactivate, edit and delete
 * with confirmation.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProductsStore } from '../../stores/products'
import { productUnits } from '../../lib/productSchema'
import { formatEuro } from '../../lib/format'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import './_Products.css'

const router = useRouter()
const { t } = useI18n()
const store = useProductsStore()
const query = ref('')
const toDelete = ref(null)
const deleteError = ref('')

onMounted(() => store.load())

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()

  if (!needle) {
    return store.list
  }

  return store.list.filter((product) =>
    [product.nome, product.categoria, product.descrizione]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)),
  )
})

/**
 * Display text of a unit: translated when known, else as stored.
 *
 * @param {string} unit
 * @returns {string}
 */
function unitLabel(unit) {
  if (!unit) {
    return t('unit.servizio')
  }

  return productUnits.includes(unit) ? t(`unit.${unit}`) : unit
}

/**
 * Open the edit form of a product.
 *
 * @param {object} product
 */
function openProduct(product) {
  router.push({ name: 'prodotto-modifica', params: { id: product.id } })
}

/**
 * Switch a product between active and inactive.
 *
 * @param {object} product
 */
async function toggleActive(product) {
  await store.save({ ...product, attivo: !product.attivo })
}

/**
 * Delete the product in the dialog. When the server fails, close the dialog
 * and show its message.
 */
async function confirmDelete() {
  const { id } = toDelete.value
  toDelete.value = null
  deleteError.value = ''

  try {
    await store.remove(id)
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : String(error)
  }
}

</script>

<template>
  <article data-part="products">
    <header data-part="page-header">
      <h1>{{ t('products.title') }}</h1>
      <button type="button" data-variant="primary" @click="router.push({ name: 'prodotto-nuovo' })">
        {{ t('products.new') }}
      </button>
    </header>

    <p v-if="deleteError" role="alert" data-part="alert">
      {{ deleteError }}
    </p>

    <search data-part="search">
      <label for="products-search" data-visually-hidden>{{ t('products.searchLabel') }}</label>
      <input
        id="products-search"
        v-model="query"
        type="search"
        :placeholder="t('products.searchPlaceholder')"
      >
    </search>

    <section data-part="list" :aria-label="t('products.listLabel')">
      <table v-if="filtered.length > 0">
        <thead>
          <tr>
            <th scope="col">
              {{ t('products.column.name') }}
            </th>
            <th scope="col">
              {{ t('products.column.category') }}
            </th>
            <th scope="col">
              {{ t('products.column.unit') }}
            </th>
            <th scope="col" data-align="end">
              {{ t('products.column.price') }}
            </th>
            <th scope="col">
              {{ t('products.column.status') }}
            </th>
            <th scope="col">
              <span data-visually-hidden>{{ t('common.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filtered" :key="product.id">
            <th scope="row">
              {{ product.nome }}
              <small v-if="product.descrizione" data-part="description">{{ product.descrizione }}</small>
            </th>
            <td>{{ product.categoria || t('common.empty') }}</td>
            <td>{{ unitLabel(product.unitaMisura) }}</td>
            <td data-align="end">
              {{ formatEuro(product.prezzo) }}
            </td>
            <td>
              <span data-part="badge" :data-kind="product.attivo ? 'active' : 'inactive'">
                {{ product.attivo ? t('products.active') : t('products.inactive') }}
              </span>
            </td>
            <td data-part="actions">
              <button type="button" data-variant="ghost" data-size="small" @click="toggleActive(product)">
                {{ product.attivo ? t('products.deactivate') : t('products.activate') }}
              </button>
              <button type="button" data-variant="ghost" data-size="small" @click="openProduct(product)">
                {{ t('common.edit') }}
              </button>
              <button
                type="button"
                data-variant="ghost"
                data-size="small"
                data-tone="danger"
                @click="toDelete = product"
              >
                {{ t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="store.list.length > 0" data-part="empty">
        {{ t('products.noMatch') }}
      </p>
      <p v-else data-part="empty">
        {{ t('products.noneYet') }}
      </p>
    </section>

    <ConfirmDialog
      v-if="toDelete"
      :title="t('products.deleteTitle')"
      :message="t('products.deleteMessage', { name: toDelete.nome })"
      :confirm-label="t('common.delete')"
      danger
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
  </article>
</template>
