import { demoEnabled } from '../firebase/firebaseConfig'
import type { Atencion, AtencionInput } from '../types/models'
import { api, dateQuery } from './apiClient'
import { demo } from './demoStore'

export async function listAtenciones(desde: string, hasta: string) {
  return demoEnabled ? demo.listAtenciones(desde, hasta) : api<Atencion[]>('/atenciones' + dateQuery(desde, hasta))
}

export async function createAtencion(data: AtencionInput) {
  return demoEnabled ? demo.createAtencion(data) : api<Atencion>('/atenciones', 'POST', data)
}

export async function anularAtencion(id: string) {
  return demoEnabled ? demo.anularAtencion(id) : api<Atencion>('/atenciones/' + encodeURIComponent(id) + '/anular', 'PATCH')
}
