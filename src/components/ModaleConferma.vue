<script setup>
defineProps({
  titolo: { type: String, default: 'Conferma' },
  messaggio: { type: String, default: '' },
  testoConferma: { type: String, default: 'Conferma' },
  testoAnnulla: { type: String, default: 'Annulla' },
  pericolo: { type: Boolean, default: false }
})
const emit = defineEmits(['conferma', 'annulla'])
</script>

<template>
  <div class="modale-overlay" @click.self="emit('annulla')">
    <div class="modale">
      <h3>{{ titolo }}</h3>
      <p class="muted">{{ messaggio }}</p>
      <div class="azioni">
        <button class="btn" @click="emit('annulla')">{{ testoAnnulla }}</button>
        <button
          class="btn"
          :class="pericolo ? 'btn-pericolo' : 'btn-primario'"
          @click="emit('conferma')"
        >
          {{ testoConferma }}
        </button>
      </div>
    </div>
  </div>
</template>
