<script setup lang="ts">
import { Banknote, ReceiptText, Scissors, Wallet } from 'lucide-vue-next'

defineProps<{
  revenue: number
  count: number
  commission: number
  average: number
}>()

const peso = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
const number = new Intl.NumberFormat('es-CL')
</script>

<template>
  <div class="summary-grid" aria-label="Indicadores del período">
    <article v-for="item in [
      { label: 'Ingresos', value: peso.format(revenue), icon: Banknote },
      { label: 'Atenciones', value: number.format(count), icon: Scissors },
      { label: 'Comisiones', value: peso.format(commission), icon: Wallet },
      { label: 'Ticket promedio', value: peso.format(average), icon: ReceiptText },
    ]" :key="item.label" class="summary-card">
      <div class="summary-heading">
        <span>{{ item.label }}</span>
        <span class="summary-icon"><component :is="item.icon" :size="18" :stroke-width="1.8" aria-hidden="true" /></span>
      </div>
      <strong>{{ item.value }}</strong>
    </article>
  </div>
</template>

<style scoped>
.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.summary-card{background:white;border:1px solid var(--admin-line,#e9e2d5);border-radius:16px;padding:18px 20px 20px;box-shadow:0 2px 5px #5c452006;min-width:0}
.summary-heading{display:flex;justify-content:space-between;align-items:center;gap:6px;color:var(--admin-muted,#6f6555);font-size:13px;font-weight:650}
.summary-icon{display:grid;place-items:center;flex:0 0 36px;height:36px;background:#f7efd9;color:#846019;border-radius:10px}
.summary-card strong{display:block;margin-top:11px;color:var(--admin-ink,#262116);font-size:clamp(1.32rem,2.4vw,1.9rem);font-variant-numeric:tabular-nums;letter-spacing:-.05em;line-height:1.12;overflow-wrap:anywhere}
@media(max-width:820px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:460px){.summary-grid{gap:9px}.summary-card{padding:12px}.summary-icon{flex-basis:30px;height:30px}.summary-heading{font-size:11px}}
</style>
