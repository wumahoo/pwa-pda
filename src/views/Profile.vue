<template>
  <div class="profile-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="个人中心"
      left-text="返回"
      left-arrow
      @click-left="handleBack"
    />

    <!-- 用户信息卡片 -->
    <div class="user-card" v-if="userInfo">
      <div class="user-avatar">
        <van-image
          :src="userInfo.avatar || '/default-avatar.png'"
          round
          width="60"
          height="60"
          fit="cover"
        >
          <template #error>
            <van-icon name="user-o" size="30" color="#969799" />
          </template>
        </van-image>
      </div>
      <div class="user-info">
        <div class="user-name">{{ userInfo.name || userInfo.username }}</div>
        <div class="user-role">{{ userInfo.role || '分拣员' }}</div>
        <div class="user-department">{{ userInfo.department || '仓储部' }}</div>
      </div>
      <div class="user-status">
        <van-tag :type="isOnline ? 'success' : 'default'">
          {{ isOnline ? '在线' : '离线' }}
        </van-tag>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <van-cell-group inset>
        <van-cell title="今日完成任务" :value="`${todayStats.completedTasks} 个`" />
        <van-cell title="今日扫描商品" :value="`${todayStats.scannedItems} 件`" />
        <van-cell title="本月完成任务" :value="`${monthStats.completedTasks} 个`" />
        <van-cell title="累计完成任务" :value="`${totalStats.completedTasks} 个`" />
      </van-cell-group>
    </div>

    <!-- 功能菜单 -->
    <div class="menu-section">
      <van-cell-group inset>
        <van-cell
          title="数据同步"
          icon="refresh"
          is-link
          @click="goToSync"
        >
          <template #value>
            <van-badge 
              :content="pendingSyncCount" 
              v-if="pendingSyncCount > 0"
            >
              <span>{{ lastSyncTime }}</span>
            </van-badge>
            <span v-else>{{ lastSyncTime }}</span>
          </template>
        </van-cell>
        
        <van-cell
          title="应用设置"
          icon="setting-o"
          is-link
          @click="goToSettings"
        />
        
        <van-cell
          title="扫描历史"
          icon="records"
          is-link
          @click="goToScanHistory"
        />
        
        <van-cell
          title="帮助与反馈"
          icon="question-o"
          is-link
          @click="goToHelp"
        />
        
        <van-cell
          title="关于应用"
          icon="info-o"
          is-link
          @click="goToAbout"
        />
      </van-cell-group>
    </div>

    <!-- 系统信息 -->
    <div class="system-info">
      <van-cell-group inset>
        <van-cell title="应用版本" :value="appVersion" />
        <van-cell title="设备信息" :value="deviceInfo" />
        <van-cell title="网络状态">
          <template #value>
            <van-tag :type="networkStatus.isOnline ? 'success' : 'danger'">
              {{ networkStatus.isOnline ? '已连接' : '离线' }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="存储使用" :value="storageUsage" />
      </van-cell-group>
    </div>

    <!-- 退出登录 -->
    <div class="logout-section">
      <van-button
        type="danger"
        size="large"
        block
        @click="showLogoutDialog = true"
      >
        退出登录
      </van-button>
    </div>

    <!-- 退出确认弹窗 -->
    <van-dialog
      v-model:show="showLogoutDialog"
      title="确认退出"
      message="确定要退出登录吗？未同步的数据可能会丢失。"
      show-cancel-button
      @confirm="handleLogout"
    />

    <!-- 扫描历史弹窗 -->
    <van-popup
      v-model:show="showScanHistory"
      position="bottom"
      round
      closeable
      :style="{ height: '70%' }"
    >
      <div class="scan-history-popup">
        <h3>扫描历史</h3>
        
        <div class="history-filter">
          <van-tabs v-model:active="historyFilter">
            <van-tab title="今日" name="today" />
            <van-tab title="本周" name="week" />
            <van-tab title="本月" name="month" />
          </van-tabs>
        </div>
        
        <div class="history-list">
          <van-list
            v-model:loading="historyLoading"
            :finished="historyFinished"
            finished-text="没有更多了"
            @load="loadScanHistory"
          >
            <div 
              v-for="record in scanHistory" 
              :key="record.id"
              class="history-item"
            >
              <div class="history-icon">
                <van-icon 
                  :name="record.isValid ? 'success' : 'cross'" 
                  :color="record.isValid ? '#07c160' : '#ee0a24'"
                  size="16"
                />
              </div>
              <div class="history-content">
                <div class="history-barcode">{{ record.barcode }}</div>
                <div class="history-product">{{ record.productName }}</div>
                <div class="history-time">{{ formatDateTime(record.timestamp || record.scannedAt) }}</div>
              </div>
            </div>
            
            <van-empty 
              v-if="scanHistory.length === 0 && !historyLoading"
              description="暂无扫描记录"
              image="search"
            />
          </van-list>
        </div>
      </div>
    </van-popup>

    <!-- 关于应用弹窗 -->
    <van-popup
      v-model:show="showAbout"
      round
      closeable
      :style="{ width: '90%' }"
    >
      <div class="about-popup">
        <div class="about-header">
          <van-image
            src="/logo.png"
            width="60"
            height="60"
            fit="contain"
          >
            <template #error>
              <van-icon name="apps-o" size="30" color="#1989fa" />
            </template>
          </van-image>
          <h3>PMS-PDA 分拣系统</h3>
          <p>版本 {{ appVersion }}</p>
        </div>
        
        <div class="about-content">
          <p>一款专为仓库分拣作业设计的PWA应用，支持离线操作和数据同步。</p>
          
          <div class="about-features">
            <h4>主要功能</h4>
            <ul>
              <li>离线分拣作业</li>
              <li>条码扫描识别</li>
              <li>数据自动同步</li>
              <li>任务进度跟踪</li>
              <li>多设备支持</li>
            </ul>
          </div>
          
          <div class="about-info">
            <p>技术支持：开发团队</p>
            <p>联系邮箱：support@example.com</p>
            <p>更新时间：{{ buildTime }}</p>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores'
import { storageService } from '@/services/storage'
import { showToast } from 'vant'
import type { ScanRecord, SortingTask } from '@/types'

const router = useRouter()
const appStore = useAppStore()

// 响应式数据
const showLogoutDialog = ref(false)
const showScanHistory = ref(false)
const showAbout = ref(false)
const historyFilter = ref<'today' | 'week' | 'month'>('today')
const historyLoading = ref(false)
const historyFinished = ref(false)
const scanHistory = ref<ScanRecord[]>([])
const storageUsage = ref('计算中...')
const deviceInfo = ref('获取中...')

// 计算属性
const userInfo = computed(() => appStore.user)
const isOnline = computed(() => appStore.networkStatus.isOnline)
const networkStatus = computed(() => appStore.networkStatus)
const pendingSyncCount = computed(() => appStore.pendingSyncCount)
const lastSyncTime = computed(() => {
  const time = appStore.lastSyncTime
  if (!time) return '从未同步'
  return formatRelativeTime(new Date(time))
})

const appVersion = computed(() => {
  return import.meta.env.VITE_APP_VERSION || '1.0.0'
})

const buildTime = computed(() => {
  return import.meta.env.VITE_BUILD_TIME || new Date().toLocaleDateString('zh-CN')
})

// 统计数据
const todayStats = ref({
  completedTasks: 0,
  scannedItems: 0
})

const monthStats = ref({
  completedTasks: 0,
  scannedItems: 0
})

const totalStats = ref({
  completedTasks: 0,
  scannedItems: 0
})

// 方法
const handleBack = () => {
  router.push('/tasks')
}

const goToSync = () => {
  router.push('/sync')
}

const goToSettings = () => {
  router.push('/settings')
}

const goToScanHistory = () => {
  showScanHistory.value = true
  loadScanHistory()
}

const goToHelp = () => {
  showToast('帮助功能开发中')
}

const goToAbout = () => {
  showAbout.value = true
}

const handleLogout = async () => {
  try {
    // 检查是否有未同步的数据
    if (pendingSyncCount.value > 0) {
      await new Promise((resolve) => {
        showToast({
          type: 'loading',
          message: '检查未同步数据...',
          duration: 1000,
          onClose: () => resolve(true)
        })
      })
    }
    
    await appStore.logout()
    router.replace('/login')
  } catch (error) {
    console.error('退出登录失败:', error)
    showToast('退出登录失败')
  }
}

const loadScanHistory = async () => {
  if (historyLoading.value || historyFinished.value) return
  
  historyLoading.value = true
  
  try {
    // 根据筛选条件获取扫描记录
    const records = await storageService.getScanRecords()
    const now = new Date()
    let filteredRecords: ScanRecord[] = []
    
    switch (historyFilter.value) {
      case 'today':
        filteredRecords = records.filter(record => {
          const recordDate = new Date(record.timestamp || record.scannedAt)
          return recordDate.toDateString() === now.toDateString()
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filteredRecords = records.filter(record => {
          const recordDate = new Date(record.timestamp || record.scannedAt)
          return recordDate >= weekAgo
        })
        break
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        filteredRecords = records.filter(record => {
          const recordDate = new Date(record.timestamp || record.scannedAt)
          return recordDate >= monthAgo
        })
        break
    }
    
    scanHistory.value = filteredRecords.sort((a, b) => 
      new Date(b.timestamp || b.scannedAt).getTime() - new Date(a.timestamp || a.scannedAt).getTime()
    )
    
    historyFinished.value = true
  } catch (error) {
    console.error('加载扫描历史失败:', error)
    showToast('加载扫描历史失败')
  } finally {
    historyLoading.value = false
  }
}

const loadStats = async () => {
  try {
    // 加载统计数据
    const tasks = await storageService.getSortingTasks()
    const records = await storageService.getScanRecords()
    
    const now = new Date()
    const today = now.toDateString()
    const thisMonth = `${now.getFullYear()}-${now.getMonth() + 1}`
    
    // 今日统计
    todayStats.value = {
      completedTasks: tasks.filter((task: SortingTask) => {
        const taskDate = new Date(task.completedAt || task.updatedAt)
        return task.status === 'completed' && taskDate.toDateString() === today
      }).length,
      scannedItems: records.filter(record => {
        const recordDate = new Date(record.timestamp || record.scannedAt)
        return recordDate.toDateString() === today
      }).length
    }
    
    // 本月统计
    monthStats.value = {
      completedTasks: tasks.filter((task: SortingTask) => {
        const taskDate = new Date(task.completedAt || task.updatedAt)
        const taskMonth = `${taskDate.getFullYear()}-${taskDate.getMonth() + 1}`
        return task.status === 'completed' && taskMonth === thisMonth
      }).length,
      scannedItems: records.filter(record => {
        const recordDate = new Date(record.timestamp || record.scannedAt)
        const recordMonth = `${recordDate.getFullYear()}-${recordDate.getMonth() + 1}`
        return recordMonth === thisMonth
      }).length
    }
    
    // 总计统计
    totalStats.value = {
      completedTasks: tasks.filter((task: SortingTask) => task.status === 'completed').length,
      scannedItems: records.length
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadStorageUsage = async () => {
  try {
    const usage = await storageService.getStorageUsage()
    const totalMB = (usage.total / 1024 / 1024).toFixed(1)
    const usedMB = (usage.used / 1024 / 1024).toFixed(1)
    storageUsage.value = `${usedMB}MB / ${totalMB}MB`
  } catch (error) {
    console.error('获取存储使用情况失败:', error)
    storageUsage.value = '获取失败'
  }
}

const loadDeviceInfo = () => {
  try {
    const userAgent = navigator.userAgent
    let deviceType = '未知设备'
    
    if (/Android/i.test(userAgent)) {
      deviceType = 'Android'
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      deviceType = 'iOS'
    } else if (/Windows/i.test(userAgent)) {
      deviceType = 'Windows'
    } else if (/Mac/i.test(userAgent)) {
      deviceType = 'macOS'
    }
    
    deviceInfo.value = deviceType
  } catch (error) {
    console.error('获取设备信息失败:', error)
    deviceInfo.value = '获取失败'
  }
}

// 工具方法
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const formatRelativeTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 生命周期
onMounted(async () => {
  if (!appStore.isLoggedIn) {
    router.replace('/login')
    return
  }
  
  // 加载各种数据
  await Promise.all([
    loadStats(),
    loadStorageUsage(),
    loadDeviceInfo()
  ])
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.user-card {
  background-color: white;
  padding: 20px 16px;
  margin: 8px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-avatar {
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.user-role {
  font-size: 14px;
  color: #969799;
  margin-bottom: 2px;
}

.user-department {
  font-size: 12px;
  color: #c8c9cc;
}

.user-status {
  flex-shrink: 0;
}

.stats-section,
.menu-section,
.system-info {
  margin: 16px 0;
}

.logout-section {
  margin: 24px 16px 16px;
}

.scan-history-popup {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.scan-history-popup h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
}

.history-filter {
  margin-bottom: 16px;
}

.history-list {
  flex: 1;
  overflow: auto;
}

.history-item {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #ebedf0;
  gap: 12px;
}

.history-item:last-child {
  border-bottom: none;
}

.history-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-content {
  flex: 1;
}

.history-barcode {
  font-weight: bold;
  margin-bottom: 4px;
}

.history-product {
  font-size: 14px;
  color: #646566;
  margin-bottom: 4px;
}

.history-time {
  font-size: 12px;
  color: #969799;
}

.about-popup {
  padding: 24px;
  text-align: center;
}

.about-header {
  margin-bottom: 24px;
}

.about-header h3 {
  margin: 16px 0 8px;
  font-size: 20px;
}

.about-header p {
  margin: 0;
  color: #969799;
}

.about-content {
  text-align: left;
}

.about-content p {
  line-height: 1.6;
  color: #646566;
  margin-bottom: 16px;
}

.about-features {
  margin-bottom: 24px;
}

.about-features h4 {
  margin-bottom: 12px;
  color: #323233;
}

.about-features ul {
  margin: 0;
  padding-left: 20px;
}

.about-features li {
  margin-bottom: 8px;
  color: #646566;
}

.about-info {
  border-top: 1px solid #ebedf0;
  padding-top: 16px;
}

.about-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #969799;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .profile-container {
    background-color: #1a1a1a;
  }
  
  .user-card {
    background-color: #2d2d2d;
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }
  
  .history-item {
    border-bottom-color: #404040;
  }
}
</style>