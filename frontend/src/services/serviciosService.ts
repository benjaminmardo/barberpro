import { demoEnabled } from '../firebase/firebaseConfig'
import type { Servicio, ServicioInput } from '../types/models'
import { api } from './apiClient'
import { demo } from './demoStore'

export async function listServicios() {
  return demoEnabled ? demo.listServicios() : api<Servicio[]>('/servicios')
}

export async function createServicio(data: ServicioInput) {
  return demoEnabled ? demo.createServicio(data) : api<Servicio>('/servicios', 'POST', data)
}

export async function updateServicio(id: string, data: ServicioInput) {
  return demoEnabled ? demo.updateServicio(id, data) : api<Servicio>('/servicios/' + encodeURIComponent(id), 'PATCH', data)
}

export async function deleteServicio(id: string) {
  if (demoEnabled) demo.deleteServicio(id)
  else await api<void>('/servicios/' + encodeURIComponent(id), 'DELETE')
}

export async function seedServicios() {
  if (demoEnabled) demo.seedServicios()
  else await api<void>('/servicios/seed', 'POST')
}
