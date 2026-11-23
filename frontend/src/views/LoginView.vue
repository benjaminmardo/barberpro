<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, Eye, EyeOff, LockKeyhole, MapPin, Scissors, ShieldCheck, UserRound } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BrandLockup from '../components/BrandLockup.vue'
import { demoEnabled, firebaseConfigured } from '../firebase/firebaseConfig'
import { apiConfigured, apiUnavailableMessage } from '../services/apiClient'
import { login, loginDemo, useAuth } from '../services/authService'
import { homeFor } from '../router'
import type { Rol } from '../types/models'

const router = useRouter()
const { sessionError } = useAuth()
const username = ref('')
const password = ref('')
const reveal = ref(false)
const busy = ref<'login' | Rol | null>(null)
const error = ref('')
const canSignIn = demoEnabled || (firebaseConfigured && apiConfigured)

async function enter(role?: Rol) {
  if (busy.value) return
  error.value = ''
  busy.value = role ?? 'login'
  try {
    const user = role ? await loginDemo(role) : await login(username.value, password.value)
    await router.replace(homeFor(user.rol))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.'
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <main class="login-page">
    <aside class="studio-photo" aria-label="Interior ilustrativo de una barbería">
      <BrandLockup class="photo-brand" />
      <div class="photo-caption">
        <div class="photo-location"><MapPin :size="15" aria-hidden="true" /> Chillán, Chile</div>
        <p>GOAT STUDIO <em>777</em></p>
      </div>
    </aside>

    <section class="login-side" aria-labelledby="login-title">
      <div class="login-card">
        <div class="login-intro">
          <span class="eyebrow">ACCESO PARA BARBEROS Y ADMINISTRADORES</span>
          <h1 id="login-title">Iniciar sesión</h1>
          <p>Ingresa con tu usuario y contraseña de GOAT STUDIO 777.</p>
        </div>

        <form class="login-form" @submit.prevent="enter()">
          <label class="field">
            Nombre de usuario
            <span class="input-wrap">
              <UserRound :size="18" aria-hidden="true" />
              <input v-model.trim="username" name="username" type="text" autocomplete="username" autocapitalize="none" :spellcheck="false" maxlength="254" placeholder="Ej. barbero01" required />
            </span>
          </label>
          <label class="field">
            Contraseña
            <span class="input-wrap">
              <LockKeyhole :size="18" aria-hidden="true" />
              <input v-model="password" name="password" :type="reveal ? 'text' : 'password'" placeholder="Tu contraseña" autocomplete="current-password" :aria-describedby="canSignIn ? 'password-mode' : undefined" required />
              <button type="button" class="reveal-button" :aria-label="reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'" :aria-pressed="reveal" @click="reveal = !reveal">
                <EyeOff v-if="reveal" :size="18" aria-hidden="true" />
                <Eye v-else :size="18" aria-hidden="true" />
              </button>
            </span>
          </label>
          <p v-if="canSignIn" id="password-mode" class="password-mode">
            {{ demoEnabled ? 'Demostración local. Usa una contraseña de la demo.' : 'Acceso con Firebase. Usa la contraseña asignada a tu cuenta.' }}
          </p>
          <p v-if="error || sessionError" class="notice notice-error" role="alert">{{ error || sessionError }}</p>
          <p v-if="!demoEnabled && !firebaseConfigured" class="notice" role="status">Para habilitar el acceso, configura Firebase en el frontend.</p>
          <p v-else-if="!canSignIn" class="notice" role="status">{{ apiUnavailableMessage }}</p>
          <button class="btn btn-primary submit-button" type="submit" :disabled="!!busy || !canSignIn">
            {{ busy === 'login' ? 'Ingresando…' : 'Ingresar' }}
            <ArrowRight :size="19" aria-hidden="true" />
          </button>
        </form>

        <details class="password-help">
          <summary>¿Olvidaste tu contraseña?</summary>
          <div class="password-help-content">
            <p><strong>Barberos.</strong> Pide una nueva contraseña al administrador de tu barbería e indícale tu nombre de usuario.</p>
            <p><strong>Administradores.</strong> Solicita el restablecimiento a la persona que administra el proyecto de Barber Pro.</p>
          </div>
        </details>

        <section v-if="demoEnabled" class="demo-section" aria-labelledby="demo-label">
          <div class="demo-label"><span id="demo-label">Probar con datos de ejemplo</span></div>
          <div class="demo-buttons">
            <button type="button" :disabled="!!busy" class="btn btn-secondary" @click="enter('administrador')">
              <ShieldCheck :size="17" aria-hidden="true" /> {{ busy === 'administrador' ? 'Ingresando…' : 'Administrador' }}
            </button>
            <button type="button" :disabled="!!busy" class="btn btn-secondary" @click="enter('barbero')">
              <Scissors :size="17" aria-hidden="true" /> {{ busy === 'barbero' ? 'Ingresando…' : 'Barbero' }}
            </button>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page { display: grid; min-height: 100svh; grid-template-columns: 48% 52%; background: var(--surface); }
.studio-photo {
  position: relative; display: flex; flex-direction: column; justify-content: space-between; min-height: 100%;
  padding: clamp(2rem, 5vw, 5rem); color: #fffaf0; isolation: isolate; background-color: #30251a;
  background-image: linear-gradient(180deg, #20160bb8 0%, #20160b00 28%, #20160b00 58%, #1b120cc9 100%), url('/studio-login.png');
  background-position: center; background-size: cover;
}
.photo-brand { --brand-muted: #e1c699; --brand-mark-size: 61px; width: fit-content; }
.photo-caption { padding: 1.5rem 0 .15rem; }
.photo-location { display: inline-flex; gap: .42rem; align-items: center; color: #f1d9aa; font-size: .88rem; }
.photo-caption p { font: 600 clamp(2.2rem, 4.4vw, 4.4rem)/1.08 var(--display); letter-spacing: -.04em; margin-top: .62rem; }
.photo-caption em { color: #e6c690; font-style: normal; }
.login-side { display: grid; place-items: center; padding: clamp(1.4rem, 5vw, 5rem); }
.login-card { width: min(100%, 438px); padding: 1rem 0; }
.login-intro { margin-bottom: 2rem; }
.login-intro h1 { margin: .6rem 0 .7rem; font: 620 clamp(2.75rem, 4.2vw, 4.2rem)/1.07 var(--display); letter-spacing: -.045em; }
.login-intro p { color: var(--muted); }
.login-form { display: grid; gap: 1.15rem; }
.input-wrap { position: relative; display: flex; align-items: center; color: var(--gold-dark); }
.input-wrap > svg { position: absolute; left: 14px; pointer-events: none; }
.input-wrap > input { width: 100%; padding: .85rem 2.9rem .85rem 2.65rem; }
.reveal-button { position: absolute; right: 7px; display: grid; height: 36px; width: 36px; place-items: center; border-radius: 7px; color: var(--muted); }
.reveal-button:hover { background: var(--gold-soft); color: var(--text); }
.password-mode { margin-top: -.55rem; color: var(--muted); font-size: .85rem; }
.submit-button { min-height: 52px; margin-top: .25rem; justify-content: space-between; }
.password-help { margin-top: .95rem; font-size: .88rem; }
.password-help summary { width: fit-content; cursor: pointer; color: var(--gold-dark); font-weight: 680; }
.password-help summary:hover { text-decoration: underline; }
.password-help-content { display: grid; gap: .55rem; margin-top: .65rem; padding: .85rem; border-radius: 9px; background: var(--gold-soft); color: var(--text); }
.demo-section { margin-top: 1.8rem; }
.demo-label { display: flex; align-items: center; gap: .9rem; color: var(--muted); font-size: .8rem; }
.demo-label::before, .demo-label::after { content: ''; height: 1px; flex: 1; background: var(--line); }
.demo-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; margin-top: .9rem; }
.demo-buttons .btn { font-size: .88rem; padding-inline: .5rem; }
.demo-buttons svg { color: var(--gold-dark); }
@media (max-width: 760px) {
  .login-page { display: block; }
  .studio-photo { min-height: 220px; padding: 1.45rem; background-position: center 51%; }
  .photo-caption p { font-size: 2rem; }
  .photo-location { font-size: .76rem; }
  .login-side { padding: 1.3rem 1.4rem 2.25rem; }
  .login-intro { margin-bottom: 1.35rem; }
}
@media (max-width: 390px) {
  .studio-photo { min-height: 180px; }
  .login-intro h1 { font-size: 2.55rem; }
}
</style>
