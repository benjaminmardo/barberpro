import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const env = import.meta.env
const emulator = env.VITE_USE_FIREBASE_EMULATORS === 'true'
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || (emulator ? 'demo-barber-pro' : ''),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || (emulator ? 'demo-barber-pro' : ''),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId)
export const demoEnabled = import.meta.env.DEV && (
  env.VITE_DEMO_MODE === 'true' || (!firebaseConfigured && env.VITE_DEMO_MODE !== 'false')
)
const app = firebaseConfigured && !demoEnabled ? initializeApp(config) : null
export const auth = app ? getAuth(app) : null
export const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}) : null

if (emulator && auth && db) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
