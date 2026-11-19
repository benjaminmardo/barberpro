import { createRouter, createWebHistory } from 'vue-router'
import { restoreSession, useAuth } from '../services/authService'
import type { Rol } from '../types/models'

export const homeFor = (rol: Rol) => rol === 'administrador' ? '/admin' : '/barbero'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/barbero', name: 'barbero', component: () => import('../views/BarberMobileView.vue'), meta: { role: 'barbero' } },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminDesktopView.vue'), meta: { role: 'administrador' } },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

router.beforeEach(async (to) => {
  await restoreSession()
  const { profile } = useAuth()
  if (!profile.value) return to.name === 'login' ? true : { name: 'login' }
  const home = homeFor(profile.value.rol)
  if (to.path !== home) return home
  return true
})

export default router
