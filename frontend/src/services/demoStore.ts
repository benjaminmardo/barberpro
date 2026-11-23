import type { Atencion, AtencionInput, Caja, CreateUsuario, CredencialesAcceso, Meta, MetaInput, Servicio, ServicioInput, UpdateUsuario, Usuario } from '../types/models'
import { firebaseEmailForUsername, generateMemorablePassword, normalizeUsername, usernamePattern } from '../utils/credentials'
import { localDate, shiftDate } from '../utils/format'

const dataKey = 'barber-pro.demo.data.v1'
const sessionKey = 'barber-pro.demo.session'
const adminId = 'demo-admin'
const barberId = 'demo-barber'
const demoAccounts = [
  { id_usuario: adminId, nombre: 'Camila Torres', usuario: 'admin', email: 'admin@barberpro.demo', rol: 'administrador', porcentaje_comision: 50, password: 'DemoLocal777!' },
  { id_usuario: barberId, nombre: 'Matías Rojas', usuario: 'barbero01', email: 'barbero@barberpro.demo', rol: 'barbero', porcentaje_comision: 50, password: 'Local01!' },
  { id_usuario: 'demo-diego', nombre: 'Diego Silva', usuario: 'barbero02', email: 'diego@barberpro.demo', rol: 'barbero', porcentaje_comision: 50, password: 'Local02!' },
  { id_usuario: 'demo-javier', nombre: 'Javier Mella', usuario: 'barbero03', email: 'javier@barberpro.demo', rol: 'barbero', porcentaje_comision: 45, password: 'Local03!' },
  { id_usuario: 'demo-tomas', nombre: 'Tomás Vera', usuario: 'barbero04', email: 'tomas@barberpro.demo', rol: 'barbero', porcentaje_comision: 55, password: 'Local04!' },
  { id_usuario: 'demo-benja', nombre: 'Benjamín Soto', usuario: 'barbero05', email: 'benja@barberpro.demo', rol: 'barbero', porcentaje_comision: 50, password: 'Local05!' },
] satisfies (Usuario & { usuario: string; password: string })[]

const demoPasswordOverrides: Readonly<Record<string, string | undefined>> = import.meta.env.DEV && import.meta.env.MODE === 'demo'
  ? {
      admin: import.meta.env.VITE_DEMO_PASSWORD_ADMIN,
      barbero01: import.meta.env.VITE_DEMO_PASSWORD_BARBERO01,
      barbero02: import.meta.env.VITE_DEMO_PASSWORD_BARBERO02,
      barbero03: import.meta.env.VITE_DEMO_PASSWORD_BARBERO03,
      barbero04: import.meta.env.VITE_DEMO_PASSWORD_BARBERO04,
      barbero05: import.meta.env.VITE_DEMO_PASSWORD_BARBERO05,
    }
  : {}

const initialCatalog: Servicio[] = [
  { id_servicio: 'corte', nombre_servicio: 'Corte Tradicional', precio: 14000 },
  { id_servicio: 'degradado', nombre_servicio: 'Degradado', precio: 18000 },
  { id_servicio: 'barba', nombre_servicio: 'Arreglo de Barba', precio: 9000 },
  { id_servicio: 'tinte', nombre_servicio: 'Platinado / Tinte', precio: 32000 },
  { id_servicio: 'alisado', nombre_servicio: 'Alisado', precio: 25000 },
  { id_servicio: 'rizado', nombre_servicio: 'Rizado', precio: 22000 },
]

interface DemoData {
  usuarios: Usuario[]
  passwords: Record<string, string>
  servicios: Servicio[]
  metas: Meta[]
  atenciones: Atencion[]
}

function initialData(): DemoData {
  const today = localDate()
  const weekday = new Date(today + 'T12:00:00Z').getUTCDay()
  const monday = shiftDate(today, -((weekday + 6) % 7))
  const usuarios = demoAccounts.map(({ password: _password, ...profile }) => profile)
  const atenciones: Atencion[] = []
  const now = Date.now()
  const serviceMix = [1, 0, 1, 2, 0, 1, 4, 0, 2, 3, 1, 5, 0]
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const day = shiftDate(today, -daysAgo)
    const sunday = new Date(day + 'T12:00:00Z').getUTCDay() === 0
    usuarios.slice(1, 5).forEach((user, index) => {
      const count = sunday ? 0 : 4 + ((daysAgo * 13 + index * 7) % 5) - index
      for (let visit = 0; visit < count; visit++) {
        const service = initialCatalog[serviceMix[(visit + daysAgo + index * 2) % serviceMix.length]]
        const normalTime = Date.parse(day + 'T13:00:00Z') + (visit * 55 + index * 7) * 60000
        const date = new Date(Math.min(normalTime, now - (5 + count - visit) * 60000))
        if (localDate(date) !== day) continue
        atenciones.push({
          id_atencion: `demo-${day}-${index}-${visit}`,
          fecha_registro: date.toISOString(),
          id_usuario: user.id_usuario,
          nombre_barbero: user.nombre,
          id_servicio: service.id_servicio,
          nombre_servicio: service.nombre_servicio,
          monto_total: service.precio,
          comision_generada: Math.round(service.precio * user.porcentaje_comision / 100),
          metodo_pago: (visit + daysAgo + index) % 3 === 0 ? 'efectivo' : 'tarjeta',
          estado: (visit + daysAgo * 3 + index) % 43 === 0 ? 'anulada' : 'activa',
        })
      }
    })
  }

  return {
    usuarios,
    passwords: {},
    servicios: initialCatalog,
    metas: [{ id_meta: 'demo-semana', fecha_inicio: monday, fecha_fin: shiftDate(monday, 6), cantidad_objetivo: 35, monto_bono: 35000 }],
    atenciones,
  }
}

function read(): DemoData {
  const raw = localStorage.getItem(dataKey)
  if (raw) {
    try {
      const data = JSON.parse(raw) as DemoData
      let updated = false
      for (const profile of data.usuarios) {
        const stockAccount = demoAccounts.find(({ id_usuario }) => id_usuario === profile.id_usuario)
        if (stockAccount && !profile.usuario) {
          profile.usuario = stockAccount.usuario
          updated = true
        }
      }
      if (updated) save(data)
      return data
    } catch {
      localStorage.removeItem(dataKey)
    }
  }
  const data = initialData()
  save(data)
  return data
}

function save(data: DemoData) {
  localStorage.setItem(dataKey, JSON.stringify(data))
}

function me(data: DemoData): Usuario {
  const user = data.usuarios.find((entry) => entry.id_usuario === sessionStorage.getItem(sessionKey))
  if (!user) throw new Error('Inicia sesión para continuar.')
  return user
}

function admin(data: DemoData) {
  if (me(data).rol !== 'administrador') throw new Error('Esta acción requiere acceso de administrador.')
}

function barber(data: DemoData) {
  const user = me(data)
  if (user.rol !== 'barbero') throw new Error('Esta acción requiere acceso de barbero.')
  return user
}

function id() {
  return crypto.randomUUID()
}

async function digest(password: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('')
}

function rows(data: DemoData, desde: string, hasta: string, userId?: string) {
  if (!desde || !hasta || desde > hasta) throw new Error('Revisa el rango de fechas.')
  return data.atenciones.filter((item) => {
    const date = localDate(item.fecha_registro)
    return date >= desde && date <= hasta && (!userId || item.id_usuario === userId)
  }).sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro))
}

function validateGoal(data: DemoData, input: MetaInput, excludeId?: string) {
  if (input.fecha_inicio > input.fecha_fin) {
    throw new Error('La fecha final debe ser posterior o igual a la inicial.')
  }
  const overlaps = data.metas.some((goal) =>
    goal.id_meta !== excludeId &&
    goal.fecha_inicio <= input.fecha_fin &&
    goal.fecha_fin >= input.fecha_inicio,
  )
  if (overlaps) throw new Error('Ya hay una meta que coincide con esas fechas.')
}

export const demo = {
  getProfile(): Usuario | null {
    const uid = sessionStorage.getItem(sessionKey)
    return uid ? read().usuarios.find((entry) => entry.id_usuario === uid) ?? null : null
  },
  quickLogin(rol: Usuario['rol']): Usuario {
    sessionStorage.setItem(sessionKey, rol === 'administrador' ? adminId : barberId)
    return me(read())
  },
  async login(username: string, password: string): Promise<Usuario> {
    const data = read()
    const identity = normalizeUsername(username)
    const user = data.usuarios.find((entry) => entry.usuario === identity || entry.email === identity)
    if (user) {
      const stockAccount = demoAccounts.find(({ id_usuario }) => id_usuario === user.id_usuario)
      const storedHash = data.passwords[user.id_usuario]
      const matches = storedHash
        ? storedHash === await digest(password)
        : stockAccount && (demoPasswordOverrides[stockAccount.usuario] || stockAccount.password) === password
      if (matches) {
        sessionStorage.setItem(sessionKey, user.id_usuario)
        return user
      }
    }
    throw new Error('El usuario o la contraseña no coinciden.')
  },
  logout() {
    sessionStorage.removeItem(sessionKey)
  },
  updateProfile(nombre: string): Usuario {
    const data = read()
    const user = me(data)
    user.nombre = nombre.trim()
    save(data)
    return user
  },
  listUsuarios() {
    const data = read()
    admin(data)
    return data.usuarios
  },
  async createUsuario(input: CreateUsuario) {
    const password = await digest(input.password)
    const data = read()
    admin(data)
    const usuario = normalizeUsername(input.usuario)
    if (!usernamePattern.test(usuario)) throw new Error('Ingresa un nombre de usuario válido.')
    const email = firebaseEmailForUsername(usuario)
    if (data.usuarios.some((user) => user.usuario === usuario || user.email === email)) {
      throw new Error('Ya existe una cuenta con ese nombre de usuario.')
    }
    const user: Usuario = {
      id_usuario: id(),
      nombre: input.nombre.trim(),
      usuario,
      email,
      rol: input.rol,
      porcentaje_comision: input.porcentaje_comision,
    }
    data.passwords[user.id_usuario] = password
    data.usuarios.push(user)
    save(data)
    return user
  },
  updateUsuario(uid: string, input: UpdateUsuario) {
    const data = read()
    admin(data)
    const user = data.usuarios.find((entry) => entry.id_usuario === uid)
    if (!user) throw new Error('Usuario no encontrado.')
    user.nombre = input.nombre.trim()
    user.porcentaje_comision = input.porcentaje_comision
    save(data)
    return user
  },
  async restablecerClave(uid: string): Promise<CredencialesAcceso> {
    const password = generateMemorablePassword()
    const passwordHash = await digest(password)
    const data = read()
    admin(data)
    const user = data.usuarios.find((entry) => entry.id_usuario === uid)
    if (!user) throw new Error('Usuario no encontrado.')
    if (user.rol !== 'barbero') throw new Error('Solo se pueden restablecer contraseñas de barberos.')
    data.passwords[uid] = passwordHash
    save(data)
    return { usuario: user.usuario ?? user.email, password }
  },
  listServicios() {
    const data = read()
    me(data)
    return data.servicios
  },
  createServicio(input: ServicioInput) {
    const data = read()
    admin(data)
    const service = { ...input, id_servicio: id() }
    data.servicios.push(service)
    save(data)
    return service
  },
  updateServicio(uid: string, input: ServicioInput) {
    const data = read()
    admin(data)
    const service = data.servicios.find((entry) => entry.id_servicio === uid)
    if (!service) throw new Error('Servicio no encontrado.')
    Object.assign(service, input)
    save(data)
    return service
  },
  deleteServicio(uid: string) {
    const data = read()
    admin(data)
    data.servicios = data.servicios.filter((entry) => entry.id_servicio !== uid)
    save(data)
  },
  seedServicios() {
    const data = read()
    admin(data)
    const missing = initialCatalog.filter((service) => !data.servicios.some(({ id_servicio }) => id_servicio === service.id_servicio))
    data.servicios.push(...missing)
    save(data)
  },
  listMetas() {
    const data = read()
    me(data)
    return data.metas
  },
  createMeta(input: MetaInput) {
    const data = read()
    admin(data)
    validateGoal(data, input)
    const meta = { ...input, id_meta: id() }
    data.metas.push(meta)
    save(data)
    return meta
  },
  updateMeta(uid: string, input: MetaInput) {
    const data = read()
    admin(data)
    validateGoal(data, input, uid)
    const meta = data.metas.find((entry) => entry.id_meta === uid)
    if (!meta) throw new Error('Meta no encontrada.')
    Object.assign(meta, input)
    save(data)
    return meta
  },
  deleteMeta(uid: string) {
    const data = read()
    admin(data)
    data.metas = data.metas.filter((entry) => entry.id_meta !== uid)
    save(data)
  },
  listAtenciones(desde: string, hasta: string) {
    const data = read()
    return rows(data, desde, hasta, barber(data).id_usuario)
  },
  createAtencion(input: AtencionInput) {
    const data = read()
    const user = barber(data)
    const service = data.servicios.find((entry) => entry.id_servicio === input.id_servicio)
    if (!service) throw new Error('El servicio ya no está disponible.')
    const row: Atencion = {
      id_atencion: id(),
      fecha_registro: new Date().toISOString(),
      monto_total: service.precio,
      comision_generada: Math.round(service.precio * user.porcentaje_comision / 100),
      metodo_pago: input.metodo_pago,
      estado: 'activa',
      id_usuario: user.id_usuario,
      nombre_barbero: user.nombre,
      id_servicio: service.id_servicio,
      nombre_servicio: service.nombre_servicio,
    }
    data.atenciones.push(row)
    save(data)
    return row
  },
  anularAtencion(uid: string) {
    const data = read()
    const user = barber(data)
    const latest = data.atenciones.filter((entry) => entry.id_usuario === user.id_usuario)
      .sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro))[0]
    if (!latest || latest.id_atencion !== uid || latest.estado !== 'activa' ||
        Date.now() - Date.parse(latest.fecha_registro) >= 180000) {
      throw new Error('Solo puedes anular tu última atención si sigue activa y han pasado menos de 3 minutos.')
    }
    latest.estado = 'anulada'
    save(data)
    return latest
  },
  getCaja(desde: string, hasta: string): Caja {
    const data = read()
    admin(data)
    return { atenciones: rows(data, desde, hasta), barberos: data.usuarios.filter((entry) => entry.rol === 'barbero') }
  },
}
