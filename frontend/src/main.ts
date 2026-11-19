import { createApp } from 'vue'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/playfair-display'
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
