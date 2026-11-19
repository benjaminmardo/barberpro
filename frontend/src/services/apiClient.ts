import { auth } from '../firebase/firebaseConfig'

const configuredUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

function productionApiUrl(value: string): string | null {
  if (value === '/api') return value

  try {
    const url = new URL(value)
    const local = url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
      url.hostname.startsWith('127.') || url.hostname === '[::1]' || url.hostname === '0.0.0.0'
    if (url.protocol === 'https:' && !local && !url.username && !url.password && !url.search && !url.hash) {
      return value
    }
  } catch {
    return null
  }
  return null
}

const baseUrl = import.meta.env.DEV
  ? configuredUrl || 'http://localhost:3000/api'
  : productionApiUrl(configuredUrl)

export const apiConfigured = baseUrl !== null
export const apiUnavailableMessage = 'El acceso se habilitará cuando se conecte el servidor de Barber Pro.'

class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export { ApiError }

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!baseUrl) throw new ApiError(0, apiUnavailableMessage)
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new ApiError(401, 'Inicia sesión para continuar.')
  const headers = new Headers({ Authorization: 'Bearer ' + token, Accept: 'application/json' })
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }

  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message = (payload as { message?: string | string[] } | undefined)?.message
    throw new ApiError(response.status, (Array.isArray(message) ? message.join('. ') : message) || 'No se pudo completar la operación.')
  }
  if (response.status !== 204 && payload === undefined) {
    throw new ApiError(0, 'La dirección configurada no respondió como el servidor de Barber Pro.')
  }
  return payload as T
}

export function dateQuery(desde: string, hasta: string) {
  return '?' + new URLSearchParams({ desde, hasta })
}
