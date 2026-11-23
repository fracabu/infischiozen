<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProdottiStore } from '../stores/prodotti'
import DataField from '../components/DataField.vue'

const route = useRoute()
const router = useRouter()
const store = useProdottiStore()
const errori = ref({})

const idProdotto = computed(() => route.params.id)
const modifica = computed(() => !!idProdotto.value)

const form = ref({
  nome: '',
  descrizione: '',
  categoria: '',
  prezzo: 0,
  unitaMisura: 'servizio',
  attivo: true
})

onMounted(async () => {
  if (modifica.value) {
    const p = await store.get(idProdotto.value)
    if (p) form.value = { ...form.value, ...p }
    else router.replace({ name: 'prodotti' })
  }
})

const unita = [
  { value: 'servizio', label: 'servizio' },
  { value: 'ora', label: 'ora' },
  { value: 'pz', label: 'pz' },
  { value: 'giornata', label: 'giornata' }
]

function valida() {
  const e = {}
  if (!form.value.nome) e.nome = 'Obbligatorio'
  if (form.value.prezzo === '' || form.value.prezzo < 0) e.prezzo = 'Prezzo non valido'
  errori.value = e
  return Object.keys(e).length === 0
}

async function salva() {
  if (!valida()) return
  await store.salva({ ...form.value })
  router.push({ name: 'prodotti' })
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ modifica ? 'Modifica prodotto' : 'Nuovo prodotto' }}</h1>
      <div class="btn-row">
        <button class="btn" @click="router.push({ name: 'prodotti' })">Annulla</button>
        <button class="btn btn-primario" @click="salva">Salva</button>
      </div>
    </div>

    <div class="card">
      <div class="form-griglia">
        <DataField v-model="form.nome" label="Nome prodotto/servizio" class="full" obbligatorio :errore="errori.nome" />
        <DataField v-model="form.descrizione" label="Descrizione" tipo="textarea" class="full" />
        <DataField v-model="form.categoria" label="Categoria" />
        <DataField v-model="form.unitaMisura" label="Unità di misura" tipo="select" :opzioni="unita" />
        <DataField v-model="form.prezzo" label="Prezzo imponibile unitario (€)" tipo="number" step="0.01" :errore="errori.prezzo" />
        <DataField v-model="form.attivo" tipo="checkbox" label="Stato">
          Prodotto attivo (selezionabile nelle fatture)
        </DataField>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn" @click="router.push({ name: 'prodotti' })">Annulla</button>
      <button class="btn btn-primario" @click="salva">Salva prodotto</button>
    </div>
  </div>
</template>
