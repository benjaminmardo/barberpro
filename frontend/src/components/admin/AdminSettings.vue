<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { CirclePlus, Copy, Download, Eye, EyeOff, KeyRound, Pencil, Trash2 } from 'lucide-vue-next'
import { updateProfile, useAuth } from '../../services/authService'
import { createMeta, deleteMeta, listMetas, updateMeta } from '../../services/metasService'
import { createServicio, deleteServicio, listServicios, seedServicios, updateServicio } from '../../services/serviciosService'
import { createUsuario, listUsuarios, restablecerClave, updateUsuario } from '../../services/usuariosService'
import type { CreateUsuario, CredencialesAcceso, Meta, MetaInput, Servicio, ServicioInput, Usuario } from '../../types/models'
import { generateMemorablePassword, normalizeUsername, usernamePattern } from '../../utils/credentials'
import { clp, initials, localDate, shiftDate, shortDate } from '../../utils/format'

const props = defineProps<{ section: 'servicios' | 'metas' | 'equipo' | 'perfil' }>()
const { profile } = useAuth()
const today = localDate()
const servicios = ref<Servicio[]>([])
const metas = ref<Meta[]>([])
const usuarios = ref<Usuario[]>([])
const busy = ref(false)
const loading = ref(false)
const loadError = ref('')
const alert = ref('')
const success = ref('')
const editId = ref('')
const deleteId = ref('')
const firstField = ref<HTMLInputElement | null>(null)

const serviceDraft = ref<ServicioInput>({ nombre_servicio: '', precio: 0 })
const defaultGoal = (): MetaInput => ({ fecha_inicio: today, fecha_fin: shiftDate(today, 6), cantidad_objetivo: 150, monto_bono: 0 })
const goalDraft = ref(defaultGoal())
const defaultUser = (): CreateUsuario => ({ nombre: '', usuario: '', password: '', rol: 'barbero', porcentaje_comision: 50 })
const userDraft = ref(defaultUser())
const showInitialPassword = ref(false)
const accessReceipt = ref<CredencialesAcceso | null>(null)
const accessHeading = ref<HTMLElement | null>(null)
const accessLabel = ref('Contraseña inicial')
const copyStatus = ref('')
const resetDialog = ref<HTMLDialogElement | null>(null)
const resetUser = ref<Usuario | null>(null)
const resetError = ref('')
const profileName = ref(profile.value?.nombre ?? '')

async function load() {
  if (props.section === 'perfil') return
  loading.value = true
  loadError.value = ''
  try {
    if (props.section === 'servicios') servicios.value = await listServicios()
    if (props.section === 'metas') metas.value = await listMetas()
    if (props.section === 'equipo') usuarios.value = await listUsuarios()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'No se pudo cargar la lista.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function resetDraft() {
  editId.value = ''
  deleteId.value = ''
  serviceDraft.value = { nombre_servicio: '', precio: 0 }
  goalDraft.value = defaultGoal()
  userDraft.value = defaultUser()
  showInitialPassword.value = false
}

async function persist(operation: () => Promise<unknown>, message: string, reset = true) {
  if (busy.value) return
  busy.value = true
  alert.value = ''
  success.value = ''
  try {
    await operation()
    if (reset) resetDraft()
    success.value = message
    await load()
  } catch (error) {
    alert.value = error instanceof Error ? error.message : 'No se pudo guardar el cambio.'
  } finally {
    busy.value = false
  }
}

async function focusForm(id: string) {
  editId.value = id
  deleteId.value = ''
  alert.value = ''
  success.value = ''
  await nextTick()
  firstField.value?.focus()
}

function editService(service: Servicio) {
  serviceDraft.value = { nombre_servicio: service.nombre_servicio, precio: service.precio }
  void focusForm(service.id_servicio)
}

function saveService() {
  const data = { ...serviceDraft.value, nombre_servicio: serviceDraft.value.nombre_servicio.trim() }
  const id = editId.value
  return persist(() => id ? updateServicio(id, data) : createServicio(data), id ? 'Servicio actualizado.' : 'Servicio agregado al catálogo.')
}

function editGoal(goal: Meta) {
  const { fecha_inicio, fecha_fin, cantidad_objetivo, monto_bono } = goal
  goalDraft.value = { fecha_inicio, fecha_fin, cantidad_objetivo, monto_bono }
  void focusForm(goal.id_meta)
}

function saveGoal() {
  const data = { ...goalDraft.value }
  const id = editId.value
  return persist(() => id ? updateMeta(id, data) : createMeta(data), id ? 'Meta actualizada.' : 'Meta creada.')
}

function editUser(user: Usuario) {
  const { nombre, usuario, email, rol, porcentaje_comision } = user
  hideAccess()
  userDraft.value = { nombre, usuario: usuario ?? email, rol, porcentaje_comision, password: '' }
  void focusForm(user.id_usuario)
}

function generatePassword() {
  userDraft.value.password = generateMemorablePassword()
  showInitialPassword.value = true
}

function hideAccess() {
  accessReceipt.value = null
  copyStatus.value = ''
}

async function showAccess(access: CredencialesAcceso, label: string) {
  copyStatus.value = ''
  accessLabel.value = label
  accessReceipt.value = access
  await nextTick()
  accessHeading.value?.focus()
}

async function copyAccess() {
  const access = accessReceipt.value
  if (!access) return
  try {
    await navigator.clipboard.writeText('Usuario: ' + access.usuario + '\nContraseña: ' + access.password)
    if (accessReceipt.value === access) copyStatus.value = 'Datos de acceso copiados.'
  } catch {
    if (accessReceipt.value === access) copyStatus.value = 'Selecciona los datos de acceso para copiarlos.'
  }
}

async function requestReset(user: Usuario) {
  if (busy.value) return
  resetUser.value = user
  resetError.value = ''
  await nextTick()
  resetDialog.value?.showModal()
}

function closeReset() {
  resetUser.value = null
  resetError.value = ''
}

function allowResetCancel(event: Event) {
  if (busy.value) event.preventDefault()
}

async function confirmReset() {
  const user = resetUser.value
  if (busy.value || !user) return
  busy.value = true
  resetError.value = ''
  alert.value = ''
  success.value = ''
  try {
    const access = await restablecerClave(user.id_usuario)
    resetDialog.value?.close()
    success.value = 'Contraseña restablecida.'
    await showAccess(access, 'Nueva contraseña')
  } catch (error) {
    resetError.value = error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.'
  } finally {
    busy.value = false
  }
}

function saveUser() {
  if (busy.value) return
  hideAccess()
  const data = { ...userDraft.value, nombre: userDraft.value.nombre.trim(), usuario: normalizeUsername(userDraft.value.usuario) }
  const id = editId.value
  if (id) {
    const changes = { nombre: data.nombre, porcentaje_comision: data.porcentaje_comision }
    return persist(() => updateUsuario(id, changes), 'Perfil actualizado.')
  }
  return persist(async () => {
    const user = await createUsuario(data)
    await showAccess({ usuario: user.usuario ?? data.usuario, password: data.password }, 'Contraseña inicial')
  }, 'Cuenta creada.')
}

function deleteItem(id: string, operation: (id: string) => Promise<unknown>, message: string) {
  const clearForm = editId.value === id
  deleteId.value = ''
  return persist(() => operation(id), message, clearForm)
}

function saveProfile() {
  return persist(() => updateProfile(profileName.value.trim()), 'Perfil actualizado.', false)
}
</script>

<template>
  <div class="settings">
    <p v-if="alert" class="notice notice-error" role="alert">{{ alert }}</p>
    <p v-if="success" class="settings-success" role="status">{{ success }}</p>

    <div v-if="section === 'servicios'" class="settings-grid">
      <section class="settings-card">
        <h2>{{ editId ? 'Editar servicio' : 'Nuevo servicio' }}</h2>
        <form class="settings-form" @submit.prevent="saveService">
          <label>Nombre <input ref="firstField" v-model="serviceDraft.nombre_servicio" class="field" type="text" required minlength="2" maxlength="100" placeholder="Ej. Corte tradicional" /></label>
          <label>Precio (CLP) <input v-model.number="serviceDraft.precio" class="field" type="number" required min="1" max="100000000" step="1" inputmode="numeric" /></label>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="busy"><CirclePlus v-if="!editId" :size="16" aria-hidden="true" />{{ editId ? 'Guardar cambios' : 'Agregar servicio' }}</button>
            <button v-if="editId" class="btn btn-secondary" type="button" :disabled="busy" @click="resetDraft">Cancelar</button>
          </div>
        </form>
      </section>
      <section class="settings-card">
        <header class="list-heading">
          <h2>Catálogo</h2>
          <button class="btn btn-secondary" type="button" :disabled="busy || loading" @click="persist(seedServicios, 'Se cargó el catálogo inicial.', false)"><Download :size="16" aria-hidden="true" /> Cargar catálogo inicial</button>
        </header>
        <p v-if="loading" class="list-state" role="status">Cargando servicios…</p>
        <p v-else-if="!loadError && !servicios.length" class="list-state">Agrega un servicio o carga el catálogo inicial del estudio.</p>
        <ul v-else-if="!loadError" class="item-list">
          <li v-for="service in servicios" :key="service.id_servicio" class="item-row">
            <div class="item-copy"><strong>{{ service.nombre_servicio }}</strong><span>{{ clp(service.precio) }}</span></div>
            <div v-if="deleteId === service.id_servicio" class="confirm-actions">
              <span>¿Quitar del catálogo?</span>
              <button type="button" class="btn btn-secondary" :disabled="busy" @click="deleteId = ''">Cancelar</button>
              <button type="button" class="btn btn-danger" :disabled="busy" @click="deleteItem(service.id_servicio, deleteServicio, 'Servicio eliminado del catálogo.')">Eliminar</button>
            </div>
            <div v-else class="list-actions">
              <button type="button" class="icon-button" :disabled="busy" :aria-label="`Editar ${service.nombre_servicio}`" title="Editar servicio" @click="editService(service)"><Pencil :size="16" aria-hidden="true" /></button>
              <button type="button" class="icon-button danger" :disabled="busy" :aria-label="`Eliminar ${service.nombre_servicio}`" title="Eliminar servicio" @click="deleteId = service.id_servicio"><Trash2 :size="16" aria-hidden="true" /></button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div v-else-if="section === 'metas'" class="settings-grid">
      <section class="settings-card">
        <h2>{{ editId ? 'Editar meta' : 'Nueva meta' }}</h2>
        <form class="settings-form" @submit.prevent="saveGoal">
          <div class="field-row">
            <label>Desde <input ref="firstField" v-model="goalDraft.fecha_inicio" class="field" type="date" required /></label>
            <label>Hasta <input v-model="goalDraft.fecha_fin" class="field" type="date" :min="goalDraft.fecha_inicio" required /></label>
          </div>
          <label>Atenciones por barbero <input v-model.number="goalDraft.cantidad_objetivo" class="field" type="number" min="1" max="100000" step="1" required inputmode="numeric" /></label>
          <label>Bono individual (CLP) <input v-model.number="goalDraft.monto_bono" class="field" type="number" min="0" max="100000000" step="1" required inputmode="numeric" /></label>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="busy"><CirclePlus v-if="!editId" :size="16" aria-hidden="true" />{{ editId ? 'Guardar cambios' : 'Crear meta' }}</button>
            <button v-if="editId" class="btn btn-secondary" type="button" :disabled="busy" @click="resetDraft">Cancelar</button>
          </div>
        </form>
      </section>
      <section class="settings-card">
        <header class="list-heading"><h2>Períodos y objetivos</h2></header>
        <p v-if="loading" class="list-state" role="status">Cargando metas…</p>
        <p v-else-if="!loadError && !metas.length" class="list-state">Aún no se han configurado metas.</p>
        <ul v-else-if="!loadError" class="item-list">
          <li v-for="goal in metas" :key="goal.id_meta" class="item-row">
            <div class="item-copy">
              <strong>{{ shortDate(goal.fecha_inicio) }} al {{ shortDate(goal.fecha_fin) }}<span v-if="goal.fecha_inicio <= today && today <= goal.fecha_fin" class="role-tag">Vigente</span></strong>
              <span>{{ goal.cantidad_objetivo }} atenciones · Bono {{ clp(goal.monto_bono) }}</span>
            </div>
            <div v-if="deleteId === goal.id_meta" class="confirm-actions">
              <span>¿Eliminar esta meta?</span>
              <button type="button" class="btn btn-secondary" :disabled="busy" @click="deleteId = ''">Cancelar</button>
              <button type="button" class="btn btn-danger" :disabled="busy" @click="deleteItem(goal.id_meta, deleteMeta, 'Meta eliminada.')">Eliminar</button>
            </div>
            <div v-else class="list-actions">
              <button type="button" class="icon-button" :disabled="busy" :aria-label="`Editar meta del ${shortDate(goal.fecha_inicio)}`" title="Editar meta" @click="editGoal(goal)"><Pencil :size="16" aria-hidden="true" /></button>
              <button type="button" class="icon-button danger" :disabled="busy" :aria-label="`Eliminar meta del ${shortDate(goal.fecha_inicio)}`" title="Eliminar meta" @click="deleteId = goal.id_meta"><Trash2 :size="16" aria-hidden="true" /></button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div v-else-if="section === 'equipo'" class="settings-grid">
      <section class="settings-card">
        <h2>{{ editId ? 'Editar perfil' : 'Nueva cuenta' }}</h2>
        <section v-if="accessReceipt" class="access-receipt" aria-labelledby="access-receipt-title">
          <h3 id="access-receipt-title" ref="accessHeading" tabindex="-1">Datos de acceso</h3>
          <p>Copia estos datos y entrégalos solo a la persona titular de la cuenta.</p>
          <dl>
            <div><dt>Usuario</dt><dd><code>{{ accessReceipt.usuario }}</code></dd></div>
            <div><dt>{{ accessLabel }}</dt><dd><code>{{ accessReceipt.password }}</code></dd></div>
          </dl>
          <div class="receipt-actions">
            <button class="btn btn-secondary" type="button" @click="copyAccess"><Copy :size="14" aria-hidden="true" /> Copiar datos</button>
            <button class="btn btn-secondary" type="button" @click="hideAccess">Ocultar datos</button>
          </div>
          <p v-if="copyStatus" role="status">{{ copyStatus }}</p>
        </section>
        <form class="settings-form" @submit.prevent="saveUser">
          <label>Nombre <input ref="firstField" v-model="userDraft.nombre" class="field" type="text" minlength="2" maxlength="100" required autocomplete="off" /></label>
          <label v-if="editId">
            {{ userDraft.usuario.includes('@') ? 'Correo electrónico' : 'Nombre de usuario' }}
            <input :value="userDraft.usuario" class="field" type="text" readonly />
          </label>
          <label v-else>
            Nombre de usuario
            <input v-model.trim="userDraft.usuario" class="field" type="text" :pattern="usernamePattern.source" minlength="3" maxlength="32" required autocomplete="off" autocapitalize="none" :spellcheck="false" placeholder="Ej. barbero01" />
            <small>De 3 a 32 caracteres. Usa letras sin tilde, números, puntos, guiones o guiones bajos.</small>
          </label>
          <div v-if="!editId" class="initial-password">
            <label for="initial-password">Contraseña inicial</label>
            <div class="password-row">
              <input id="initial-password" v-model="userDraft.password" class="field" :type="showInitialPassword ? 'text' : 'password'" minlength="8" maxlength="128" required autocomplete="new-password" />
              <button class="icon-button" type="button" :aria-label="showInitialPassword ? 'Ocultar contraseña inicial' : 'Mostrar contraseña inicial'" :aria-pressed="showInitialPassword" @click="showInitialPassword = !showInitialPassword">
                <EyeOff v-if="showInitialPassword" :size="16" aria-hidden="true" />
                <Eye v-else :size="16" aria-hidden="true" />
              </button>
            </div>
            <button class="btn btn-secondary generate-password" type="button" :disabled="busy" @click="generatePassword"><KeyRound :size="15" aria-hidden="true" /> Generar contraseña</button>
          </div>
          <div class="field-row">
            <label>Perfil
              <select v-model="userDraft.rol" class="field" :disabled="!!editId"><option value="barbero">Barbero (empleado)</option><option value="administrador">Administrador</option></select>
            </label>
            <label v-if="userDraft.rol === 'barbero'">Comisión (%) <input v-model.number="userDraft.porcentaje_comision" class="field" type="number" min="0" max="100" step="1" required inputmode="numeric" /></label>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" :disabled="busy"><CirclePlus v-if="!editId" :size="16" aria-hidden="true" />{{ editId ? 'Guardar cambios' : 'Crear cuenta' }}</button>
            <button v-if="editId" class="btn btn-secondary" type="button" :disabled="busy" @click="resetDraft">Cancelar</button>
          </div>
        </form>
      </section>
      <section class="settings-card">
        <header class="list-heading"><h2>Personas del estudio</h2></header>
        <p v-if="loading" class="list-state" role="status">Cargando equipo…</p>
        <p v-else-if="!loadError && !usuarios.length" class="list-state">Aún no hay cuentas registradas.</p>
        <ul v-else-if="!loadError" class="item-list">
          <li v-for="user in usuarios" :key="user.id_usuario" class="item-row member-row">
            <span class="avatar" aria-hidden="true">{{ initials(user.nombre) }}</span>
            <div class="item-copy user-copy"><strong>{{ user.nombre }}</strong><span>{{ user.usuario ?? user.email }}</span></div>
            <span class="role-tag">{{ user.rol === 'administrador' ? 'Administrador' : `Barbero · ${user.porcentaje_comision}%` }}</span>
            <div v-if="profile?.id_usuario !== user.id_usuario" class="list-actions">
              <button type="button" class="icon-button" :disabled="busy" :aria-label="`Editar perfil de ${user.nombre}`" title="Editar perfil" @click="editUser(user)"><Pencil :size="16" aria-hidden="true" /></button>
              <button v-if="user.rol === 'barbero'" type="button" class="btn btn-secondary reset-trigger" :disabled="busy" :aria-label="`Restablecer contraseña de ${user.nombre}`" @click="requestReset(user)"><KeyRound :size="15" aria-hidden="true" /> Restablecer</button>
            </div>
          </li>
        </ul>
      </section>
      <dialog ref="resetDialog" class="reset-dialog" aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-description" @cancel="allowResetCancel" @close="closeReset">
        <h2 id="reset-dialog-title">Restablecer contraseña</h2>
        <p id="reset-dialog-description" v-if="resetUser">
          Genera una nueva contraseña para <strong>{{ resetUser.nombre }} ({{ resetUser.usuario ?? resetUser.email }})</strong>.
          La contraseña anterior dejará de funcionar.
        </p>
        <p v-if="resetError" class="notice notice-error" role="alert">{{ resetError }}</p>
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" autofocus :disabled="busy" @click="resetDialog?.close()">Cancelar</button>
          <button class="btn btn-primary" type="button" :disabled="busy" @click="confirmReset">{{ busy ? 'Restableciendo…' : 'Restablecer contraseña' }}</button>
        </div>
      </dialog>
    </div>

    <section v-else-if="profile" class="settings-card profile-card">
      <div class="profile-heading"><span class="avatar profile-avatar" aria-hidden="true">{{ initials(profile.nombre) }}</span><div><h2>{{ profile.nombre }}</h2><span class="role-tag">Administrador</span></div></div>
      <form class="settings-form" @submit.prevent="saveProfile">
        <label>Nombre <input v-model="profileName" class="field" type="text" minlength="2" maxlength="100" required autocomplete="name" /></label>
        <label>
          {{ profile.usuario ? 'Nombre de usuario' : 'Correo electrónico' }}
          <input :value="profile.usuario ?? profile.email" class="field" type="text" readonly />
        </label>
        <div class="form-actions"><button class="btn btn-primary" type="submit" :disabled="busy || profileName.trim() === profile.nombre">Guardar perfil</button></div>
      </form>
    </section>

    <div v-if="loadError" class="notice notice-error load-error" role="alert">
      <span>{{ loadError }}</span><button type="button" class="btn btn-secondary" :disabled="busy" @click="load">Reintentar</button>
    </div>
  </div>
</template>

<style scoped>
.settings{display:grid;gap:15px;min-width:0}
.settings-grid{display:grid;grid-template-columns:minmax(250px,.72fr) minmax(0,1.28fr);gap:16px;align-items:start}
.settings-card{min-width:0;background:white;border:1px solid var(--admin-line);border-radius:16px;padding:21px;box-shadow:0 2px 5px #5c452006}
.settings-card h2{font-size:17px;line-height:1.25;margin:0;letter-spacing:-.02em}
.settings-form{display:grid;gap:13px;margin-top:18px}
.settings-form label{display:grid;gap:5px;font-size:13px;font-weight:650;min-width:0}
.settings-form label small{color:var(--admin-muted);font-size:11px;font-weight:500}
.settings-form .field{display:block;width:100%;min-width:0;font-weight:500;border:1px solid var(--admin-line);border-radius:8px;min-height:42px;padding:8px 10px;background:white;color:var(--admin-ink)}
.settings-form .field[readonly],.settings-form .field[disabled]{background:#f9f6ef;color:var(--admin-muted)}
.initial-password{display:grid;gap:5px;min-width:0}
.password-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center}
.password-row .icon-button{height:42px}
.generate-password,.access-receipt .btn{justify-self:start;min-height:34px;padding:5px 9px;font-size:12px}
.access-receipt{display:grid;gap:8px;margin-top:14px;padding:11px;border:1px solid var(--admin-line);border-radius:8px;background:#faf5e9;color:var(--admin-ink);font-size:13px}
.access-receipt h3{font-weight:750}
.access-receipt dl{display:grid;gap:5px;margin:0}
.access-receipt dt{font-weight:650}
.access-receipt code{overflow-wrap:anywhere;user-select:all}
.receipt-actions{display:flex;flex-wrap:wrap;gap:8px}
.reset-dialog{width:min(420px,calc(100% - 32px));margin:auto;padding:22px;border:1px solid var(--admin-line);border-radius:12px;background:white;color:var(--admin-ink);box-shadow:0 12px 30px #2d241e30}
.reset-dialog::backdrop{background:#2d241e60}
.reset-dialog h2{font-size:18px;font-weight:750}
.reset-dialog p{margin-block:12px;font-size:14px;overflow-wrap:anywhere}
.reset-dialog .form-actions{justify-content:flex-end}
.field-row{display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr))}
.field-row label:only-child{grid-column:span 2}
.form-actions,.list-actions,.confirm-actions,.list-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.form-actions{margin-top:5px}
.form-actions .btn,.list-heading .btn,.confirm-actions .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px}
.list-heading{justify-content:space-between}
.list-heading .btn,.confirm-actions .btn{min-height:34px;padding:5px 9px;font-size:12px}
.btn-danger{border:1px solid #c7988a;background:#f9e9e4;color:#842d1a}
.btn-danger:hover{background:#f5dcd3}
.icon-button{display:grid;place-items:center;width:36px;height:36px;border:1px solid var(--admin-line);border-radius:8px;cursor:pointer;background:white;color:#795619}
.icon-button:hover{background:#faf2e0}
.icon-button:disabled{opacity:.5;cursor:wait}
.icon-button.danger{color:#8a3b28}
.icon-button.danger:hover{background:#fbefeb}
.item-list{margin:13px 0 0;padding:0;list-style:none}
.item-row{display:flex;align-items:center;gap:8px;padding:11px 0;border-top:1px solid var(--admin-line)}
.member-row{flex-wrap:wrap}
.member-row .user-copy{flex-basis:110px}
.reset-trigger{min-height:36px;padding:5px 8px;font-size:12px;color:#795619}
.item-copy{display:flex;gap:4px;flex-direction:column;flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.item-copy strong{font-size:13px}
.item-copy strong .role-tag{margin-left:6px}
.item-copy>span{color:var(--admin-muted);font-size:12px}
.list-actions{flex:0 0 auto}
.confirm-actions{justify-content:flex-end}
.confirm-actions>span{color:#842d1a;font-size:12px}
.role-tag{display:inline-block;padding:3px 7px;border-radius:100px;white-space:nowrap;font-size:10px;font-weight:700;background:#f7edda;color:#785520}
.avatar{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border-radius:50%;background:#f3e8d0;color:#785520;font-weight:750;font-size:11px}
.profile-card{max-width:500px}
.profile-heading{display:flex;gap:12px;align-items:center}
.profile-heading .role-tag{margin-top:5px}
.profile-avatar{flex-basis:45px;width:45px;height:45px;font-size:15px}
.list-state{font-size:13px;color:var(--admin-muted);margin:17px 0 0}
.settings-success{margin:0;border:1px solid #caddc5;background:#eef6eb;color:#325232;padding:10px 13px;border-radius:10px;font-size:13px}
.load-error{display:flex;align-items:center;justify-content:space-between;gap:10px}
@media(max-width:720px){.settings-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:460px){.settings-card{padding:15px}.item-row{flex-wrap:wrap}.confirm-actions{justify-content:flex-start;flex:1 0 100%}}
</style>
