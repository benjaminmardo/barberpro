<script setup lang="ts">
import type { Atencion } from '../../types/models'

defineProps<{ atenciones: Atencion[] }>()

const peso = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
const fecha = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short',
})
</script>

<template>
  <p v-if="!atenciones.length" class="empty-movements">No hay movimientos en este período.</p>
  <div v-else class="cash-scroll" tabindex="0" aria-label="Tabla de movimientos de caja">
    <table class="cash-table">
      <thead><tr>
        <th scope="col">Fecha y hora</th><th scope="col">Barbero</th><th scope="col">Servicio</th>
        <th scope="col">Pago</th><th scope="col">Estado</th><th scope="col">Monto</th><th scope="col">Comisión</th>
      </tr></thead>
      <tbody>
        <tr v-for="atencion in atenciones" :key="atencion.id_atencion">
          <td>{{ fecha.format(new Date(atencion.fecha_registro)) }}</td>
          <td>{{ atencion.nombre_barbero }}</td><td>{{ atencion.nombre_servicio }}</td>
          <td>{{ atencion.metodo_pago === 'efectivo' ? 'Efectivo' : 'Tarjeta' }}</td>
          <td><span class="cash-state" :class="{ voided: atencion.estado === 'anulada' }">{{ atencion.estado === 'anulada' ? 'Anulada' : 'Activa' }}</span></td>
          <td class="amount">{{ peso.format(atencion.monto_total) }}</td>
          <td class="amount">{{ peso.format(atencion.comision_generada) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.cash-scroll{overflow:auto}
.cash-table{width:100%;border-collapse:collapse;min-width:660px;text-align:left;font-size:13px}
.cash-table th{font-size:11px;text-transform:uppercase;letter-spacing:.055em;color:var(--admin-muted,#6f6555);background:#faf7f0;font-weight:700}
.cash-table td,.cash-table th{padding:13px 15px;border-bottom:1px solid var(--admin-line,#e9e2d5)}
.cash-table tbody tr:last-child td{border-bottom:0}
.cash-table th:nth-last-child(-n+2),.amount{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.cash-state{display:inline-block;padding:3px 8px;border-radius:100px;background:#eaf3e9;color:#365c36;font-size:11px;font-weight:700}
.cash-state.voided{background:#f1eae6;color:#715948}
.empty-movements{padding:18px 0;color:var(--admin-muted,#6f6555);font-size:14px}
</style>
