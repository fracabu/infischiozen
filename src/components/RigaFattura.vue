<script setup>
import { computed } from 'vue'
import { formatEuro } from '../lib/format'
import { totaleRiga } from '../lib/calcoloFattura'

const props = defineProps({
  riga: { type: Object, required: true },
  prodotti: { type: Array, default: () => [] }
})
const emit = defineEmits(['update', 'rimuovi'])

const totale = computed(() => totaleRiga(props.riga))

function aggiorna(campo, valore) {
  emit('update', { ...props.riga, [campo]: valore })
}

// Quando si seleziona un prodotto dal catalogo, precompila descrizione e prezzo.
function selezionaProdotto(e) {
  const id = e.target.value
  if (!id) {
    emit('update', { ...props.riga, prodottoId: null })
    return
  }
  const p = props.prodotti.find((x) => String(x.id) === String(id))
  if (p) {
    emit('update', {
      ...props.riga,
      prodottoId: p.id,
      descrizione: p.descrizione || p.nome,
      prezzoUnitario: Number(p.prezzo) || 0
    })
  }
}
</script>

<template>
  <div class="riga-fattura">
    <div class="rf-prodotto">
      <select :value="riga.prodottoId || ''" @change="selezionaProdotto">
        <option value="">— Riga libera —</option>
        <option v-for="p in prodotti" :key="p.id" :value="p.id">
          {{ p.nome }}
        </option>
      </select>
    </div>
    <div class="rf-descrizione">
      <input
        type="text"
        placeholder="Descrizione"
        :value="riga.descrizione"
        @input="aggiorna('descrizione', $event.target.value)"
      />
    </div>
    <div class="rf-quantita">
      <input
        type="number"
        min="0"
        step="any"
        placeholder="Q.tà"
        :value="riga.quantita"
        @input="aggiorna('quantita', Number($event.target.value) || 0)"
      />
    </div>
    <div class="rf-prezzo">
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Prezzo unit."
        :value="riga.prezzoUnitario"
        @input="aggiorna('prezzoUnitario', Number($event.target.value) || 0)"
      />
    </div>
    <div class="rf-totale">{{ formatEuro(totale) }}</div>
    <div class="rf-azione">
      <button class="btn btn-ghost btn-sm" title="Rimuovi" @click="emit('rimuovi')">
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.riga-fattura {
  display: grid;
  grid-template-columns: 1.3fr 2fr 0.7fr 1fr 1fr 40px;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--bordo);
}
.riga-fattura input,
.riga-fattura select {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid var(--bordo);
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
}
.rf-totale {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 720px) {
  .riga-fattura { grid-template-columns: 1fr 1fr; }
}
</style>
