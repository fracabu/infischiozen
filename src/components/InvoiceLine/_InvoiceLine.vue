<script setup>
/**
 * One editable invoice line, as a table row. Choosing a catalog product fills
 * in description and unit price. The parent owns the line: each change is
 * emitted as a patch with the changed fields only, so two quick changes in a
 * row do not overwrite each other through a stale prop.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatEuro } from '../../lib/format'
import { lineTotal } from '../../lib/invoiceMath'
import './_InvoiceLine.css'

const props = defineProps({
  /** { prodottoId, descrizione, quantita, prezzoUnitario } */
  line: { type: Object, required: true },
  /** Catalog products the line can pick from. */
  products: { type: Array, default: () => [] },
  /** Line number from 1, for the field labels. */
  number: { type: Number, required: true },
})

const emit = defineEmits(['update', 'remove'])
const { t } = useI18n()
const total = computed(() => lineTotal(props.line))

/**
 * Accessible name of a field of this line.
 *
 * @param {string} key - label key under invoiceLine
 * @returns {string}
 */
function fieldLabel(key) {
  return t('invoiceLine.fieldLabel', { field: t(`invoiceLine.${key}`), line: props.number })
}

/**
 * Emit one changed field.
 *
 * @param {string} field
 * @param {unknown} value
 */
function change(field, value) {
  emit('update', { [field]: value })
}

/**
 * Pick a catalog product, or none for a free line.
 *
 * @param {Event} event
 */
function pickProduct(event) {
  const product = props.products.find((item) => String(item.id) === event.target.value)

  if (!product) {
    change('prodottoId', undefined)

    return
  }

  emit('update', {
    prodottoId: product.id,
    descrizione: product.descrizione || product.nome,
    prezzoUnitario: Number(product.prezzo) || 0,
  })
}

</script>

<template>
  <tr data-part="invoice-line">
    <td>
      <select :value="line.prodottoId ?? ''" :aria-label="fieldLabel('product')" @change="pickProduct">
        <option value="">
          {{ t('invoiceLine.freeLine') }}
        </option>
        <option v-for="product in products" :key="product.id" :value="product.id">
          {{ product.nome }}
        </option>
      </select>
    </td>
    <td>
      <input
        type="text"
        :value="line.descrizione"
        :placeholder="t('invoiceLine.description')"
        :aria-label="fieldLabel('description')"
        @input="change('descrizione', $event.target.value)"
      >
    </td>
    <td>
      <input
        type="number"
        min="0"
        step="any"
        :value="line.quantita"
        :aria-label="fieldLabel('quantity')"
        @input="change('quantita', Number($event.target.value) || 0)"
      >
    </td>
    <td>
      <input
        type="number"
        min="0"
        step="0.01"
        :value="line.prezzoUnitario"
        :aria-label="fieldLabel('unitPrice')"
        @input="change('prezzoUnitario', Number($event.target.value) || 0)"
      >
    </td>
    <td data-part="total">
      {{ formatEuro(total) }}
    </td>
    <td>
      <button
        type="button"
        data-variant="ghost"
        data-size="small"
        :aria-label="t('invoiceLine.remove', { line: number })"
        @click="emit('remove')"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </td>
  </tr>
</template>
