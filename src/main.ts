import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Vant UI组件库
import Vant from 'vant'
import 'vant/lib/index.css'

// 移动端适配
import '@vant/touch-emulator'

// PWA注册
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)
const pinia = createPinia()

// 注册插件
app.use(pinia)
app.use(router)
app.use(Vant)

// 注册Service Worker
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      console.log('发现新版本，准备更新')
    },
    onOfflineReady() {
      console.log('应用已准备好离线使用')
    },
    onRegistered(r) {
      console.log('Service Worker已注册:', r)
    },
    onRegisterError(error) {
      console.error('Service Worker注册失败:', error)
    }
  })
}

// 全局错误处理
app.config.errorHandler = (err, _vm, info) => {
  console.error('全局错误:', err, info)
}

// 挂载应用
app.mount('#app')
