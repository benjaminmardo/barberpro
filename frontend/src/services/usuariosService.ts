import { demoEnabled } from '../firebase/firebaseConfig'
import type { CreateUsuario, CredencialesAcceso, UpdateUsuario, Usuario } from '../types/models'
import { api } from './apiClient'
import { demo } from './demoStore'

export async function listUsuarios() {
  return demoEnabled ? demo.listUsuarios() : api<Usuario[]>('/usuarios')
}

export async function createUsuario(data: CreateUsuario) {
  return demoEnabled ? demo.createUsuario(data) : api<Usuario>('/usuarios', 'POST', data)
}

export async function updateUsuario(id: string, data: UpdateUsuario) {
  return demoEnabled ? demo.updateUsuario(id, data) : api<Usuario>('/usuarios/' + encodeURIComponent(id), 'PATCH', data)
}

export async function restablecerClave(id: string): Promise<CredencialesAcceso> {
  return demoEnabled
    ? demo.restablecerClave(id)
    : api<CredencialesAcceso>('/usuarios/' + encodeURIComponent(id) + '/restablecer-clave', 'POST')
}
