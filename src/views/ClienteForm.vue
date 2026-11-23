<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClientiStore } from '../stores/clienti'
import { useFattureStore } from '../stores/fatture'
import DataField from '../components/DataField.vue'
import {
  validaPartitaIVA, validaCodiceFiscale, validaCap,
  validaProvincia, validaEmail, validaCodiceDestinatario,
  formatEuro, formatData
} from '../lib/format'

const route = useRoute()
const router = useRouter()
const store = useClientiStore()
const fattureStore = useFattureStore()
const errori = ref({})

const idCliente = computed(() => route.params.id)
const modifica = computed(() => !!idCliente.value)

const form = ref({
  tipo: 'privato',
  ragioneSociale: '',
  nome: '',
  cognome: '',
  codiceFiscale: '',
  partitaIVA: '',
  indirizzo: '',
  cap: '',
  citta: '',
  provincia: '',
  nazione: 'IT',
  codiceDestinatario: '0000000',
  pec: '',
  email: '',
  telefono: '',
  note: ''
})

onMounted(async () => {
  if (modifica.value) {
    const c = await store.get(idCliente.value)
    if (c) form.value = { ...form.value, ...c }
    else router.replace({ name: 'clienti' })
    await fattureStore.carica()
  }
})

// Fatture intestate a questo cliente (più recenti prima).
const fattureCliente = computed(() => {
  if (!modifica.value) return []
  return fattureStore.lista.filter(
    (f) => String(f.clienteId) === String(idCliente.value)
  )
})

const totaleSpeso = computed(() =>
  fattureCliente.value.reduce((acc, f) => acc + (Number(f.totale) || 0), 0)
)

function numeroFattura(f) {
  return f.numero ? `${f.numero}/${f.anno}` : 'Bozza'
}

const tipiCliente = [
  { value: 'privato', label: 'Privato (persona fisica)' },
  { value: 'azienda', label: 'Azienda / Ditta' },
  { value: 'pa', label: 'Pubblica Amministrazione' }
]

const isPrivato = computed(() => form.value.tipo === 'privato')
const isEstero = computed(() => (form.value.nazione || 'IT').toUpperCase() !== 'IT')

function valida() {
  const e = {}
  const f = form.value

  if (isPrivato.value) {
    if (!f.nome) e.nome = 'Obbligatorio'
    if (!f.cognome) e.cognome = 'Obbligatorio'
    if (!f.codiceFiscale) e.codiceFiscale = 'Obbligatorio'
    else if (!isEstero.value && !validaCodiceFiscale(f.codiceFiscale)) e.codiceFiscale = 'Codice fiscale non valido'
  } else {
    if (!f.ragioneSociale) e.ragioneSociale = 'Obbligatorio'
    if (!f.partitaIVA) e.partitaIVA = 'Obbligatoria'
    else if (!isEstero.value && !validaPartitaIVA(f.partitaIVA)) e.partitaIVA = 'Partita IVA non valida (11 cifre)'
    if (f.codiceFiscale && !isEstero.value && !validaCodiceFiscale(f.codiceFiscale)) e.codiceFiscale = 'Codice fiscale non valido'
  }

  if (!f.indirizzo) e.indirizzo = 'Obbligatorio'
  if (!isEstero.value) {
    if (!validaCap(f.cap)) e.cap = 'CAP non valido (5 cifre)'
    if (!validaProvincia(f.provincia)) e.provincia = 'Sigla provincia (2 lettere)'
  }
  if (!f.citta) e.citta = 'Obbligatoria'

  if (!validaCodiceDestinatario(f.codiceDestinatario)) {
    e.codiceDestinatario = 'Deve avere 7 caratteri (0000000 se assente)'
  } else if (f.codiceDestinatario === '0000000' && !isEstero.value) {
    if (!f.pec) e.pec = 'PEC obbligatoria se il codice destinatario è 0000000'
    else if (!validaEmail(f.pec)) e.pec = 'PEC non valida'
  }
  if (f.pec && !e.pec && !validaEmail(f.pec)) e.pec = 'PEC non valida'
  if (f.email && !validaEmail(f.email)) e.email = 'Email non valida'

  errori.value = e
  return Object.keys(e).length === 0
}

async function salva() {
  if (!valida()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  await store.salva({ ...form.value })
  router.push({ name: 'clienti' })
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ modifica ? 'Modifica cliente' : 'Nuovo cliente' }}</h1>
      <div class="btn-row">
        <button class="btn" @click="router.push({ name: 'clienti' })">Annulla</button>
        <button class="btn btn-primario" @click="salva">Salva</button>
      </div>
    </div>

    <div v-if="Object.keys(errori).length" class="avviso avviso-err">
      Correggi i campi evidenziati prima di salvare.
    </div>

    <div class="card">
      <div class="card-titolo">Tipo cliente</div>
      <div class="form-griglia">
        <DataField v-model="form.tipo" label="Tipologia" tipo="select" :opzioni="tipiCliente" />
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Dati anagrafici e fiscali</div>
      <div class="form-griglia">
        <template v-if="isPrivato">
          <DataField v-model="form.nome" label="Nome" obbligatorio :errore="errori.nome" />
          <DataField v-model="form.cognome" label="Cognome" obbligatorio :errore="errori.cognome" />
          <DataField v-model="form.codiceFiscale" label="Codice fiscale" class="full" obbligatorio :errore="errori.codiceFiscale" />
        </template>
        <template v-else>
          <DataField v-model="form.ragioneSociale" label="Ragione sociale" class="full" obbligatorio :errore="errori.ragioneSociale" />
          <DataField v-model="form.partitaIVA" label="Partita IVA" obbligatorio :errore="errori.partitaIVA" />
          <DataField v-model="form.codiceFiscale" label="Codice fiscale (se diverso)" :errore="errori.codiceFiscale" />
        </template>
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Sede</div>
      <div class="form-griglia">
        <DataField v-model="form.indirizzo" label="Indirizzo" class="full" obbligatorio :errore="errori.indirizzo" />
        <DataField v-model="form.cap" label="CAP" obbligatorio :errore="errori.cap" />
        <DataField v-model="form.citta" label="Città" obbligatorio :errore="errori.citta" />
        <DataField v-model="form.provincia" label="Provincia" obbligatorio :errore="errori.provincia" hint="Sigla, es. RM" />
        <DataField v-model="form.nazione" label="Nazione" hint="Codice ISO, es. IT. Per esteri usa il codice estero." />
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Fatturazione elettronica</div>
      <div class="form-griglia">
        <DataField
          v-model="form.codiceDestinatario"
          label="Codice destinatario SdI"
          :errore="errori.codiceDestinatario"
          hint="7 caratteri. 0000000 se assente (serve PEC). XXXXXXX per esteri."
        />
        <DataField v-model="form.pec" label="PEC" tipo="email" :errore="errori.pec" />
        <DataField v-model="form.email" label="Email" tipo="email" :errore="errori.email" />
        <DataField v-model="form.telefono" label="Telefono" />
        <DataField v-model="form.note" label="Note" tipo="textarea" class="full" />
      </div>
    </div>

    <div v-if="modifica" class="card">
      <div class="card-titolo">Acquisti del cliente</div>
      <div v-if="!fattureCliente.length" class="muted small">
        Nessuna fattura registrata per questo cliente.
      </div>
      <template v-else>
        <p class="small muted" style="margin-top:0">
          {{ fattureCliente.length }}
          {{ fattureCliente.length === 1 ? 'fattura' : 'fatture' }} ·
          totale documenti {{ formatEuro(totaleSpeso) }}
        </p>
        <div
          v-for="f in fattureCliente"
          :key="f.id"
          class="acquisto-fattura cliccabile"
          @click="router.push({ name: 'fattura-dettaglio', params: { id: f.id } })"
        >
          <div class="acquisto-intestazione">
            <strong>{{ numeroFattura(f) }}</strong>
            <span class="small muted">{{ formatData(f.data) }}</span>
            <span class="tot">{{ formatEuro(f.totale) }}</span>
          </div>
          <ul class="acquisto-righe">
            <li v-for="(r, i) in (f.righe || [])" :key="i">
              <span>{{ r.descrizione }}</span>
              <span class="num">{{ r.quantita }} × {{ formatEuro(r.prezzoUnitario) }}</span>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <div class="btn-row">
      <button class="btn" @click="router.push({ name: 'clienti' })">Annulla</button>
      <button class="btn btn-primario" @click="salva">Salva cliente</button>
    </div>
  </div>
</template>
