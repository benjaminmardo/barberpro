import { demoEnabled } from '../firebase/firebaseConfig'
import type { Caja } from '../types/models'
import { api, dateQuery } from './apiClient'
import { demo } from './demoStore'

export async function getCaja(desde: string, hasta: string) {
  return demoEnabled ? demo.getCaja(desde, hasta) : api<Caja>('/caja' + dateQuery(desde, hasta))
}
