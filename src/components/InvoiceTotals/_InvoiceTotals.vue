<script setup>
/**
 * Invoice totals: taxable amount, rivalsa, stamp duty and total. Rivalsa and
 * stamp duty rows show only when they are not zero.
 */
import { useI18n } from 'vue-i18n'
import { formatEuro } from '../../lib/format'
import './_InvoiceTotals.css'

defineProps({
  /** { imponibile, rivalsaInps, marcaDaBollo, totale } */
  amounts: { type: Object, required: true },
  /** Use the labels of an issued document: "Totale prestazioni", "Totale documento". */
  document: { type: Boolean, default: false },
  /** Rivalsa percentage to show in its label. */
  rivalsaPercent: { type: [Number, String], default: undefined },
})

const { t } = useI18n()
</script>

<template>
  <dl data-part="invoice-totals" :aria-label="t('invoiceTotals.label')">
    <dt>{{ document ? t('invoiceTotals.services') : t('invoiceTotals.taxable') }}</dt>
    <dd>{{ formatEuro(amounts.imponibile) }}</dd>
    <template v-if="amounts.rivalsaInps">
      <dt>
        {{ rivalsaPercent ? t('invoiceTotals.rivalsaPercent', { percent: rivalsaPercent }) : t('invoiceTotals.rivalsa') }}
      </dt>
      <dd>{{ formatEuro(amounts.rivalsaInps) }}</dd>
    </template>
    <template v-if="amounts.marcaDaBollo">
      <dt>{{ t('invoiceTotals.stamp') }}</dt>
      <dd>{{ formatEuro(amounts.marcaDaBollo) }}</dd>
    </template>
    <dt data-part="total">
      {{ document ? t('invoiceTotals.documentTotal') : t('invoiceTotals.total') }}
    </dt>
    <dd data-part="total">
      {{ formatEuro(amounts.totale) }}
    </dd>
  </dl>
</template>
