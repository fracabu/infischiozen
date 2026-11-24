<script setup>
/**
 * Editable table of invoice lines with an add button. Bound with v-model:
 * every change emits a new array. The table always keeps one line.
 */
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { emptyLine } from '../../lib/invoiceDraft'
import { InvoiceLine } from '../InvoiceLine'
import './_InvoiceLines.css'

const lines = defineModel({ type: Array, required: true })

defineProps({
  /** Catalog products a line can pick from. */
  products: { type: Array, default: () => [] },
})

const { t } = useI18n()

// The model prop catches up only on the next render. Two changes in the
// same tick build on the array written last.
let current = lines.value

watch(lines, (value) => {
  current = value
}, { flush: 'sync' })

/**
 * Write a new array of lines.
 *
 * @param {object[]} next
 */
function write(next) {
  current = next
  lines.value = next
}

/**
 * Apply changed fields to one line.
 *
 * @param {number} index
 * @param {object} patch - changed fields only
 */
function updateLine(index, patch) {
  write(current.with(index, { ...current[index], ...patch }))
}

/**
 * Remove one line.
 *
 * @param {number} index
 */
function removeLine(index) {
  const rest = current.filter((_, position) => position !== index)

  write(rest.length > 0 ? rest : [emptyLine()])
}

function addLine() {
  write([...current, emptyLine()])
}

</script>

<template>
  <table data-part="invoice-lines">
    <thead>
      <tr>
        <th scope="col">
          {{ t('invoiceLine.product') }}
        </th>
        <th scope="col">
          {{ t('invoiceLine.description') }}
        </th>
        <th scope="col">
          {{ t('invoiceLine.quantity') }}
        </th>
        <th scope="col">
          {{ t('invoiceLine.unitPrice') }}
        </th>
        <th scope="col" data-align="end">
          {{ t('invoiceLine.total') }}
        </th>
        <th scope="col">
          <span data-visually-hidden>{{ t('common.actions') }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <InvoiceLine
        v-for="(line, index) in lines"
        :key="index"
        :line="line"
        :number="index + 1"
        :products="products"
        @update="(patch) => updateLine(index, patch)"
        @remove="removeLine(index)"
      />
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6">
          <button type="button" data-size="small" @click="addLine">
            {{ t('invoiceForm.addLine') }}
          </button>
        </td>
      </tr>
    </tfoot>
  </table>
</template>
