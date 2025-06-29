<template>
  <div class="sync-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="数据同步"
      left-text="返回"
      left-arrow
      @click-left="handleBack"
    >
      <template #right>
        <van-icon 
          name="refresh" 
          @click="refreshStatus"
          :class="{ 'rotating': refreshing }"
        />
      </template>
    </van-nav-bar>

    <!-- 同步状态卡片 -->
    <div class="sync-status-card">
      <div class="status-header">
        <div class="status-icon">
          <van-icon 
            :name="getStatusIcon()" 
            :color="getStatusColor()" 
            size="32"
          />
        </div>
        <div class="status-info">
          <div class="status-title">{{ getStatusTitle() }}</div>
          <div class="status-subtitle">{{ getStatusSubtitle() }}</div>
        </div>
        <div class="network-status">
          <van-tag :type="networkStatus.isOnline ? 'success' : 'danger'">
            {{ networkStatus.isOnline ? '在线' : '离线' }}
          </van-tag>
        </div>
      </div>
      
      <div class="sync-progress" v-if="syncInProgress">
        <van-progress 
          :percentage="syncProgress" 
          :color="'#1989fa'"
          :pivot-text="`${syncProgress}%`"
        />
        <div class="progress-text">{{ syncProgressText }}</div>
      </div>
    </div>

    <!-- 待同步数据统计 -->
    <div class="pending-data">
      <van-cell-group inset>
        <van-cell title="待同步任务" :value="`${pendingTasks} 个`">
          <template #icon>
            <van-icon name="todo-list-o" color="#1989fa" />
          </template>
        </van-cell>
        
        <van-cell title="待同步扫描记录" :value="`${pendingRecords} 条`">
          <template #icon>
            <van-icon name="scan" color="#07c160" />
          </template>
        </van-cell>
        
        <van-cell title="数据大小" :value="pendingDataSize">
          <template #icon>
            <van-icon name="records" color="#ff976a" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 同步历史 -->
    <div class="sync-history">
      <div class="section-header">
        <h3>同步历史</h3>
        <van-button 
          size="small" 
          type="primary" 
          @click="loadSyncHistory"
          :loading="historyLoading"
        >
          刷新
        </van-button>
      </div>
      
      <van-cell-group inset>
        <div v-if="syncHistory.length === 0" class="empty-history">
          <van-empty description="暂无同步记录" image="search" />
        </div>
        
        <van-cell 
          v-for="record in syncHistory" 
          :key="record.id"
          :title="formatSyncTime(record.timestamp)"
          :label="getSyncResultText(record)"
        >
          <template #icon>
            <van-icon 
              :name="record.success ? 'success' : 'cross'" 
              :color="record.success ? '#07c160' : '#ee0a24'"
            />
          </template>
          <template #value>
            <div class="sync-stats">
              <div class="stat-item">
                <span class="stat-label">任务:</span>
                <span class="stat-value">{{ record.uploadedTasks || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">记录:</span>
                <span class="stat-value">{{ record.uploadedRecords || 0 }}</span>
              </div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 同步设置 -->
    <div class="sync-settings">
      <div class="section-header">
        <h3>同步设置</h3>
      </div>
      
      <van-cell-group inset>
        <van-cell title="自动同步">
          <template #right-icon>
            <van-switch v-model="autoSyncEnabled" @change="updateAutoSync" />
          </template>
        </van-cell>
        
        <van-cell title="仅WiFi同步">
          <template #right-icon>
            <van-switch 
              v-model="wifiOnlySync" 
              :disabled="!autoSyncEnabled"
              @change="updateWifiOnlySync" 
            />
          </template>
        </van-cell>
        
        <van-cell title="同步间隔" :value="getSyncIntervalText()" />
        
        <van-cell title="最后同步时间" :value="lastSyncTimeText" />
      </van-cell-group>
    </div>

    <!-- 底部操作按钮 -->
    <div class="sync-actions">
      <van-button 
        type="primary" 
        size="large" 
        block 
        @click="startManualSync"
        :loading="syncInProgress"
        :disabled="!networkStatus.isOnline || (pendingTasks === 0 && pendingRecords === 0)"
      >
        {{ syncInProgress ? '同步中...' : '立即同步' }}
      </van-button>
      
      <van-button 
        type="warning" 
        size="large" 
        block 
        @click="showForceSync = true"
        :disabled="syncInProgress"
        style="margin-top: 12px;"
      >
        强制全量同步
      </van-button>
    </div>

    <!-- 强制同步确认弹窗 -->
    <van-dialog
      v-model:show="showForceSync"
      title="强制全量同步"
      message="这将重新上传所有本地数据，可能需要较长时间。确定要继续吗？"
      show-cancel-button
      @confirm="startForceSync"
    />

    <!-- 同步详情弹窗 -->
    <van-popup
      v-model:show="showSyncDetail"
      position="bottom"
      round
      closeable
      :style="{ height: '60%' }"
    >
      <div class="sync-detail-popup">
        <h3>同步详情</h3>
        
        <div class="detail-content">
          <van-steps direction="vertical" :active="currentSyncStep">
            <van-step>检查网络连接</van-step>
            <van-step>验证服务器状态</van-step>
            <van-step>上传待同步任务</van-step>
            <van-step>上传扫描记录</van-step>
            <van-step>下载最新数据</van-step>
            <van-step>同步完成</van-step>
          </van-steps>
          
          <div class="sync-logs" v-if="syncLogs.length > 0">
            <h4>同步日志</h4>
            <div class="log-list">
              <div 
                v-for="(log, index) in syncLogs" 
                :key="index"
                :class="['log-item', log.level]"
              >
                <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores'
import { syncService } from '@/services/sync'
import { storageService } from '@/services/storage'
import { showToast } from 'vant'
import type { SyncStatus } from '@/types'

const router = useRouter()
const appStore = useAppStore()

// 响应式数据
const refreshing = ref(false)
const syncInProgress = ref(false)
const syncProgress = ref(0)
const syncProgressText = ref('')
const currentSyncStep = ref(0)
const showForceSync = ref(false)
const showSyncDetail = ref(false)
const historyLoading = ref(false)
const autoSyncEnabled = ref(true)
const wifiOnlySync = ref(false)
const syncHistory = ref<Array<{
  id: string
  timestamp: string
  success: boolean
  uploadedTasks?: number
  uploadedRecords?: number
  errorMessage?: string
}>>([]) 
const syncLogs = ref<Array<{
  timestamp: Date
  level: 'info' | 'warning' | 'error'
  message: string
}>>([])

// 直接使用值而不是计算属性
const networkStatus = appStore.networkStatus
// 直接使用值而不是计算属性，避免.value访问问题
const pendingTasks = appStore.networkStatus.pendingSyncCount
const pendingRecords = 0 // 这里应该从store获取待同步的扫描记录数量
const pendingDataSize = computed(() => {
  // 计算待同步数据的大小
  const totalItems = pendingTasks + pendingRecords
  const estimatedSize = totalItems * 0.5 // 假设每条记录约0.5KB
  if (estimatedSize < 1) {
    return `${Math.round(estimatedSize * 1024)}B`
  } else {
    return `${estimatedSize.toFixed(1)}KB`
  }
})
const lastSyncTimeText = computed(() => {
  const time = appStore.lastSyncTime
  if (!time) return '从未同步'
  return formatRelativeTime(new Date(time))
})

// 方法
const handleBack = () => {
  router.push('/profile')
}

const refreshStatus = async () => {
  refreshing.value = true
  
  try {
    // 检查网络状态
    networkStatus.isOnline = navigator.onLine
    networkStatus.lastOnlineTime = navigator.onLine ? new Date().toISOString() : networkStatus.lastOnlineTime
    
    await loadPendingData()
    await loadSyncHistory()
    showToast('状态已刷新')
  } catch (error) {
    console.error('刷新状态失败:', error)
    showToast('刷新状态失败')
  } finally {
    refreshing.value = false
  }
}

const startManualSync = async () => {
  if (syncInProgress.value) return
  
  syncInProgress.value = true
  syncProgress.value = 0
  currentSyncStep.value = 0
  syncLogs.value = []
  showSyncDetail.value = true
  
  try {
    // 添加同步监听器
    syncService.addSyncListener(handleSyncProgress)
    
    // 开始同步
    await syncService.syncData()
    
    showToast({
      type: 'success',
      message: '同步完成'
    })
    
    // 刷新数据
    await loadPendingData()
    await loadSyncHistory()
  } catch (error) {
    console.error('同步失败:', error)
    showToast({
      type: 'fail',
      message: error instanceof Error ? error.message : '同步失败'
    })
  } finally {
    syncInProgress.value = false
    syncProgress.value = 0
    currentSyncStep.value = 0
    
    // 移除监听器
    syncService.removeSyncListener(handleSyncProgress)
    
    // 3秒后自动关闭详情弹窗
    setTimeout(() => {
      showSyncDetail.value = false
    }, 3000)
  }
}

const startForceSync = async () => {
  if (syncInProgress.value) return
  
  try {
    await syncService.forceSync()
    showToast('强制同步完成')
    await loadPendingData()
    await loadSyncHistory()
  } catch (error) {
    console.error('强制同步失败:', error)
    showToast('强制同步失败')
  }
}

const loadPendingData = async () => {
  try {
    // 加载待同步数据统计
    const pendingData = await storageService.getPendingData()
    if (pendingData) {
      // 更新待同步数据计数
      networkStatus.pendingSyncCount = 
        (pendingData.tasks?.length || 0) + (pendingData.scanRecords?.length || 0)
    } else {
      networkStatus.pendingSyncCount = 0
    }
  } catch (error) {
    console.error('加载待同步数据失败:', error)
  }
}

const loadSyncHistory = async () => {
  historyLoading.value = true
  
  try {
    // 模拟同步历史数据
    const lastSyncTime = await storageService.getLastSyncTime()
    if (lastSyncTime) {
      // 创建一条基于最后同步时间的记录
      syncHistory.value = [{
        id: '1',
        timestamp: lastSyncTime,
        success: true,
        uploadedTasks: 0,
        uploadedRecords: 0
      }]
    } else {
      syncHistory.value = []
    }
  } catch (error) {
    console.error('加载同步历史失败:', error)
    syncHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

const updateAutoSync = async (enabled: boolean) => {
  try {
    // 获取当前配置
    const config = await storageService.getConfig() || {
      apiBaseUrl: '',
      syncInterval: 300000,
      maxRetryAttempts: 3,
      offlineStorageLimit: 1000,
      sync: {
        autoSync: true,
        wifiOnlySync: false,
        batchSize: 50,
        syncInterval: 300000
      },
      display: {
        darkMode: false,
        fontSize: 'medium',
        keepScreenOn: false,
        showTaskStats: true
      },
      network: {
        timeout: 30000,
        retryCount: 3,
        offlineMode: false
      },
      scanner: {
        soundEnabled: true,
        vibrationEnabled: true,
        autoFocus: true,
        scanDelay: 1000,
        enabledFormats: ['CODE_128', 'EAN_13', 'EAN_8', 'QR_CODE']
      },
      storage: {
        dataRetentionDays: 30,
        autoCleanup: true
      }
    }
    
    // 更新配置
    config.sync = config.sync || { autoSync: true, wifiOnlySync: false, batchSize: 50, syncInterval: 300000 }
    config.sync.autoSync = enabled
    
    // 保存配置
    await storageService.saveConfig(config)
    
    // 根据设置启动或停止自动同步
    // 注意：SyncService中的startAutoSync和stopAutoSync是私有方法，不能直接调用
    // 通过配置变更来控制自动同步
    
    showToast(enabled ? '已开启自动同步' : '已关闭自动同步')
  } catch (error) {
    console.error('更新自动同步设置失败:', error)
    showToast('更新设置失败')
    autoSyncEnabled.value = !enabled // 回滚
  }
}

const updateWifiOnlySync = async (enabled: boolean) => {
  try {
    // 获取当前配置
    const config = await storageService.getConfig() || {
      apiBaseUrl: '',
      syncInterval: 300000,
      maxRetryAttempts: 3,
      offlineStorageLimit: 1000,
      sync: {
        autoSync: true,
        wifiOnlySync: false,
        batchSize: 50,
        syncInterval: 300000
      },
      display: {
        darkMode: false,
        fontSize: 'medium',
        keepScreenOn: false,
        showTaskStats: true
      },
      network: {
        timeout: 30000,
        retryCount: 3,
        offlineMode: false
      },
      scanner: {
        soundEnabled: true,
        vibrationEnabled: true,
        autoFocus: true,
        scanDelay: 1000,
        enabledFormats: ['CODE_128', 'EAN_13', 'EAN_8', 'QR_CODE']
      },
      storage: {
        dataRetentionDays: 30,
        autoCleanup: true
      }
    }
    
    // 更新配置
    config.sync = config.sync || { autoSync: true, wifiOnlySync: false, batchSize: 50, syncInterval: 300000 }
    config.sync.wifiOnlySync = enabled
    
    // 保存配置
    await storageService.saveConfig(config)
    showToast(enabled ? '已开启仅WIFI同步' : '已关闭仅WIFI同步')
  } catch (error) {
    console.error('更新WiFi同步设置失败:', error)
    showToast('更新设置失败')
    wifiOnlySync.value = !enabled // 回滚
  }
}

const handleSyncProgress = (status: SyncStatus) => {
  // 根据同步状态更新UI
  syncInProgress.value = status.isSyncing
  
  // 模拟进度
  if (status.isSyncing) {
    syncProgress.value = 50 // 简单模拟进度
    syncProgressText.value = '正在同步数据...'
    currentSyncStep.value = 1
  } else if (status.error) {
    syncProgressText.value = `同步失败: ${status.error}`
  } else {
    syncProgress.value = 100
    syncProgressText.value = '同步完成'
    currentSyncStep.value = 2
  }
}

// 不再使用的函数，保留以备将来使用
// const handleSyncLog = (level: 'info' | 'warning' | 'error', message: string) => {
//   syncLogs.value.push({
//     timestamp: new Date(),
//     level,
//     message
//   })
//   
//   // 限制日志数量
//   if (syncLogs.value.length > 50) {
//     syncLogs.value = syncLogs.value.slice(-50)
//   }
// }

// 工具方法
const getStatusIcon = () => {
  if (syncInProgress.value) return 'loading'
  if (!networkStatus.isOnline) return 'wifi-o'
  if (pendingTasks > 0 || pendingRecords > 0) return 'warning-o'
  return 'success'
}

const getStatusColor = () => {
  if (syncInProgress.value) return '#1989fa'
  if (!networkStatus.isOnline) return '#969799'
  if (pendingTasks > 0 || pendingRecords > 0) return '#ff976a'
  return '#07c160'
}

const getStatusTitle = () => {
  if (syncInProgress.value) return '同步中'
  if (!networkStatus.isOnline) return '离线状态'
  if (pendingTasks > 0 || pendingRecords > 0) return '有待同步数据'
  return '数据已同步'
}

const getStatusSubtitle = () => {
  if (syncInProgress.value) return syncProgressText.value
  if (!networkStatus.isOnline) return '网络连接不可用'
  if (pendingTasks > 0 || pendingRecords > 0) {
    return `${pendingTasks + pendingRecords} 项待同步`
  }
  return '所有数据已同步到服务器'
}

const getSyncIntervalText = () => {
  // 从配置中获取同步间隔
  return '5分钟' // 临时值
}

const formatSyncTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const formatLogTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN')
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

const getSyncResultText = (record: any) => {
  if (record.success) {
    return `成功同步 ${(record.uploadedTasks || 0) + (record.uploadedRecords || 0)} 项数据`
  } else {
    return record.errorMessage || '同步失败'
  }
}

// 生命周期
onMounted(async () => {
  if (!appStore.isLoggedIn) {
    router.replace('/login')
    return
  }
  
  // 加载初始数据
  await Promise.all([
    loadPendingData(),
    loadSyncHistory()
  ])
  
  // 加载同步设置
  try {
    const config = await storageService.getConfig()
    if (config) {
      autoSyncEnabled.value = config.sync?.autoSync ?? true
      wifiOnlySync.value = config.sync?.wifiOnlySync ?? false
    }
  } catch (error) {
    console.error('加载同步设置失败:', error)
  }
})

onUnmounted(() => {
  // 清理监听器
  syncService.removeSyncListener(handleSyncProgress)
})
</script>

<style scoped>
.sync-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sync-status-card {
  background-color: white;
  margin: 8px 16px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.status-icon {
  flex-shrink: 0;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.status-subtitle {
  font-size: 14px;
  color: #969799;
}

.network-status {
  flex-shrink: 0;
}

.sync-progress {
  margin-top: 16px;
}

.progress-text {
  text-align: center;
  font-size: 12px;
  color: #969799;
  margin-top: 8px;
}

.pending-data {
  margin: 16px 0;
}

.sync-history,
.sync-settings {
  margin: 24px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 16px 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  color: #969799;
  font-weight: normal;
}

.empty-history {
  padding: 20px;
}

.sync-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.stat-label {
  color: #969799;
}

.stat-value {
  color: #323233;
  font-weight: bold;
}

.sync-actions {
  padding: 16px;
}

.sync-detail-popup {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sync-detail-popup h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
}

.detail-content {
  flex: 1;
  overflow: auto;
}

.sync-logs {
  margin-top: 24px;
}

.sync-logs h4 {
  margin-bottom: 12px;
  font-size: 14px;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  padding: 8px;
  background-color: #f7f8fa;
}

.log-item {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-time {
  color: #969799;
  flex-shrink: 0;
  min-width: 60px;
}

.log-message {
  flex: 1;
}

.log-item.info .log-message {
  color: #323233;
}

.log-item.warning .log-message {
  color: #ff976a;
}

.log-item.error .log-message {
  color: #ee0a24;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .sync-container {
    background-color: #1a1a1a;
  }
  
  .sync-status-card {
    background-color: #2d2d2d;
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }
  
  .section-header h3 {
    color: #c8c9cc;
  }
  
  .log-list {
    background-color: #3d3d3d;
    border-color: #404040;
  }
}
</style>