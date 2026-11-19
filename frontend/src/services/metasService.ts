import { demoEnabled } from '../firebase/firebaseConfig'
import type { Meta, MetaInput } from '../types/models'
import { api } from './apiClient'
import { demo } from './demoStore'

export async function listMetas() {
  return demoEnabled ? demo.listMetas() : api<Meta[]>('/metas')
}

export async function createMeta(data: MetaInput) {
  return demoEnabled ? demo.createMeta(data) : api<Meta>('/metas', 'POST', data)
}

export async function updateMeta(id: string, data: MetaInput) {
  return demoEnabled ? demo.updateMeta(id, data) : api<Meta>('/metas/' + encodeURIComponent(id), 'PATCH', data)
}

export async function deleteMeta(id: string) {
  if (demoEnabled) demo.deleteMeta(id)
  else await api<void>('/metas/' + encodeURIComponent(id), 'DELETE')
}
