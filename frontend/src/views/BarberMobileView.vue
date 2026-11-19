<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight, Banknote, CalendarDays, CheckCircle2, ChevronLeft, Clock3, CreditCard,
  LogOut, ReceiptText, RotateCcw, Scissors, UserRound, Wallet, X,
} from 'lucide-vue-next'
import BrandLockup from '../components/BrandLockup.vue'
import GoalProgressBar from '../components/barber/GoalProgressBar.vue'
import ServiceTileButton from '../components/barber/ServiceTileButton.vue'
import { anularAtencion, createAtencion, listAtenciones } from '../services/atencionesService'
import { logout, updateProfile, useAuth } from '../services/authService'
import { listMetas } from '../services/metasService'
import { listServicios } from '../services/serviciosService'
import type { Atencion, Meta, MetodoPago, Servicio } from '../types/models'
import { clp, initials, localDate, shiftDate, shortDate, timeLabel } from '../utils/format'

type Section = 'registro' | 'historial' | 'perfil'
type HistoryRange = 'hoy' | 'semana' | 'mes'

const router = useRouter()
const { profile } = useAuth()
const section = ref<Section>('registro')
const now = ref(Date.now())
const services = ref<Servicio[]>([])
const goals = ref<Meta[]>([])
const currentRecords = ref<Atencion[]>([])
const history = ref<Atencion[]>([])
const historyRange = ref<HistoryRange>('semana')
const loading = ref(true)
const historyLoading = ref(false)
const loadError = ref('')
const historyError = ref('')
const actionError = ref('')
const success = ref('')
const selectedService = ref<Servicio | null>(null)
const selectedPayment = ref<MetodoPago | null>(null)
const paymentError = ref('')
const paymentDialog = ref<HTMLDialogElement>()
const cancelling = ref(false)
const savingName = ref(false)
const signingOut = ref(false)
const displayName = ref(profile.value?.nombre ?? '')
let clock: number
let currentRequest = 0
let historyRequest = 0

const navigation = [
  { id: 'registro', label: 'Registro diario', short: 'Registro', icon: Scissors },
  { id: 'historial', label: 'Historial', short: 'Historial', icon: Clock3 },
  { id: 'perfil', label: 'Mi perfil', short: 'Perfil', icon: UserRound },
] as const

const rangeOptions = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Últimos 30 días' },
] as const

const today = computed(() => localDate(new Date(now.value)))
const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Santiago',
})
const dateHeading = computed(() => dateFormatter.format(new Date(today.value + 'T12:00:00Z')))
const weekStart = computed(() => {
  const weekday = new Date(today.value + 'T12:00:00Z').getUTCDay()
  return shiftDate(today.value, -((weekday + 6) % 7))
})
const activeGoal = computed(() => goals.value
  .filter((goal) => goal.fecha_inicio <= today.value && goal.fecha_fin >= today.value)
  .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio) || b.fecha_fin.localeCompare(a.fecha_fin))[0])

const activeRecords = computed(() => currentRecords.value.filter((record) => record.estado === 'activa'))
const todayRecords = computed(() => currentRecords.value.filter((record) => localDate(record.fecha_registro) === today.value))
const todayCount = computed(() => todayRecords.value.filter((record) => record.estado === 'activa').length)
const commission = computed(() => activeRecords.value
  .filter((record) => localDate(record.fecha_registro) >= weekStart.value)
  .reduce((sum, record) => sum + record.comision_generada, 0))
const goalCount = computed(() => {
  const goal = activeGoal.value
  if (!goal) return 0
  return activeRecords.value.filter((record) => {
    const day = localDate(record.fecha_registro)
    return day >= goal.fecha_inicio && day <= goal.fecha_fin
  }).length
})
const latest = computed(() => currentRecords.value[0])
const canCancel = computed(() => {
  if (latest.value?.estado !== 'activa') return false
  return now.value - Date.parse(latest.value.fecha_registro) < 180_000
})
const historyStart = computed(() => {
  if (historyRange.value === 'hoy') return today.value
  if (historyRange.value === 'mes') return shiftDate(today.value, -29)
  return weekStart.value
})
const historyTotal = computed(() => history.value
  .filter((record) => record.estado === 'activa')
  .reduce((sum, record) => sum + record.comision_generada, 0))

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function newestFirst(records: Atencion[]) {
  return [...records].sort((a, b) => Date.parse(b.fecha_registro) - Date.parse(a.fecha_registro))
}

function paymentLabel(payment: MetodoPago) {
  return payment === 'efectivo' ? 'Efectivo' : 'Tarjeta'
}

async function refreshDashboard() {
  const request = ++currentRequest
  const date = today.value
  const earliest = [weekStart.value, shiftDate(date, -1), activeGoal.value?.fecha_inicio ?? date].sort()[0]
  try {
    const records = await listAtenciones(earliest, date)
    if (request === currentRequest) currentRecords.value = newestFirst(records)
  } catch (error) {
    if (request === currentRequest) throw error
  }
}

async function syncRecords() {
  try {
    await refreshDashboard()
  } catch (error) {
    loadError.value = errorMessage(error, 'No pudimos actualizar tu registro.')
  }
}

async function loadDashboard() {
  loading.value = true
  loadError.value = ''
  try {
    const [catalog, periods] = await Promise.all([listServicios(), listMetas()])
    services.value = catalog
    goals.value = periods
    await refreshDashboard()
  } catch (error) {
    loadError.value = errorMessage(error, 'No pudimos actualizar tu registro.')
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  const request = ++historyRequest
  historyLoading.value = true
  historyError.value = ''
  history.value = []
  try {
    const records = await listAtenciones(historyStart.value, today.value)
    if (request === historyRequest) history.value = newestFirst(records)
  } catch (error) {
    if (request === historyRequest) historyError.value = errorMessage(error, 'No pudimos cargar tu historial.')
  } finally {
    if (request === historyRequest) historyLoading.value = false
  }
}

function navigate(target: Section) {
  section.value = target
  actionError.value = ''
  success.value = ''
}

function openPayment(service: Servicio) {
  selectedService.value = service
  paymentError.value = ''
  actionError.value = ''
  success.value = ''
  paymentDialog.value?.showModal()
}

function closePayment() {
  if (!selectedPayment.value) paymentDialog.value?.close()
}

async function register(payment: MetodoPago) {
  if (!selectedService.value || selectedPayment.value) return
  selectedPayment.value = payment
  paymentError.value = ''
  try {
    const record = await createAtencion({
      id_servicio: selectedService.value.id_servicio,
      metodo_pago: payment,
    })
    currentRecords.value = newestFirst([
      record,
      ...currentRecords.value.filter(({ id_atencion }) => id_atencion !== record.id_atencion),
    ])
    now.value = Date.now()
    success.value = `${record.nombre_servicio} registrado · ${paymentLabel(payment)}.`
    paymentDialog.value?.close()
    void syncRecords()
  } catch (error) {
    paymentError.value = errorMessage(error, 'No pudimos registrar la atención.')
  } finally {
    selectedPayment.value = null
  }
}

async function cancelLatest() {
  const record = latest.value
  if (!record || !canCancel.value || cancelling.value) return
  cancelling.value = true
  actionError.value = ''
  success.value = ''
  try {
    const updated = await anularAtencion(record.id_atencion)
    currentRecords.value = currentRecords.value.map((item) => (
      item.id_atencion === updated.id_atencion ? updated : item
    ))
    success.value = 'Atención anulada.'
  } catch (error) {
    actionError.value = errorMessage(error, 'No pudimos anular la atención.')
  } finally {
    cancelling.value = false
    void syncRecords()
  }
}

async function saveProfile() {
  if (savingName.value || !displayName.value.trim()) return
  savingName.value = true
  actionError.value = ''
  success.value = ''
  try {
    const updated = await updateProfile(displayName.value.trim())
    displayName.value = updated.nombre
    success.value = 'Tu perfil se actualizó.'
  } catch (error) {
    actionError.value = errorMessage(error, 'No pudimos guardar tu perfil.')
  } finally {
    savingName.value = false
  }
}

async function signOut() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await logout()
    await router.replace('/login')
  } catch (error) {
    actionError.value = errorMessage(error, 'No pudimos cerrar tu sesión.')
    signingOut.value = false
  }
}

watch(today, () => { void loadDashboard() })
watch([section, historyRange, today], () => {
  if (section.value === 'historial') void loadHistory()
})
watch(profile, (user) => { displayName.value = user?.nombre ?? '' })
onMounted(() => {
  clock = window.setInterval(() => { now.value = Date.now() }, 1000)
  void loadDashboard()
})
onBeforeUnmount(() => {
  window.clearInterval(clock)
  currentRequest += 1
  historyRequest += 1
})
</script>

<template>
  <div class="barber-shell">
    <aside class="barber-sidebar">
      <BrandLockup />
      <nav class="desktop-nav" aria-label="Navegación del barbero">
        <button
          v-for="item in navigation"
          :key="item.id"
          type="button"
          :aria-current="section === item.id ? 'page' : undefined"
          @click="navigate(item.id)"
        >
          <component :is="item.icon" :size="19" :stroke-width="1.75" aria-hidden="true" />
          {{ item.label }}
        </button>
      </nav>
      <div class="sidebar-account">
        <span class="avatar" aria-hidden="true">{{ initials(profile?.nombre ?? '') }}</span>
        <span class="account-name"><strong>{{ profile?.nombre }}</strong><small>Barbero</small></span>
        <button class="icon-button" type="button" aria-label="Cerrar sesión" :disabled="signingOut" @click="signOut">
          <LogOut :size="17" aria-hidden="true" />
        </button>
      </div>
    </aside>

    <div class="barber-body">
      <header class="barber-topbar">
        <div class="mobile-brand"><BrandLockup compact /></div>
        <span class="desktop-crumb">{{ navigation.find((item) => item.id === section)?.label }}</span>
        <button class="top-account" type="button" aria-label="Abrir mi perfil" @click="navigate('perfil')">
          <span class="avatar" aria-hidden="true">{{ initials(profile?.nombre ?? '') }}</span>
          <span class="top-name">{{ profile?.nombre }}</span>
        </button>
      </header>

      <main id="contenido-barbero" class="barber-content">
        <div v-if="success" class="message success" role="status">
          <CheckCircle2 :size="17" aria-hidden="true" /><span>{{ success }}</span>
        </div>
        <p v-if="actionError" class="message error" role="alert">{{ actionError }}</p>

        <template v-if="section === 'registro'">
          <div class="hero-row">
            <div>
              <p class="eyebrow">Mi jornada</p>
              <h1>Hola, {{ profile?.nombre.split(/\s+/)[0] }}</h1>
              <p class="intro">Registra tus servicios y revisa el avance de tu meta.</p>
            </div>
            <div class="day-chip"><CalendarDays :size="17" aria-hidden="true" /> {{ dateHeading }}</div>
          </div>

          <div v-if="loadError" class="message error" role="alert">
            <span>{{ loadError }}</span>
            <button type="button" class="text-action" @click="loadDashboard">Reintentar</button>
          </div>
          <div class="metric-grid" :aria-busy="loading">
            <section class="stat-card">
              <span class="stat-icon"><Scissors :size="19" :stroke-width="1.6" aria-hidden="true" /></span>
              <h2>Atenciones hoy</h2>
              <p>{{ loading || loadError ? '—' : todayCount }}</p>
            </section>
            <section class="stat-card">
              <span class="stat-icon"><Wallet :size="19" :stroke-width="1.6" aria-hidden="true" /></span>
              <h2>Comisión semanal</h2>
              <p>{{ loading || loadError ? '—' : clp(commission) }}</p>
            </section>
            <GoalProgressBar
              class="metric-goal"
              :actual="goalCount"
              :objetivo="activeGoal?.cantidad_objetivo ?? null"
              :bono="activeGoal?.monto_bono"
              :periodo="activeGoal ? `${shortDate(activeGoal.fecha_inicio)} – ${shortDate(activeGoal.fecha_fin)}` : undefined"
              :cargando="loading"
              :error="Boolean(loadError)"
            />
          </div>

          <div class="work-grid">
            <section class="workspace-card" aria-labelledby="register-heading">
              <div class="section-heading">
                <h2 id="register-heading">Registrar atención</h2>
                <p>Elige un servicio y su método de pago.</p>
              </div>
              <p v-if="loading" class="empty-message" role="status">Cargando servicios…</p>
              <div v-else-if="services.length" class="service-grid">
                <ServiceTileButton
                  v-for="service in services"
                  :key="service.id_servicio"
                  :servicio="service"
                  :disabled="cancelling"
                  @select="openPayment"
                />
              </div>
              <p v-else-if="!loadError" class="empty-message">El administrador todavía no ha agregado servicios.</p>
            </section>

            <section class="workspace-card recent-card" aria-labelledby="activity-heading">
              <div class="section-heading">
                <h2 id="activity-heading">Actividad de hoy</h2>
                <p>Tus últimos registros de esta jornada.</p>
              </div>
              <div v-if="canCancel" class="undo-box">
                <button type="button" class="text-action undo-action" :disabled="cancelling" @click="cancelLatest">
                  <RotateCcw :size="16" aria-hidden="true" />
                  {{ cancelling ? 'Anulando…' : 'Anular último registro' }}
                </button>
                <small>{{ latest?.nombre_servicio }} · {{ latest ? timeLabel(latest.fecha_registro) : '' }}</small>
              </div>
              <p v-if="loading" class="empty-message" role="status">Cargando actividad…</p>
              <ul v-else-if="todayRecords.length" class="receipt-list">
                <li v-for="record in todayRecords.slice(0, 5)" :key="record.id_atencion">
                  <span class="receipt-icon"><ReceiptText :size="17" aria-hidden="true" /></span>
                  <span class="receipt-name">
                    <strong>{{ record.nombre_servicio }}</strong>
                    <small>{{ timeLabel(record.fecha_registro) }} · {{ paymentLabel(record.metodo_pago) }}</small>
                  </span>
                  <span class="receipt-amount" :class="{ voided: record.estado === 'anulada' }">
                    <strong>{{ clp(record.monto_total) }}</strong>
                    <small v-if="record.estado === 'anulada'">Anulada</small>
                  </span>
                </li>
              </ul>
              <p v-else-if="!loadError" class="empty-message">Las atenciones que registres hoy aparecerán aquí.</p>
              <button type="button" class="text-action history-link" @click="navigate('historial')">
                Ver historial <ArrowRight :size="16" aria-hidden="true" />
              </button>
            </section>
          </div>
        </template>

        <template v-else-if="section === 'historial'">
          <div class="hero-row">
            <div>
              <p class="eyebrow">Mi jornada</p>
              <h1>Historial de atenciones</h1>
              <p class="intro">Consulta tus servicios, pagos y comisiones.</p>
            </div>
          </div>
          <section class="workspace-card" aria-label="Registros por período">
            <div class="history-header">
              <div class="range-control" role="group" aria-label="Período">
                <button
                  v-for="range in rangeOptions"
                  :key="range.id"
                  type="button"
                  :aria-pressed="historyRange === range.id"
                  @click="historyRange = range.id"
                >{{ range.label }}</button>
              </div>
              <p v-if="!historyLoading && !historyError" class="history-total">
                Comisión del período <strong>{{ clp(historyTotal) }}</strong>
              </p>
            </div>
            <p v-if="historyLoading" class="empty-message" role="status">Cargando historial…</p>
            <div v-else-if="historyError" class="message error" role="alert">
              <span>{{ historyError }}</span>
              <button type="button" class="text-action" @click="loadHistory">Reintentar</button>
            </div>
            <ul v-else-if="history.length" class="receipt-list full-history">
              <li v-for="record in history" :key="record.id_atencion">
                <span class="receipt-icon"><ReceiptText :size="17" aria-hidden="true" /></span>
                <span class="receipt-name">
                  <strong>{{ record.nombre_servicio }}</strong>
                  <small>{{ shortDate(localDate(record.fecha_registro)) }} · {{ timeLabel(record.fecha_registro) }} · {{ paymentLabel(record.metodo_pago) }}</small>
                </span>
                <span class="receipt-amount" :class="{ voided: record.estado === 'anulada' }">
                  <strong>{{ clp(record.monto_total) }}</strong>
                  <small>{{ record.estado === 'anulada' ? 'Anulada' : `${clp(record.comision_generada)} comisión` }}</small>
                </span>
              </li>
            </ul>
            <p v-else class="empty-message">No hay atenciones en este período.</p>
          </section>
        </template>

        <template v-else>
          <div class="hero-row">
            <div>
              <p class="eyebrow">Cuenta</p>
              <h1>Mi perfil</h1>
              <p class="intro">Consulta los datos de tu cuenta y actualiza tu nombre.</p>
            </div>
          </div>
          <section class="workspace-card profile-card" aria-labelledby="profile-title">
            <div class="profile-intro">
              <div class="avatar profile-avatar" aria-hidden="true">{{ initials(profile?.nombre ?? '') }}</div>
              <div>
                <h2 id="profile-title">{{ profile?.nombre }}</h2>
                <p>Barbero · GOAT STUDIO 777</p>
              </div>
            </div>
            <form class="profile-form" @submit.prevent="saveProfile">
              <label>Nombre <input v-model="displayName" class="field" type="text" required minlength="2" maxlength="80" autocomplete="name" /></label>
              <dl>
                <div><dt>{{ profile?.usuario ? 'Nombre de usuario' : 'Correo electrónico' }}</dt><dd>{{ profile?.usuario ?? profile?.email }}</dd></div>
                <div><dt>Comisión</dt><dd>{{ profile?.porcentaje_comision }}%</dd></div>
              </dl>
              <button type="submit" class="btn btn-primary" :disabled="savingName || !displayName.trim() || displayName.trim() === profile?.nombre">
                {{ savingName ? 'Guardando…' : 'Guardar nombre' }}
              </button>
            </form>
            <div class="profile-footer">
              <button type="button" class="btn btn-secondary" :disabled="signingOut" @click="signOut">
                <LogOut :size="16" aria-hidden="true" /> {{ signingOut ? 'Cerrando sesión…' : 'Cerrar sesión' }}
              </button>
            </div>
          </section>
        </template>
      </main>
    </div>

    <nav class="mobile-nav" aria-label="Navegación del barbero">
      <button
        v-for="item in navigation"
        :key="item.id"
        type="button"
        :aria-current="section === item.id ? 'page' : undefined"
        @click="navigate(item.id)"
      >
        <component :is="item.icon" :size="20" :stroke-width="1.75" aria-hidden="true" />
        {{ item.short }}
      </button>
    </nav>

    <dialog ref="paymentDialog" class="payment-dialog" aria-labelledby="payment-title" @cancel.prevent="closePayment">
      <div class="payment-header">
        <div>
          <p class="eyebrow">Registrar atención</p>
          <h2 id="payment-title">Método de pago</h2>
        </div>
        <button type="button" class="icon-button" aria-label="Cerrar" :disabled="Boolean(selectedPayment)" @click="closePayment">
          <X :size="21" aria-hidden="true" />
        </button>
      </div>
      <div v-if="selectedService" class="payment-summary">
        <span>{{ selectedService.nombre_servicio }}</span><strong>{{ clp(selectedService.precio) }}</strong>
      </div>
      <p v-if="paymentError" class="message error" role="alert">{{ paymentError }}</p>
      <div class="payment-options">
        <button type="button" class="btn btn-secondary" :disabled="Boolean(selectedPayment)" @click="register('efectivo')">
          <Banknote :size="21" aria-hidden="true" />
          {{ selectedPayment === 'efectivo' ? 'Registrando…' : 'Efectivo' }}
        </button>
        <button type="button" class="btn btn-primary" :disabled="Boolean(selectedPayment)" @click="register('tarjeta')">
          <CreditCard :size="21" aria-hidden="true" />
          {{ selectedPayment === 'tarjeta' ? 'Registrando…' : 'Tarjeta' }}
        </button>
      </div>
      <button type="button" class="text-action back-action" :disabled="Boolean(selectedPayment)" @click="closePayment">
        <ChevronLeft :size="16" aria-hidden="true" /> Volver a servicios
      </button>
    </dialog>
  </div>
</template>

<style scoped>
.barber-shell {
  min-height: 100vh;
  color: var(--text, #241f17);
  background: var(--cream, #f8f6f0);
}
.barber-sidebar,
.desktop-crumb,
.top-name { display: none; }
.barber-body { min-width: 0; }
.barber-topbar {
  height: 66px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 17px;
  background: var(--surface, white);
  border-bottom: 1px solid var(--line, #e9e1d2);
}
.top-account, .icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 0;
  border-radius: 9px;
  padding: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.top-account { flex-shrink: 0; min-height: 44px; }
.top-name { color: var(--muted, #756957); font-size: 0.82rem; font-weight: 650; }
.icon-button { width: 44px; height: 44px; }
.icon-button:hover { background: var(--gold-soft, #f5ead7); }
.icon-button:disabled, .text-action:disabled { opacity: 0.55; cursor: wait; }
.avatar {
  width: 37px;
  height: 37px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--gold-soft, #f5ead7);
  color: var(--gold-dark, #745324);
  font-weight: 750;
  font-size: 0.76rem;
}
.barber-content {
  width: 100%;
  max-width: 1260px;
  margin: 0 auto;
  padding: 23px 16px calc(88px + env(safe-area-inset-bottom));
}
.hero-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 11px;
  margin-bottom: 20px;
}
.eyebrow { margin: 0 0 8px; }
h1 {
  font-family: var(--display, Georgia, serif);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.025em;
  margin: 0;
  overflow-wrap: anywhere;
}
.intro {
  color: var(--muted, #756957);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 8px 0 0;
}
.day-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.73rem;
  font-weight: 650;
  white-space: nowrap;
  background: var(--surface, white);
  color: var(--gold-dark, #745324);
  border: 1px solid var(--line, #e9e1d2);
  border-radius: 999px;
}
.day-chip::first-letter { text-transform: uppercase; }
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  margin-bottom: 22px;
}
.metric-goal { grid-column: 1 / -1; }
.stat-card, .workspace-card {
  background: var(--surface, white);
  border: 1px solid var(--line, #e9e1d2);
  border-radius: 16px;
}
.stat-card { padding: 14px; min-width: 0; }
.stat-icon, .receipt-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  color: var(--gold-dark, #745324);
  background: var(--gold-soft, #f5ead7);
  flex: 0 0 auto;
}
.stat-card h2 { margin: 10px 0 5px; color: var(--muted, #756957); font-size: 0.75rem; font-weight: 650; }
.stat-card p {
  font: 600 clamp(1.32rem, 4.7vw, 2rem)/1.1 var(--display, Georgia, serif);
  letter-spacing: -0.03em;
  margin: 0;
  overflow-wrap: anywhere;
}
.work-grid { display: grid; gap: 15px; }
.workspace-card { padding: 16px; min-width: 0; }
.section-heading { margin-bottom: 16px; }
.section-heading h2, .payment-header h2, .profile-intro h2 {
  margin: 0;
  font-family: var(--display, Georgia, serif);
  font-weight: 625;
  font-size: 1.4rem;
  line-height: 1.2;
  color: var(--text, #241f17);
  overflow-wrap: anywhere;
}
.section-heading p, .profile-intro p {
  margin: 5px 0 0;
  color: var(--muted, #756957);
  font-size: 0.81rem;
  line-height: 1.45;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.empty-message {
  margin: 0;
  padding: 17px 14px;
  background: var(--cream, #f8f6f0);
  color: var(--muted, #756957);
  border-radius: 11px;
  font-size: 0.83rem;
  line-height: 1.45;
}
.receipt-list { list-style: none; margin: 0; padding: 0; }
.receipt-list li {
  display: flex;
  gap: 9px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--line, #e9e1d2);
}
.receipt-list li:last-child { border-bottom: 0; }
.receipt-icon { width: 32px; height: 32px; border-radius: 8px; }
.receipt-name, .receipt-amount { display: grid; min-width: 0; gap: 3px; }
.receipt-name { flex: 1; }
.receipt-name strong, .receipt-amount strong { font-size: 0.81rem; overflow-wrap: anywhere; line-height: 1.3; }
.receipt-amount { text-align: right; }
.receipt-amount.voided strong { text-decoration: line-through; }
.receipt-list small, .undo-box small { color: var(--muted, #756957); font-size: 0.71rem; overflow-wrap: anywhere; }
.text-action {
  color: var(--gold-dark, #745324);
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 0.83rem;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
}
.text-action:not(:disabled):hover { text-decoration: underline; text-underline-offset: 3px; }
.history-link, .back-action, .undo-action { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; }
.history-link { margin-top: 4px; }
.undo-box {
  display: grid;
  justify-items: start;
  gap: 0;
  margin-bottom: 8px;
  padding: 0 11px 9px;
  border: 1px solid #e9dbc0;
  border-radius: 10px;
  background: #fffaf0;
}
.undo-action { min-height: 39px; }
.history-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.range-control { display: flex; flex-wrap: wrap; gap: 4px; }
.range-control button {
  min-height: 40px;
  border: 1px solid var(--line, #e9e1d2);
  background: var(--surface, white);
  color: var(--muted, #756957);
  border-radius: 9px;
  padding: 0 8px;
  font-weight: 650;
  font-size: 0.72rem;
  cursor: pointer;
}
.range-control button[aria-pressed='true'] { background: var(--gold-soft, #f5ead7); color: var(--gold-dark, #745324); border-color: #d4bc91; }
.range-control button:hover { border-color: var(--gold, #bd9b63); }
.history-total { color: var(--muted, #756957); font-size: 0.8rem; margin: 0; }
.history-total strong { color: var(--gold-dark, #745324); margin-left: 4px; }
.profile-card { max-width: 600px; }
.profile-intro { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.profile-avatar { width: 58px; height: 58px; font-size: 1.07rem; }
.profile-form { display: grid; gap: 18px; }
.profile-form label { display: grid; gap: 6px; color: var(--muted, #756957); font-size: 0.82rem; font-weight: 700; }
.profile-form label input { width: 100%; }
.profile-form dl { display: grid; gap: 13px; margin: 0; padding: 13px 0; border-block: 1px solid var(--line, #e9e1d2); }
.profile-form dl div { display: grid; gap: 3px; }
.profile-form dt { color: var(--muted, #756957); font-size: 0.76rem; }
.profile-form dd { font-weight: 650; font-size: 0.9rem; margin: 0; overflow-wrap: anywhere; }
.profile-form .btn { justify-self: start; }
.profile-footer { margin-top: 17px; }
.message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  border: 1px solid;
  border-radius: 11px;
  padding: 10px 12px;
  font-size: 0.82rem;
  line-height: 1.4;
}
.message.error { background: #fff2ee; color: #893b2d; border-color: #ebc9c0; }
.message.success { background: #edf5ed; color: #36583d; border-color: #cedfcf; }
.message svg { flex: 0 0 auto; }
.message .text-action { margin-left: auto; color: inherit; }
.mobile-nav {
  position: fixed;
  inset: auto 0 0;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  background: var(--surface, white);
  border-top: 1px solid var(--line, #e9e1d2);
  padding: 5px 11px calc(5px + env(safe-area-inset-bottom));
}
.mobile-nav button {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 3px;
  min-height: 51px;
  padding: 4px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--muted, #756957);
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
}
.mobile-nav button[aria-current='page'] { color: var(--gold-dark, #745324); background: var(--gold-soft, #f5ead7); }
.payment-dialog {
  background: var(--surface, white);
  color: var(--text, #241f17);
  border: 1px solid var(--line, #e9e1d2);
  max-width: none;
  width: 100%;
  inset: auto 0 0;
  margin: 0;
  border-radius: 20px 20px 0 0;
  padding: 21px 17px calc(7px + env(safe-area-inset-bottom));
  box-shadow: 0 -6px 30px #311e1b1b;
}
.payment-dialog::backdrop { background: #25201769; }
.payment-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 11px; margin-bottom: 16px; }
.payment-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 11px;
  background: var(--cream, #f8f6f0);
  font-size: 0.87rem;
}
.payment-summary strong { color: var(--gold-dark, #745324); white-space: nowrap; }
.payment-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.payment-options .btn { min-height: 57px; padding-inline: 6px; gap: 5px; }
.back-action { margin-top: 5px; }
:is(.barber-shell, .payment-dialog) button:focus-visible { outline: 2px solid var(--gold-dark, #745324); outline-offset: 2px; }
@media (min-width: 600px) {
  .barber-content { padding-inline: 25px; padding-top: 26px; }
  .hero-row { flex-direction: row; justify-content: space-between; align-items: flex-end; }
  .workspace-card { padding: 21px; }
  .metric-grid { grid-template-columns: 0.8fr 1fr 1.62fr; }
  .metric-goal { grid-column: auto; }
  .stat-card { padding: 18px; }
  .service-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .payment-dialog { width: min(420px, calc(100% - 36px)); inset: 0; margin: auto; border-radius: 19px; padding: 24px 23px 15px; }
}
@media (min-width: 960px) {
  .barber-shell { display: grid; grid-template-columns: 236px minmax(0, 1fr); }
  .barber-sidebar {
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: sticky;
    top: 0;
    padding: 21px 16px 16px;
    background: var(--surface, white);
    border-right: 1px solid var(--line, #e9e1d2);
  }
  .desktop-nav { display: grid; gap: 4px; margin: 33px 0 0; }
  .desktop-nav button {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    text-align: left;
    background: transparent;
    color: var(--muted, #756957);
    border: 0;
    border-radius: 9px;
    cursor: pointer;
    font-size: 0.84rem;
    font-weight: 650;
  }
  .desktop-nav button:hover, .desktop-nav button[aria-current='page'] {
    background: var(--gold-soft, #f5ead7);
    color: var(--gold-dark, #745324);
  }
  .sidebar-account {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 13px;
    margin-top: auto;
    border-top: 1px solid var(--line, #e9e1d2);
  }
  .account-name { display: grid; gap: 2px; flex: 1; min-width: 0; }
  .account-name strong { font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .account-name small { color: var(--muted, #756957); font-size: 0.68rem; }
  .barber-topbar { position: sticky; top: 0; z-index: 2; height: 72px; padding-inline: 29px; }
  .desktop-crumb { display: inline; font-size: 0.85rem; font-weight: 700; color: var(--muted, #756957); }
  .top-name { display: inline; max-width: 220px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
  .mobile-brand, .mobile-nav { display: none; }
  .barber-content { padding: 32px 29px 45px; }
  .hero-row { margin-bottom: 25px; }
  .metric-grid { gap: 13px; margin-bottom: 24px; }
  .work-grid { grid-template-columns: minmax(0, 1.65fr) minmax(242px, 1fr); align-items: start; gap: 14px; }
  .service-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1230px) {
  .barber-content { padding-inline: 34px; }
  .work-grid { grid-template-columns: minmax(0, 1.72fr) minmax(270px, 1fr); gap: 15px; }
  .service-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .workspace-card { padding: 23px; }
}
</style>
