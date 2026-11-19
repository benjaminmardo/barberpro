<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  Banknote, CalendarDays, Check, ChevronRight, CreditCard,
  LayoutGrid, LogOut, Menu, Scissors, Target, UserRound, UsersRound, Wallet, X,
} from 'lucide-vue-next'
import BrandLockup from '../components/BrandLockup.vue'
import ActivityChart from '../components/admin/ActivityChart.vue'
import AdminSettings from '../components/admin/AdminSettings.vue'
import CashClosureTable from '../components/admin/CashClosureTable.vue'
import KpiSummaryCards from '../components/admin/KpiSummaryCards.vue'
import { logout, useAuth } from '../services/authService'
import { getCaja } from '../services/cajaService'
import { listMetas } from '../services/metasService'
import type { Caja, Meta } from '../types/models'
import { clp, initials, localDate, shiftDate, shortDate } from '../utils/format'

const links = [
  { id: 'rendimiento', title: 'Rendimiento', icon: LayoutGrid },
  { id: 'caja', title: 'Cuadratura de caja', icon: Wallet },
  { id: 'servicios', title: 'Servicios', icon: Scissors },
  { id: 'metas', title: 'Metas y bonos', icon: Target },
  { id: 'equipo', title: 'Equipo', icon: UsersRound },
  { id: 'perfil', title: 'Mi perfil', icon: UserRound },
] as const

const route = useRoute()
const router = useRouter()
const { profile } = useAuth()
const section = computed(() => links.find(link => link.id === route.query.tab) ?? links[0])
const showReports = computed(() => section.value.id === 'rendimiento' || section.value.id === 'caja')
const menuOpen = ref(false)
const menuTrigger = ref<HTMLButtonElement>()
const menuClose = ref<HTMLButtonElement>()
const today = localDate()
const longDate = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago',
}).format(new Date(`${today}T12:00:00Z`))

const from = ref(shiftDate(today, -6))
const to = ref(today)
const range = ref({ from: from.value, to: to.value })
const preset = ref('week')
const dateError = ref('')
const reportError = ref('')
const goalError = ref('')
const signOutError = ref('')
const signingOut = ref(false)

const report = ref<Caja | null>(null)
const reportBusy = ref(true)
const goalReport = ref<Caja | null>(null)
const goals = ref<Meta[]>([])
const activeGoal = computed(() => goals.value.find(goal => goal.fecha_inicio <= today && today <= goal.fecha_fin))
const goalMatchesRange = computed(() => activeGoal.value?.fecha_inicio === range.value.from && activeGoal.value.fecha_fin === range.value.to)

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function refreshGoals() {
  goalError.value = ''
  try {
    goals.value = await listMetas()
  } catch (error) {
    goalError.value = errorMessage(error, 'No se pudieron consultar las metas.')
  }
}

watch(() => section.value.id, (page) => {
  menuOpen.value = false
  if (page === 'rendimiento') void refreshGoals()
}, { immediate: true })

watch(menuOpen, async (show) => {
  await nextTick()
  if (show) menuClose.value?.focus()
  else menuTrigger.value?.focus()
})

watch([range, showReports], async ([period, visible], _, onCleanup) => {
  if (!visible) return
  let current = true
  onCleanup(() => { current = false })
  reportBusy.value = true
  reportError.value = ''
  report.value = null
  try {
    const response = await getCaja(period.from, period.to)
    if (current) report.value = response
  } catch (error) {
    if (current) reportError.value = errorMessage(error, 'No se pudo cargar el informe.')
  } finally {
    if (current) reportBusy.value = false
  }
}, { immediate: true })

watch([activeGoal, goalMatchesRange, () => section.value.id], async ([goal, matches, page], _, onCleanup) => {
  goalReport.value = null
  if (!goal || matches || page !== 'rendimiento') return
  let current = true
  onCleanup(() => { current = false })
  goalError.value = ''
  try {
    const response = await getCaja(goal.fecha_inicio, goal.fecha_fin)
    if (current) goalReport.value = response
  } catch (error) {
    if (current) goalError.value = errorMessage(error, 'No se pudo cargar el avance de la meta.')
  }
}, { immediate: true })

function applyRange(selection = 'custom') {
  dateError.value = ''
  if (!from.value || !to.value || from.value > to.value) {
    dateError.value = 'Elige una fecha de inicio y una fecha de término válida.'
    return
  }
  if (Date.parse(to.value) - Date.parse(from.value) > 365 * 86_400_000) {
    dateError.value = 'Selecciona un período de hasta 366 días.'
    return
  }
  preset.value = selection
  range.value = { from: from.value, to: to.value }
}

function selectPreset(selection: 'today' | 'week' | 'month') {
  const periodEnd = localDate()
  from.value = selection === 'today' ? periodEnd : selection === 'week' ? shiftDate(periodEnd, -6) : `${periodEnd.slice(0, 7)}-01`
  to.value = periodEnd
  applyRange(selection)
}

const atenciones = computed(() => (report.value?.atenciones ?? []).filter(item => item.estado === 'activa'))
const totals = computed(() => {
  let revenue = 0
  let commission = 0
  let cash = 0
  let card = 0
  for (const record of atenciones.value) {
    revenue += record.monto_total
    commission += record.comision_generada
    if (record.metodo_pago === 'efectivo') cash += record.monto_total
    else card += record.monto_total
  }
  const count = atenciones.value.length
  return { revenue, commission, cash, card, count, average: count ? Math.round(revenue / count) : 0 }
})

const goalCounts = computed(() => {
  const counts = new Map<string, number>()
  const goalSource = goalMatchesRange.value ? report.value : goalReport.value
  if (!goalSource) return null
  for (const record of goalSource.atenciones) {
    if (record.estado !== 'activa') continue
    counts.set(record.id_usuario, (counts.get(record.id_usuario) ?? 0) + 1)
  }
  return counts
})

const performance = computed(() => {
  const entries = new Map<string, { id: string; name: string; count: number; revenue: number; commission: number }>()
  for (const barber of report.value?.barberos ?? []) {
    entries.set(barber.id_usuario, { id: barber.id_usuario, name: barber.nombre, count: 0, revenue: 0, commission: 0 })
  }
  for (const record of atenciones.value) {
    const entry = entries.get(record.id_usuario) ?? {
      id: record.id_usuario, name: record.nombre_barbero, count: 0, revenue: 0, commission: 0,
    }
    entry.count++
    entry.revenue += record.monto_total
    entry.commission += record.comision_generada
    entries.set(entry.id, entry)
  }
  return [...entries.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue || a.name.localeCompare(b.name, 'es-CL'))
})

const goalSummary = computed(() => {
  const counts = goalCounts.value
  if (!activeGoal.value || !counts) return null
  const target = activeGoal.value.cantidad_objetivo
  const ids = (report.value?.barberos ?? []).map(barber => barber.id_usuario)
  return { completed: ids.filter(id => (counts.get(id) ?? 0) >= target).length, team: ids.length }
})

const selectedLabel = computed(() => range.value.from === range.value.to
  ? shortDate(range.value.from)
  : `${shortDate(range.value.from)} al ${shortDate(range.value.to)}`)

async function signOut() {
  signingOut.value = true
  signOutError.value = ''
  try {
    await logout()
    await router.replace('/login')
  } catch (error) {
    signOutError.value = errorMessage(error, 'No se pudo cerrar la sesión.')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div class="admin-shell" @keydown.esc="menuOpen = false">
    <div v-if="menuOpen" class="mobile-backdrop" aria-hidden="true" @click="menuOpen = false"></div>
    <aside id="admin-menu" class="admin-sidebar" :class="{ 'menu-open': menuOpen }" aria-label="Barra lateral">
      <div class="brand" aria-label="Barber Pro, GOAT STUDIO 777">
        <BrandLockup compact />
        <button ref="menuClose" class="icon-button mobile-menu" type="button" aria-label="Cerrar menú" @click="menuOpen = false">
          <X :size="19" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Administración" class="admin-nav">
        <span class="nav-label">ESTUDIO</span>
        <RouterLink v-for="link in links.slice(0, 5)" :key="link.id"
          :to="{ path: '/admin', query: link.id === 'rendimiento' ? {} : { tab: link.id } }"
          :class="{ 'nav-current': section.id === link.id }" :aria-current="section.id === link.id ? 'page' : undefined"
          @click="menuOpen = false">
          <component :is="link.icon" :size="17" :stroke-width="1.8" aria-hidden="true" />{{ link.title }}
        </RouterLink>
        <span class="nav-label account-label">CUENTA</span>
        <RouterLink :to="{ path: '/admin', query: { tab: 'perfil' } }" :class="{ 'nav-current': section.id === 'perfil' }"
          :aria-current="section.id === 'perfil' ? 'page' : undefined" @click="menuOpen = false">
          <UserRound :size="17" :stroke-width="1.8" aria-hidden="true" /> Mi perfil
        </RouterLink>
      </nav>

      <div class="sidebar-profile">
        <RouterLink :to="{ path: '/admin', query: { tab: 'perfil' } }" class="sidebar-person" @click="menuOpen = false">
          <span class="avatar" aria-hidden="true">{{ initials(profile?.nombre ?? 'Administrador') }}</span>
          <span class="sidebar-person-text"><strong>{{ profile?.nombre ?? 'Administrador' }}</strong><small>Administración</small></span>
        </RouterLink>
        <button class="icon-button logout" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" :disabled="signingOut" @click="signOut">
          <LogOut :size="18" :stroke-width="1.8" aria-hidden="true" />
        </button>
      </div>
    </aside>

    <div class="admin-workspace">
      <header class="admin-topbar">
        <button ref="menuTrigger" class="icon-button mobile-menu" type="button" aria-label="Menú de administración" aria-controls="admin-menu"
          :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          <Menu :size="21" aria-hidden="true" />
        </button>
        <span class="breadcrumb"><span>Administración</span><ChevronRight :size="14" aria-hidden="true" /><strong>{{ section.title }}</strong></span>
        <span class="today-label"><CalendarDays :size="16" :stroke-width="1.7" aria-hidden="true" />{{ longDate }}</span>
      </header>

      <main class="admin-content">
        <p v-if="signOutError" class="notice notice-error" role="alert">{{ signOutError }}</p>

        <div v-if="section.id === 'rendimiento'" class="admin-hero">
          <div class="hero-copy">
            <span class="hero-studio">GOAT STUDIO 777 <i aria-hidden="true"></i> CHILLÁN</span>
            <h1>Rendimiento del equipo</h1>
            <p>Atenciones, ingresos y metas de tus barberos.</p>
          </div>
          <div class="hero-decoration" aria-hidden="true"><Scissors :size="98" :stroke-width="0.85" /></div>
        </div>

        <div v-else class="page-heading">
          <h1>{{ section.title }}</h1>
          <p v-if="section.id === 'caja'">Revisa los pagos y las comisiones en el período seleccionado.</p>
          <p v-else-if="section.id === 'servicios'">Administra el catálogo y los precios del estudio.</p>
          <p v-else-if="section.id === 'metas'">Define el objetivo de atenciones y el bono por barbero.</p>
          <p v-else-if="section.id === 'equipo'">Crea accesos y ajusta las comisiones del equipo.</p>
          <p v-else>Consulta y actualiza los datos de tu cuenta.</p>
        </div>

        <template v-if="showReports">
          <form class="report-filters" aria-label="Filtrar por fecha" @submit.prevent="applyRange()">
            <div class="presets" aria-label="Períodos rápidos">
              <button type="button" :aria-pressed="preset === 'today'" @click="selectPreset('today')">Hoy</button>
              <button type="button" :aria-pressed="preset === 'week'" @click="selectPreset('week')">Últimos 7 días</button>
              <button type="button" :aria-pressed="preset === 'month'" @click="selectPreset('month')">Este mes</button>
            </div>
            <div class="date-filter-fields">
              <label><span>Desde</span><input v-model="from" type="date" required /></label>
              <label><span>Hasta</span><input v-model="to" type="date" required /></label>
              <button type="submit" class="btn btn-secondary apply-button">Aplicar</button>
            </div>
          </form>
          <p v-if="dateError" class="notice notice-error" role="alert">{{ dateError }}</p>
          <p v-if="reportBusy" class="report-state" role="status">Cargando datos del período…</p>
          <div v-else-if="reportError" class="report-state" role="alert">
            <span>{{ reportError }}</span><button type="button" class="btn btn-secondary" @click="range = { ...range }">Reintentar</button>
          </div>

          <template v-else-if="report">
            <KpiSummaryCards :revenue="totals.revenue" :count="totals.count" :commission="totals.commission" :average="totals.average" />

            <template v-if="section.id === 'rendimiento'">
              <div class="report-grid">
                <ActivityChart :start="range.from" :end="range.to" :records="atenciones" />
                <section class="admin-card goal-card" aria-labelledby="goal-title">
                  <div class="goal-header"><span class="goal-icon"><Target :size="23" :stroke-width="1.7" aria-hidden="true" /></span>
                    <div><h2 id="goal-title">Meta vigente</h2><p v-if="activeGoal">{{ shortDate(activeGoal.fecha_inicio) }} al {{ shortDate(activeGoal.fecha_fin) }}</p></div>
                  </div>
                  <template v-if="activeGoal">
                    <strong class="goal-target">{{ activeGoal.cantidad_objetivo }}</strong><p class="goal-label">atenciones por barbero</p>
                    <div class="goal-detail"><span>Bono individual</span><strong>{{ clp(activeGoal.monto_bono) }}</strong></div>
                    <div v-if="goalSummary" class="goal-detail"><span>Meta alcanzada</span><strong>{{ goalSummary.completed }} de {{ goalSummary.team }}</strong></div>
                    <p v-if="goalError" class="goal-error" role="alert">{{ goalError }}</p>
                  </template>
                  <p v-else class="goal-empty">{{ goalError || 'Aún no hay una meta configurada para hoy.' }}</p>
                  <RouterLink class="goal-link" :to="{ path: '/admin', query: { tab: 'metas' } }">Administrar metas <ChevronRight :size="16" aria-hidden="true" /></RouterLink>
                </section>
              </div>

              <section class="admin-card table-card" aria-labelledby="performance-title">
                <div class="card-heading">
                  <div><h2 id="performance-title">Rendimiento por barbero</h2><p>Ordenado por atenciones · {{ selectedLabel }}</p></div>
                  <span class="count-label"><UsersRound :size="15" aria-hidden="true" /> {{ performance.length }} {{ performance.length === 1 ? 'barbero' : 'barberos' }}</span>
                </div>
                <div v-if="performance.length" class="table-scroll" tabindex="0" aria-label="Tabla de rendimiento por barbero">
                  <table class="admin-table performance-table">
                    <thead><tr>
                      <th scope="col">Barbero</th><th scope="col" class="numeric">Atenciones</th><th scope="col" class="numeric">Ingresos</th>
                      <th scope="col" class="numeric">Comisiones</th><th v-if="activeGoal" scope="col">Meta vigente</th>
                    </tr></thead>
                    <tbody>
                      <tr v-for="barber in performance" :key="barber.id">
                        <th scope="row"><span class="barber-name"><span class="avatar" aria-hidden="true">{{ initials(barber.name) }}</span>{{ barber.name }}</span></th>
                        <td class="numeric">{{ barber.count }}</td><td class="numeric">{{ clp(barber.revenue) }}</td><td class="numeric">{{ clp(barber.commission) }}</td>
                        <td v-if="activeGoal">
                          <div v-if="goalCounts" class="table-progress">
                            <progress :value="Math.min(goalCounts.get(barber.id) ?? 0, activeGoal.cantidad_objetivo)" :max="activeGoal.cantidad_objetivo"
                              :aria-label="`Avance de ${barber.name}`"></progress>
                            <span>{{ goalCounts.get(barber.id) ?? 0 }}/{{ activeGoal.cantidad_objetivo }}</span>
                            <Check v-if="(goalCounts.get(barber.id) ?? 0) >= activeGoal.cantidad_objetivo" :size="14" aria-label="Meta alcanzada" />
                          </div>
                          <span v-else aria-label="Sin datos">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="table-empty">Agrega un barbero en <RouterLink :to="{ path: '/admin', query: { tab: 'equipo' } }">Equipo</RouterLink> para ver su rendimiento aquí.</p>
              </section>
            </template>

            <template v-else>
              <div class="payments-grid">
                <article class="admin-card payment-card"><span class="goal-icon"><Banknote :size="21" aria-hidden="true" /></span><div><h2>Efectivo</h2><strong>{{ clp(totals.cash) }}</strong></div></article>
                <article class="admin-card payment-card"><span class="goal-icon"><CreditCard :size="21" aria-hidden="true" /></span><div><h2>Tarjeta</h2><strong>{{ clp(totals.card) }}</strong></div></article>
              </div>
              <section class="admin-card table-card" aria-labelledby="commission-title">
                <div class="card-heading"><div><h2 id="commission-title">Comisiones por barbero</h2><p>Atenciones activas · {{ selectedLabel }}</p></div></div>
                <div v-if="performance.length" class="table-scroll" tabindex="0" aria-label="Tabla de comisiones por barbero">
                  <table class="admin-table">
                    <thead><tr><th scope="col">Barbero</th><th scope="col" class="numeric">Atenciones</th><th scope="col" class="numeric">Ingresos</th><th scope="col" class="numeric">Comisiones</th></tr></thead>
                    <tbody><tr v-for="barber in performance" :key="barber.id"><th scope="row">{{ barber.name }}</th><td class="numeric">{{ barber.count }}</td><td class="numeric">{{ clp(barber.revenue) }}</td><td class="numeric">{{ clp(barber.commission) }}</td></tr></tbody>
                  </table>
                </div>
                <p v-else class="table-empty">No hay barberos para mostrar.</p>
              </section>
              <section class="admin-card table-card" aria-labelledby="cash-records-title">
                <div class="card-heading"><div><h2 id="cash-records-title">Movimientos de caja</h2><p>Las anulaciones se muestran en el historial y se excluyen de los totales.</p></div></div>
                <div class="cash-wrapper"><CashClosureTable :atenciones="report.atenciones" /></div>
              </section>
            </template>
          </template>
        </template>

        <AdminSettings v-else-if="section.id !== 'rendimiento' && section.id !== 'caja'" :key="section.id" :section="section.id" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell{--admin-ink:var(--text,#241f17);--admin-muted:var(--muted,#6f6555);--admin-line:var(--line,#e9e2d5);--admin-gold:#846019;display:grid;grid-template-columns:236px minmax(0,1fr);min-height:100dvh;background:#faf8f3;color:var(--admin-ink)}
.admin-sidebar{height:100dvh;position:sticky;top:0;display:flex;flex-direction:column;padding:24px 16px 16px;background:white;border-right:1px solid var(--admin-line);z-index:4}
.brand{display:flex;align-items:center;justify-content:space-between;gap:4px;padding:0 6px;margin-bottom:38px}
.admin-nav{display:flex;flex-direction:column;gap:4px}
.nav-label{display:block;padding:0 10px;margin:0 0 7px;color:var(--admin-muted);font-size:10px;font-weight:750;letter-spacing:.12em}
.account-label{margin-top:22px}
.admin-nav a{display:flex;align-items:center;gap:11px;min-height:42px;padding:8px 10px;color:var(--admin-muted);font-size:13px;font-weight:650;text-decoration:none;border:1px solid transparent;border-radius:9px}
.admin-nav a:hover{background:#faf7ee;color:var(--admin-ink)}
.admin-nav .nav-current{background:#f6eedb;color:#735018;border-color:#eee0bd;font-weight:750}
.sidebar-profile{border-top:1px solid var(--admin-line);margin-top:auto;padding:15px 0 0;display:flex;align-items:center;justify-content:space-between;gap:6px}
.sidebar-person{display:flex;align-items:center;gap:8px;min-width:0;color:inherit;text-decoration:none}
.sidebar-person-text{min-width:0}
.sidebar-person strong,.sidebar-person small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sidebar-person strong{font-size:12px}
.sidebar-person small{color:var(--admin-muted);font-size:11px}
.avatar{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:50%;background:#f3e8d0;color:#785520;font-weight:750;font-size:11px}
.icon-button{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border:none;border-radius:8px;color:var(--admin-muted);background:transparent;cursor:pointer}
.icon-button:hover{background:#f8f1e4;color:#735018}
.icon-button:disabled{cursor:wait;opacity:.55}
.icon-button.mobile-menu,.mobile-backdrop{display:none}
.admin-workspace{min-width:0}
.admin-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;height:72px;border-bottom:1px solid var(--admin-line);background:white;padding:0 30px}
.breadcrumb,.today-label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--admin-muted)}
.breadcrumb strong{color:var(--admin-ink);font-weight:650}
.today-label{font-size:12px;text-transform:capitalize;text-align:right}
.today-label svg{flex-shrink:0;color:var(--admin-gold)}
.admin-content{width:min(100%,1480px);margin:auto;padding:26px 30px 45px;display:grid;gap:18px}
.admin-hero{min-height:146px;position:relative;overflow:hidden;isolation:isolate;display:flex;align-items:center;border:1px solid #e8dabb;border-radius:18px;background:linear-gradient(110deg,#f9f3e7 0%,#f8f0dd 56%,#f0dfb7 100%);padding:27px 29px}
.hero-copy{position:relative;z-index:1}
.hero-studio{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:750;letter-spacing:.135em;color:#765017;margin-bottom:8px}
.hero-studio i{width:4px;height:4px;border-radius:50%;background:#aa7f2a}
.hero-copy h1,.page-heading h1{font-family:var(--display,Georgia,serif);font-size:clamp(1.85rem,4vw,2.8rem);font-weight:650;line-height:1.12;letter-spacing:-.035em;margin:0;color:var(--admin-ink)}
.hero-copy p,.page-heading p{font-size:14px;color:var(--admin-muted);margin:8px 0 0;line-height:1.5}
.hero-decoration{position:absolute;right:17px;top:50%;translate:0 -50%;width:210px;height:210px;display:grid;place-items:center;border:1px solid #a27a352f;border-radius:100%;color:#916a2442;transform:rotate(-18deg);pointer-events:none}
.hero-decoration::before,.hero-decoration::after{content:'';position:absolute;inset:12px;border:1px solid #a27a3533;border-radius:100%}
.hero-decoration::after{inset:auto;width:238px;height:238px}
.page-heading{padding:5px 0 2px}
.report-filters{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap}
.presets{display:flex;flex-wrap:wrap;gap:3px;background:white;border:1px solid var(--admin-line);padding:4px;border-radius:10px}
.presets button{border:0;border-radius:7px;padding:8px 10px;line-height:1.25;background:transparent;color:var(--admin-muted);font-size:12px;font-weight:650;cursor:pointer}
.presets button:hover{background:#f9f4e9;color:var(--admin-ink)}
.presets button[aria-pressed=true]{background:#f3e7cc;color:#735018;font-weight:750}
.date-filter-fields{display:flex;flex-wrap:wrap;align-items:flex-end;gap:7px}
.date-filter-fields label{display:grid;gap:3px;color:var(--admin-muted);font-size:10px;font-weight:700;letter-spacing:.045em;text-transform:uppercase}
.date-filter-fields input{height:37px;min-width:0;border:1px solid var(--admin-line);border-radius:8px;background:white;padding:0 8px;color:var(--admin-ink);font:inherit;font-size:12px;font-weight:550;letter-spacing:normal}
.date-filter-fields .apply-button{min-height:37px;padding:6px 12px;border-radius:8px;font-size:12px}
.report-state{margin:0;min-height:150px;display:flex;align-items:center;justify-content:center;gap:12px;text-align:center;padding:20px;color:var(--admin-muted);background:white;border:1px solid var(--admin-line);border-radius:16px;font-size:14px}
.report-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(215px,.36fr);gap:16px}
.admin-card{min-width:0;background:white;border:1px solid var(--admin-line);border-radius:16px;box-shadow:0 2px 5px #5c452006}
.admin-card h2{font-size:17px;line-height:1.25;margin:0;letter-spacing:-.02em}
.goal-card{padding:20px;display:flex;flex-direction:column;background:linear-gradient(150deg,#fff 54%,#faf5ea)}
.goal-header{display:flex;align-items:center;gap:9px}
.goal-icon{display:grid;place-items:center;flex:0 0 40px;height:40px;border-radius:10px;background:#f6edd6;color:var(--admin-gold)}
.goal-header p{font-size:12px;color:var(--admin-muted);margin:3px 0 0}
.goal-target{color:#6f4b15;margin-top:12px;line-height:1;font-size:33px;letter-spacing:-.05em}
.goal-label{color:var(--admin-muted);font-size:12px;margin:3px 0 7px}
.goal-detail{display:flex;justify-content:space-between;align-items:center;gap:6px;border-top:1px solid var(--admin-line);font-size:12px;margin-top:4px;padding-top:5px}
.goal-detail span,.goal-empty{color:var(--admin-muted)}
.goal-empty,.goal-error{font-size:13px;line-height:1.4;margin:16px 0}
.goal-error{color:#8c321b}
.goal-link{display:flex;align-items:center;gap:4px;color:#765017;text-decoration:none;font-weight:750;font-size:12px;margin-top:auto;padding-top:10px}
.goal-link:hover{text-decoration:underline}
.card-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 21px}
.card-heading p{font-size:13px;color:var(--admin-muted);margin:4px 0 0}
.count-label{display:flex;align-items:center;gap:6px;white-space:nowrap;border-radius:100px;padding:6px 9px;background:#f8f1e3;color:#765017;font-size:11px;font-weight:700}
.table-scroll{overflow:auto;border-radius:0 0 15px 15px}
.admin-table{border-collapse:collapse;width:100%;min-width:425px;font-size:13px;text-align:left}
.performance-table:has(progress){min-width:555px}
.admin-table td,.admin-table th{padding:10px 16px;border-bottom:1px solid var(--admin-line)}
.admin-table thead th{background:#faf7f0;color:var(--admin-muted);font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.admin-table tbody tr:last-child td,.admin-table tbody tr:last-child th{border-bottom:0}
.admin-table tbody th{font-weight:650}
.numeric{text-align:right;font-variant-numeric:tabular-nums}
.barber-name{display:flex;align-items:center;gap:8px}
.barber-name .avatar{height:28px;flex-basis:28px;font-size:10px}
.table-progress{display:flex;align-items:center;gap:6px;color:#765017;font-size:11px;font-weight:650;white-space:nowrap}
.table-progress progress{width:clamp(42px,7vw,96px);height:6px;appearance:none;border:0;border-radius:50px;background:#f2e9d7;color:#ad8234}
.table-progress progress::-webkit-progress-bar{border-radius:50px;background:#f2e9d7}
.table-progress progress::-webkit-progress-value{border-radius:50px;background:#ad8234}
.table-progress progress::-moz-progress-bar{border-radius:50px;background:#ad8234}
.table-empty{color:var(--admin-muted);font-size:13px;margin:0;padding:6px 21px 20px}
.table-empty a{color:#765017;font-weight:650}
.cash-wrapper{padding:0 5px 5px}
.cash-wrapper :deep(.empty-movements){padding:3px 16px 12px;margin:0}
.payments-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.payment-card{display:flex;align-items:center;gap:12px;padding:16px 20px}
.payment-card h2{font-size:13px;color:var(--admin-muted)}
.payment-card strong{display:block;margin-top:4px;font-size:21px;letter-spacing:-.03em}
@media(max-width:960px){
  .admin-shell{grid-template-columns:minmax(0,1fr)}
  .admin-sidebar{position:fixed;left:0;top:0;width:min(236px,82vw);visibility:hidden;translate:-100% 0;transition:translate .2s ease,visibility .2s ease}
  .admin-sidebar.menu-open{visibility:visible;translate:0 0}
  .mobile-backdrop{display:block;position:fixed;inset:0;border:0;background:#261c1190;z-index:3}
  .icon-button.mobile-menu{display:grid}
  .admin-topbar{justify-content:flex-start;padding-inline:18px}
  .today-label{margin-left:auto}
  .admin-content{padding:20px 18px 30px}
}
@media(max-width:640px){
  .report-grid{grid-template-columns:1fr}
  .admin-content{gap:13px}
  .admin-hero{padding:23px 16px;min-height:129px}
  .hero-decoration{right:-100px;opacity:.65}
  .admin-topbar{height:60px;padding-inline:10px;gap:5px}
  .breadcrumb span,.breadcrumb>svg{display:none}
  .breadcrumb,.today-label{font-size:11px}
  .today-label{max-width:128px;gap:4px;line-height:1.25}
  .report-filters{align-items:flex-start}
  .date-filter-fields input{max-width:124px}
  .card-heading{padding:16px 13px}
  .card-heading p{font-size:11px}
  .admin-card h2{font-size:15px}
  .count-label{padding:5px 6px;font-size:10px}
  .payments-grid{gap:9px}
  .payment-card{padding:11px;gap:7px;flex-wrap:wrap}
}
@media(prefers-reduced-motion:reduce){.admin-sidebar{transition:none}}
</style>
