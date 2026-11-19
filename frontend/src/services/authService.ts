import { FirebaseError } from 'firebase/app'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { readonly, shallowRef } from 'vue'
import { auth, demoEnabled } from '../firebase/firebaseConfig'
import type { Rol, Usuario } from '../types/models'
import { firebaseEmailForUsername, normalizeUsername, usernamePattern } from '../utils/credentials'
import { api, apiConfigured, apiUnavailableMessage, ApiError } from './apiClient'

const profile = shallowRef<Usuario | null>(null)
const sessionError = shallowRef('')
const demo = () => import('./demoStore').then((module) => module.demo)
let initialSession: Promise<void> | undefined

function authMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'El usuario o la contraseña no coinciden.'
      case 'auth/user-disabled':
        return 'Esta cuenta está deshabilitada.'
      case 'auth/configuration-not-found':
        return 'Firebase Authentication aún no está configurado. En la consola de Firebase, abre Authentication y pulsa Comenzar.'
      case 'auth/operation-not-allowed':
      case 'auth/password-login-disabled':
        return 'El acceso con contraseña está deshabilitado. En Firebase → Authentication → Método de acceso, activa Correo electrónico/contraseña.'
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
        return 'La clave de la app web de Firebase no es válida. Revisa VITE_FIREBASE_API_KEY en frontend/.env y reinicia el frontend.'
      case 'auth/unauthorized-domain':
      case 'auth/unauthorized-continue-uri':
        return 'Este dominio no está autorizado. Agrégalo en Firebase → Authentication → Configuración → Dominios autorizados, sin protocolo ni puerto.'
      case 'auth/app-not-authorized':
        return 'Firebase rechazó el acceso de esta aplicación. Revisa que la configuración web corresponda al proyecto y que su clave permita el dominio actual.'
      case 'auth/network-request-failed':
        return 'No pudimos conectar con Firebase. Revisa tu conexión y si el navegador está bloqueando las solicitudes a Google.'
      case 'auth/too-many-requests':
        return 'Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.'
      default:
        return `No se pudo iniciar sesión en Firebase. Código: ${error.code}.`
    }
  }
  if (error instanceof ApiError && error.status === 404) {
    return 'Tu cuenta no tiene un perfil habilitado. Contacta al administrador.'
  }
  return error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
}

export function useAuth() {
  return { profile: readonly(profile), sessionError: readonly(sessionError) }
}

export function restoreSession(): Promise<void> {
  initialSession ??= (async () => {
    try {
      if (demoEnabled) {
        profile.value = (await demo()).getProfile()
      } else if (auth && apiConfigured) {
        await auth.authStateReady()
        if (auth.currentUser) profile.value = await api<Usuario>('/usuarios/me')
      }
    } catch (error) {
      sessionError.value = authMessage(error)
    }
  })()
  return initialSession
}

export async function login(username: string, password: string): Promise<Usuario> {
  sessionError.value = ''
  try {
    const identity = normalizeUsername(username)
    const legacyEmail = identity.includes('@')
    if (!legacyEmail && !usernamePattern.test(identity)) {
      throw new Error('Ingresa un nombre de usuario válido.')
    }
    if (demoEnabled) {
      profile.value = await (await demo()).login(identity, password)
    } else {
      if (!auth) throw new Error('Configura Firebase para iniciar sesión.')
      if (!apiConfigured) throw new Error(apiUnavailableMessage)
      const firebaseEmail = legacyEmail ? identity : firebaseEmailForUsername(identity)
      await signInWithEmailAndPassword(auth, firebaseEmail, password)
      profile.value = await api<Usuario>('/usuarios/me')
    }
    return profile.value
  } catch (error) {
    profile.value = null
    if (auth?.currentUser) await signOut(auth).catch(() => undefined)
    throw new Error(authMessage(error))
  }
}

export async function loginDemo(rol: Rol): Promise<Usuario> {
  if (!demoEnabled) throw new Error('La demostración solo está disponible en desarrollo.')
  sessionError.value = ''
  profile.value = (await demo()).quickLogin(rol)
  return profile.value
}

export async function logout(): Promise<void> {
  if (demoEnabled) (await demo()).logout()
  if (auth) await signOut(auth)
  profile.value = null
  sessionError.value = ''
}

export async function updateProfile(nombre: string): Promise<Usuario> {
  const user = demoEnabled
    ? (await demo()).updateProfile(nombre)
    : await api<Usuario>('/usuarios/me', 'PATCH', { nombre })
  profile.value = user
  return user
}
