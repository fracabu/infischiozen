<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useImpostazioniStore } from '../stores/impostazioni'
import DataField from '../components/DataField.vue'
import { validaPartitaIVA, validaCodiceFiscale, validaCap, validaProvincia, validaEmail } from '../lib/format'

const route = useRoute()
const store = useImpostazioniStore()
const form = ref(null)
const errori = ref({})
const salvato = ref(false)
const benvenuto = ref(route.query.benvenuto === '1')

onMounted(async () => {
  await store.carica()
  form.value = { ...store.dati }
})

const regimiFiscali = [
  // Solo forfettario: calcoli e XML (Natura N2.2, niente IVA) valgono solo qui.
  { value: 'RF19', label: 'RF19 — Regime forfettario' }
]

function valida() {
  const e = {}
  const f = form.value
  if (!f.nome) e.nome = 'Obbligatorio'
  if (!f.cognome) e.cognome = 'Obbligatorio'
  if (!validaPartitaIVA(f.partitaIVA)) e.partitaIVA = 'Partita IVA non valida (11 cifre)'
  if (!validaCodiceFiscale(f.codiceFiscale)) e.codiceFiscale = 'Codice fiscale non valido'
  if (!f.indirizzo) e.indirizzo = 'Obbligatorio'
  if (!validaCap(f.cap)) e.cap = 'CAP non valido (5 cifre)'
  if (!f.citta) e.citta = 'Obbligatorio'
  if (!validaProvincia(f.provincia)) e.provincia = 'Sigla provincia (2 lettere)'
  if (f.email && !validaEmail(f.email)) e.email = 'Email non valida'
  if (f.pec && !validaEmail(f.pec)) e.pec = 'PEC non valida'
  // FatturaPA accetta al massimo 100 caratteri in RiferimentoNormativo:
  // oltre, il Sistema di Interscambio scarta la fattura.
  if ((f.dicituraRegime || '').length > 100) {
    e.dicituraRegime = `Massimo 100 caratteri (ora ${f.dicituraRegime.length})`
  }
  errori.value = e
  return Object.keys(e).length === 0
}

async function salva() {
  salvato.value = false
  if (!valida()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  await store.salva(form.value)
  form.value = { ...store.dati }
  salvato.value = true
  benvenuto.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function caricaLogo(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.value.logoBase64 = reader.result
  }
  reader.readAsDataURL(file)
}

function rimuoviLogo() {
  form.value.logoBase64 = ''
}
</script>

<template>
  <div v-if="form">
    <div class="page-header">
      <h1>Impostazioni</h1>
      <button class="btn btn-primario" @click="salva">Salva impostazioni</button>
    </div>

    <div v-if="benvenuto" class="avviso avviso-info">
      Benvenuto! Questi sono i dati del tuo profilo cedente, già precompilati.
      Verificali e premi <strong>Salva impostazioni</strong> per iniziare.
    </div>
    <div v-if="salvato" class="avviso avviso-ok">Impostazioni salvate correttamente.</div>
    <div v-if="Object.keys(errori).length" class="avviso avviso-err">
      Correggi i campi evidenziati prima di salvare.
    </div>

    <div class="card">
      <div class="card-titolo">Dati anagrafici cedente/prestatore</div>
      <div class="form-griglia">
        <DataField v-model="form.nome" label="Nome" obbligatorio :errore="errori.nome" />
        <DataField v-model="form.cognome" label="Cognome" obbligatorio :errore="errori.cognome" />
        <DataField v-model="form.ragioneSociale" label="Ragione sociale / Ditta" class="full" />
        <DataField v-model="form.partitaIVA" label="Partita IVA" obbligatorio :errore="errori.partitaIVA" />
        <DataField v-model="form.codiceFiscale" label="Codice fiscale" obbligatorio :errore="errori.codiceFiscale" />
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Sede</div>
      <div class="form-griglia">
        <DataField v-model="form.indirizzo" label="Indirizzo" class="full" obbligatorio :errore="errori.indirizzo" />
        <DataField v-model="form.cap" label="CAP" obbligatorio :errore="errori.cap" />
        <DataField v-model="form.citta" label="Città" obbligatorio :errore="errori.citta" />
        <DataField v-model="form.provincia" label="Provincia" obbligatorio :errore="errori.provincia" hint="Sigla, es. RM" />
        <DataField v-model="form.nazione" label="Nazione" hint="Codice ISO, es. IT" />
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Contatti e pagamenti</div>
      <div class="form-griglia">
        <DataField v-model="form.email" label="Email" tipo="email" :errore="errori.email" />
        <DataField v-model="form.pec" label="PEC" tipo="email" :errore="errori.pec" />
        <DataField v-model="form.telefono" label="Telefono" />
        <DataField v-model="form.iban" label="IBAN" />
        <DataField v-model="form.intestatarioIban" label="Intestatario IBAN" />
        <DataField v-model="form.banca" label="Banca" />
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Regime fiscale e previdenziale</div>
      <div class="form-griglia">
        <DataField v-model="form.regimeFiscale" label="Regime fiscale" tipo="select" :opzioni="regimiFiscali" />
        <DataField v-model="form.regimePrevidenziale" label="Regime previdenziale" />
        <DataField v-model="form.dicituraRegime" label="Dicitura di legge in fattura" tipo="textarea" class="full" :errore="errori.dicituraRegime" />
      </div>
      <div class="form-griglia">
        <DataField v-model="form.applicaRivalsaInps" tipo="checkbox" label="Rivalsa INPS">
          Applica rivalsa INPS in fattura
        </DataField>
        <DataField v-model="form.percentualeRivalsaInps" label="% Rivalsa INPS" tipo="number" step="0.1" :disabled="!form.applicaRivalsaInps" />
        <DataField v-model="form.prezziLordi" tipo="checkbox" label="Prezzi di listino" class="full" :disabled="!form.applicaRivalsaInps">
          I prezzi sono già comprensivi di rivalsa (la rivalsa si scorpora invece di aggiungersi)
        </DataField>
        <DataField v-model="form.applicaMarcaDaBollo" tipo="checkbox" label="Marca da bollo">
          Applica marca da bollo
        </DataField>
        <DataField v-model="form.addebitaBolloAlCliente" tipo="checkbox" label="Bollo al cliente" :disabled="!form.applicaMarcaDaBollo">
          Addebita i 2 € del bollo al cliente in fattura
        </DataField>
        <DataField v-model="form.sogliaBollo" label="Soglia bollo (€)" tipo="number" step="0.01" :disabled="!form.applicaMarcaDaBollo" />
        <DataField v-model="form.importoBollo" label="Importo bollo (€)" tipo="number" step="0.01" :disabled="!form.applicaMarcaDaBollo" />
        <DataField v-model="form.testoBollo" label="Dicitura bollo in fattura" tipo="textarea" class="full" :disabled="!form.applicaMarcaDaBollo" />
      </div>
    </div>

    <div class="card">
      <div class="card-titolo">Numerazione fatture</div>
      <div class="form-griglia">
        <div class="data-field">
          <label>Prossimo numero fattura</label>
          <strong>{{ store.dati?.prossimoNumeroFattura }}/{{ new Date().getFullYear() }}</strong>
        </div>
      </div>
      <p class="muted small">
        Il numero lo assegna il database al momento dell'emissione: è l'ultima
        fattura dell'anno più uno, e non si imposta a mano. Se hai già emesso
        fatture con un altro software, registrale da <em>Fatture → Registra
        fattura esterna</em> con il loro numero: l'app ripartirà dal successivo.
      </p>
    </div>

    <div class="card">
      <div class="card-titolo">Logo per il PDF</div>
      <div class="logo-box">
        <img v-if="form.logoBase64" :src="form.logoBase64" alt="Logo" class="logo-preview" />
        <p v-else class="muted small">
          Nessun logo personalizzato caricato: il PDF mostrerà il tuo nome o la tua ditta come intestazione.
        </p>
        <div class="btn-row" style="margin-top:10px;">
          <label class="btn btn-sm">
            Carica logo
            <input type="file" accept="image/*" style="display:none" @change="caricaLogo" />
          </label>
          <button v-if="form.logoBase64" class="btn btn-sm" @click="rimuoviLogo">Rimuovi logo</button>
        </div>
      </div>
    </div>

    <div class="btn-row" style="margin-top:20px;">
      <button class="btn btn-primario" @click="salva">Salva impostazioni</button>
    </div>
  </div>
  <div v-else class="muted">Caricamento…</div>
</template>

<style scoped>
.logo-preview {
  max-width: 260px;
  max-height: 90px;
  border: 1px solid var(--bordo);
  border-radius: 8px;
  padding: 8px;
  background: #fff;
}
</style>
