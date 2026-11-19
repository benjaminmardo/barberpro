<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ compact?: boolean }>()
const filterId = 'goat-studio-' + useId()
const logo = import.meta.env.BASE_URL + 'goat-studio-777.png'
</script>

<template>
  <div class="brand-lockup" :class="{ compact }">
    <span class="brand-icon">
      <svg viewBox="15 43 198 151" focusable="false" aria-hidden="true">
        <defs>
          <filter :id="filterId" color-interpolation-filters="sRGB">
            <!-- The source background is #6c6c6c. Its luminance becomes transparent. -->
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0.3688 1.2406 0.1252 0 -0.7347"
              result="artwork"
            />
            <feFlood flood-color="currentColor" />
            <feComposite in2="artwork" operator="in" />
          </filter>
        </defs>
        <image :href="logo" width="217" height="217" :filter="'url(#' + filterId + ')'" />
      </svg>
    </span>
    <span class="brand-type">
      <strong>Barber Pro</strong>
      <small>GOAT STUDIO 777</small>
    </span>
  </div>
</template>

<style scoped>
.brand-lockup { display: inline-flex; gap: .72rem; align-items: center; text-align: left; white-space: nowrap; }
.brand-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--brand-mark-size, 48px);
  aspect-ratio: 1;
  border-radius: 13px;
  color: var(--brand-gold, #f1d495);
  background: #2c261a;
  border: 1px solid #594827;
}
.brand-icon svg { display: block; width: 87%; }
.brand-type { display: grid; gap: .18rem; }
strong { font-family: var(--display); font-size: 1.22rem; font-weight: 670; line-height: 1.06; }
small { color: var(--brand-muted, var(--muted)); font-size: .61rem; font-weight: 750; letter-spacing: .12em; }
.compact .brand-icon { width: var(--brand-mark-size, 42px); border-radius: 11px; }
.compact strong { font-size: 1.12rem; }
</style>
