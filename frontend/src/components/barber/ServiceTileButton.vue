<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, Scissors, Sparkles, Waves, Zap } from 'lucide-vue-next'
import type { Servicio } from '../../types/models'

const props = defineProps<{ servicio: Servicio; disabled?: boolean }>()
const emit = defineEmits<{ select: [servicio: Servicio] }>()

const price = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const icon = computed(() => {
  const name = props.servicio.nombre_servicio.toLocaleLowerCase('es-CL')
  if (/tinte|platinado/.test(name)) return Sparkles
  if (/rizado|alisado/.test(name)) return Waves
  if (name.includes('barba')) return Zap
  return Scissors
})
</script>

<template>
  <button type="button" class="service-tile" :disabled="disabled" @click="emit('select', servicio)">
    <span class="tile-icons" aria-hidden="true">
      <span class="tile-symbol"><component :is="icon" :size="19" :stroke-width="1.65" /></span>
      <ArrowUpRight class="tile-arrow" :size="17" :stroke-width="1.65" />
    </span>
    <span class="tile-label">{{ servicio.nombre_servicio }}</span>
    <span class="tile-price">{{ price.format(servicio.precio) }}</span>
  </button>
</template>

<style scoped>
.service-tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 128px;
  height: 100%;
  padding: 15px;
  text-align: left;
  background: #fff;
  color: #25211b;
  border: 1px solid #e9e1d2;
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 160ms, border-color 160ms, box-shadow 160ms, transform 160ms;
}
.service-tile:disabled { cursor: wait; opacity: 0.65; }
.service-tile:focus-visible { outline: 2px solid #92703a; outline-offset: 3px; }
.service-tile:not(:disabled):hover {
  background: #fffaf0;
  border-color: #be9c64;
  box-shadow: 0 6px 18px #71592613;
  transform: translateY(-2px);
}
.tile-icons { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
.tile-symbol {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f4ead7;
  color: #815a22;
}
.tile-arrow { color: #8b7657; margin-top: 1px; }
.tile-label { font-weight: 700; font-size: 0.93rem; line-height: 1.25; overflow-wrap: anywhere; }
.tile-price { color: #745324; font-size: 0.86rem; font-weight: 650; margin-top: auto; padding-top: 5px; }
@media (min-width: 680px) {
  .service-tile { min-height: 141px; padding: 17px; }
}
@media (prefers-reduced-motion: reduce) {
  .service-tile { transition: none; transform: none !important; }
}
</style>
