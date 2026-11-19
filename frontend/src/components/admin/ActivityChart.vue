<script setup lang="ts">
import { computed } from 'vue'
import type { Atencion } from '../../types/models'
import { localDate, shiftDate, shortDate } from '../../utils/format'

const props = defineProps<{ start: string; end: string; records: Atencion[] }>()

const days = computed(() => {
  const span = Math.max(1, Math.round((Date.parse(props.end) - Date.parse(props.start)) / 86_400_000) + 1)
  const daysPerBar = Math.ceil(span / 10)
  const byDay = new Map<string, number>()
  for (const record of props.records) {
    const day = localDate(record.fecha_registro)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }

  return Array.from({ length: Math.ceil(span / daysPerBar) }, (_, index) => {
    const first = index * daysPerBar
    const last = Math.min(first + daysPerBar, span)
    let count = 0
    for (let offset = first; offset < last; offset++) {
      count += byDay.get(shiftDate(props.start, offset)) ?? 0
    }
    const start = shortDate(shiftDate(props.start, first))
    const end = shortDate(shiftDate(props.start, last - 1))
    return { label: start, range: start === end ? start : `${start} al ${end}`, count }
  })
})

const step = computed(() => {
  const target = Math.max(1, Math.ceil(Math.max(...days.value.map(day => day.count)) / 4))
  const decimal = 10 ** Math.floor(Math.log10(target))
  const normalized = target / decimal
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * decimal
})
</script>

<template>
  <section class="activity-card" aria-labelledby="activity-title">
    <header class="activity-heading">
      <div><h2 id="activity-title">Actividad del equipo</h2><p>Atenciones activas en el período</p></div>
      <span class="activity-legend"><i aria-hidden="true"></i> Atenciones</span>
    </header>
    <figure class="chart" aria-label="Gráfico de atenciones por fecha">
      <div class="chart-axis" aria-hidden="true">
        <span v-for="index in 5" :key="index">{{ (5 - index) * step }}</span>
      </div>
      <div class="chart-content">
        <div class="chart-bars" role="list" aria-label="Cantidad de atenciones por fecha">
          <div v-for="day in days" :key="day.label" class="chart-bar-slot" role="listitem" :title="`${day.range} · ${day.count} atenciones`">
            <span class="sr-only">{{ day.range }} · {{ day.count }} atenciones</span>
            <div class="chart-bar" :style="{ height: `${100 * day.count / (4 * step)}%` }" aria-hidden="true"></div>
          </div>
        </div>
        <div class="chart-labels" aria-hidden="true"><span v-for="day in days" :key="day.label">{{ day.label }}</span></div>
      </div>
    </figure>
  </section>
</template>

<style scoped>
.activity-card{background:#fff;border:1px solid var(--admin-line);border-radius:16px;padding:22px 23px 17px;min-width:0;box-shadow:0 2px 5px #5c452006}
.activity-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:19px}
.activity-heading h2{font-size:17px;line-height:1.25;color:var(--admin-ink);margin:0;letter-spacing:-.02em}
.activity-heading p{margin:5px 0 0;font-size:13px;color:var(--admin-muted)}
.activity-legend{display:flex;align-items:center;gap:6px;color:var(--admin-muted);font-size:12px;white-space:nowrap}
.activity-legend i{width:8px;height:8px;border-radius:3px;background:#b68b38}
.chart{display:grid;grid-template-columns:27px minmax(0,1fr);column-gap:10px;margin:0}
.chart-axis{height:153px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;line-height:1;transform:translateY(-5px)}
.chart-axis,.chart-labels{color:var(--admin-muted);font-size:10px;font-variant-numeric:tabular-nums}
.chart-bars,.chart-labels{display:grid;grid-auto-columns:minmax(0,1fr);grid-auto-flow:column;gap:2px;text-align:center}
.chart-bars{height:153px;background:repeating-linear-gradient(to bottom,var(--admin-line) 0 1px,transparent 1px 25%);border-bottom:1px solid var(--admin-line)}
.chart-bar-slot{display:flex;align-items:flex-end;justify-content:center;min-width:0}
.chart-bar{width:52%;max-width:42px;background:linear-gradient(180deg,#c39d50,#a87924);border-radius:5px 5px 0 0}
.chart-bar-slot:hover .chart-bar{background:#805711}
.chart-labels{margin-top:8px;overflow-wrap:normal;line-height:1.2}
@media(max-width:520px){.activity-card{padding:17px 12px}.chart{grid-template-columns:21px minmax(0,1fr);column-gap:6px}.chart-labels{font-size:9px}.chart-labels span:nth-child(even):not(:last-child){visibility:hidden}}
</style>
