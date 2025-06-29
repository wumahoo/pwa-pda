<template>
  <div class="login-container">
    <div class="login-header">
      <div class="logo">
        <van-icon name="logistics" size="48" color="#1989fa" />
      </div>
      <h1 class="title">PMS分拣系统</h1>
      <p class="subtitle">Progressive Web App</p>
    </div>

    <van-form @submit="handleLogin" class="login-form">
      <van-cell-group inset>
        <van-field
          v-model="form.username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          left-icon="contact"
          :rules="[{ required: true, message: '请输入用户名' }]"
          clearable
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          left-icon="lock"
          :rules="[{ required: true, message: '请输入密码' }]"
          clearable
        />
      </van-cell-group>

      <div class="login-options">
        <van-checkbox v-model="form.remember">记住密码</van-checkbox>
      </div>

      <div class="login-button">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="appStore.isLoading"
          loading-text="登录中..."
        >
          登录
        </van-button>
      </div>
    </van-form>

    <!-- 网络状态提示 -->
    <div class="network-status" v-if="!networkStatus.isOnline">
      <van-notice-bar
        left-icon="wifi-off"
        text="当前处于离线状态，部分功能可能受限"
        color="#ed6a0c"
        background="#fffbe8"
      />
    </div>

    <!-- 版本信息 -->
    <div class="version-info">
      <p>版本 1.0.0</p>
      <p v-if="lastSyncTime">最后同步: {{ formatTime(lastSyncTime) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const appStore = useAppStore()

// 表单数据
const form = ref({
  username: '',
  password: '',
  remember: false
})

// 计算属性
const networkStatus = computed(() => appStore.networkStatus)
const lastSyncTime = computed(() => appStore.lastSyncTime)

// 处理登录
const handleLogin = async () => {
  try {
    await appStore.login(form.value.username, form.value.password)
    
    // 如果记住密码，保存到本地存储
    if (form.value.remember) {
      localStorage.setItem('rememberedUsername', form.value.username)
    } else {
      localStorage.removeItem('rememberedUsername')
    }
    
    showToast({
      type: 'success',
      message: '登录成功'
    })
    
    // 跳转到任务列表
    const redirect = router.currentRoute.value.query.redirect as string
    router.replace(redirect || '/tasks')
    
  } catch (error) {
    console.error('登录失败:', error)
    
    showDialog({
      title: '登录失败',
      message: error instanceof Error ? error.message : '登录失败，请检查用户名和密码',
      confirmButtonText: '确定'
    })
  }
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 组件挂载时的操作
onMounted(() => {
  // 如果已登录，直接跳转
  if (appStore.isLoggedIn) {
    router.replace('/tasks')
    return
  }
  
  // 加载记住的用户名
  const rememberedUsername = localStorage.getItem('rememberedUsername')
  if (rememberedUsername) {
    form.value.username = rememberedUsername
    form.value.remember = true
  }
  
  // 初始化应用
  appStore.initApp()
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-top: 60px;
  margin-bottom: 40px;
}

.logo {
  margin-bottom: 20px;
}

.title {
  color: white;
  font-size: 28px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0;
}

.login-form {
  flex: 1;
}

.login-options {
  padding: 16px;
  text-align: center;
}

.login-button {
  padding: 16px;
}

.network-status {
  margin-top: 20px;
}

.version-info {
  text-align: center;
  margin-top: auto;
  padding-top: 20px;
}

.version-info p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin: 4px 0;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .login-container {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  }
}
</style>