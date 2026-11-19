<script setup lang="ts">
import { computed } from 'vue'
import { Goal } from 'lucide-vue-next'

const props = defineProps<{
  actual: number
  objetivo: number | null
  bono?: number
  periodo?: string
  cargando?: boolean
  error?: boolean
}>()

const percentage = computed(() => {
  if (!props.objetivo) return 0
  return Math.min(100, Math.floor((props.actual / props.objetivo) * 100))
})
const money = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})
</script>

<template>
  <section class="goal-card" aria-labelledby="goal-title">
    <div class="goal-heading">
      <span class="goal-symbol"><Goal :size="19" :stroke-width="1.6" aria-hidden="true" /></span>
      <div>
        <h2 id="goal-title">Meta del período</h2>
        <p v-if="periodo">{{ periodo }}</p>
      </div>
      <span v-if="objetivo && !cargando && !error" class="goal-percent">{{ percentage }}%</span>
    </div>
    <p v-if="cargando" class="goal-empty">Consultando tu avance…</p>
    <p v-else-if="error" class="goal-empty">No se pudo cargar el avance.</p>
    <template v-else-if="objetivo">
      <progress class="goal-bar" :value="Math.min(actual, objetivo)" :max="objetivo" aria-labelledby="goal-title" />
      <div class="goal-caption">
        <span><strong>{{ actual }}</strong> de {{ objetivo }} atenciones</span>
        <strong v-if="bono">{{ percentage === 100 ? 'Meta cumplida' : 'Bono' }} · {{ money.format(bono) }}</strong>
      </div>
    </template>
    <p v-else class="goal-empty">Por ahora no hay una meta activa.</p>
  </section>
</template>

<style scoped>
.goal-card {
  background: linear-gradient(115deg, #fffcf6, #f8f0e0);
  border: 1px solid #e9dbc0;
  border-radius: 16px;
  padding: 18px;
  min-width: 0;
}
.goal-heading { display: flex; align-items: center; gap: 10px; }
.goal-symbol {
  background: #f1e2c5;
  color: #745324;
  border-radius: 10px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.goal-heading h2 { margin: 0; font-size: 0.92rem; font-weight: 750; }
.goal-heading p { margin: 3px 0 0; font-size: 0.73rem; color: #715f47; }
.goal-percent {
  margin-left: auto;
  font-size: 1.35rem;
  line-height: 1;
  font-weight: 750;
  color: #745324;
}
.goal-bar { display: block; width: 100%; height: 8px; margin-top: 15px; border: 0; border-radius: 20px; overflow: hidden; background: #eadfc9; accent-color: #a47a36; }
.goal-bar::-webkit-progress-bar { background: #eadfc9; border-radius: 20px; }
.goal-bar::-webkit-progress-value { background: linear-gradient(90deg, #a77a32, #d4ab66); border-radius: 20px; }
.goal-bar::-moz-progress-bar { background: linear-gradient(90deg, #a77a32, #d4ab66); border-radius: 20px; }
.goal-caption { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 5px 12px; margin-top: 8px; }
.goal-caption, .goal-empty { font-size: 0.76rem; color: #715f47; }
.goal-caption strong { color: #745324; }
.goal-empty { margin: 11px 0 0 50px; }
</style>
