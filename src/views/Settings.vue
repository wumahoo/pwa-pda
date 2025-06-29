<template>
  <div class="settings-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="应用设置"
      left-text="返回"
      left-arrow
      @click-left="handleBack"
    />

    <!-- 扫描设置 -->
    <div class="settings-section">
      <h3>扫描设置</h3>
      <van-cell-group inset>
        <van-cell title="声音提示">
          <template #right-icon>
            <van-switch v-model="settings.scanner.soundEnabled" @change="saveSettings" />
          </template>
        </van-cell>
        
        <van-cell title="振动反馈">
          <template #right-icon>
            <van-switch v-model="settings.scanner.vibrationEnabled" @change="saveSettings" />
          </template>
        </van-cell>
        
        <van-cell title="自动对焦">
          <template #right-icon>
            <van-switch v-model="settings.scanner.autoFocus" @change="saveSettings" />
          </template>
        </van-cell>
        
        <van-cell title="扫描延迟" is-link @click="showScanDelayPicker = true">
          <template #value>
            {{ settings.scanner.scanDelay }}ms
          </template>
        </van-cell>
        
        <van-cell title="支持的条码格式" is-link @click="showBarcodeFormats = true">
          <template #value>
            {{ enabledFormatsCount }} 种
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 同步设置 -->
    <div class="settings-section">
      <h3>同步设置</h3>
      <van-cell-group inset>
        <van-cell title="自动同步">
          <template #right-icon>
            <van-switch v-model="autoSync" @change="saveSettings" />
          </template>
        </van-cell>
        
        <van-cell title="WiFi下自动同步">
          <template #right-icon>
            <van-switch 
              v-model="wifiOnlySync"
              :disabled="!autoSync"
              @change="saveSettings" 
            />
          </template>
        </van-cell>
        
        <van-cell title="同步间隔" is-link @click="showSyncIntervalPicker = true">
          <template #value>
            {{ getSyncIntervalText(settings.sync ? settings.sync.syncInterval : 300000) }}
          </template>
        </van-cell>
        
        <van-cell title="批量上传大小" is-link @click="showBatchSizePicker = true">
          <template #value>
            {{ settings.sync ? settings.sync.batchSize : 50 }} 条
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 显示设置 -->
    <div class="settings-section">
      <h3>显示设置</h3>
      <van-cell-group inset>
        <van-cell title="深色模式">
          <template #right-icon>
            <van-switch v-model="settings.display.darkMode" @change="handleDarkModeChange" />
          </template>
        </van-cell>
        
        <van-cell title="字体大小" is-link @click="showFontSizePicker = true">
          <template #value>
            {{ getFontSizeText(settings.display.fontSize) }}
          </template>
        </van-cell>
        
        <van-cell title="保持屏幕常亮">
          <template #right-icon>
            <van-switch v-model="settings.display.keepScreenOn" @change="handleKeepScreenOnChange" />
          </template>
        </van-cell>
        
        <van-cell title="显示任务统计">
          <template #right-icon>
            <van-switch v-model="settings.display.showTaskStats" @change="saveSettings" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 存储设置 -->
    <div class="settings-section">
      <h3>存储设置</h3>
      <van-cell-group inset>
        <van-cell title="数据保留天数" is-link @click="showRetentionPicker = true">
          <template #value>
            {{ settings.storage.dataRetentionDays }} 天
          </template>
        </van-cell>
        
        <van-cell title="自动清理过期数据">
          <template #right-icon>
            <van-switch v-model="settings.storage.autoCleanup" @change="saveSettings" />
          </template>
        </van-cell>
        
        <van-cell title="存储使用情况" :value="storageUsage" />
        
        <van-cell title="清理缓存" is-link @click="showClearCacheDialog = true">
          <template #value>
            <van-tag type="warning">{{ cacheSize }}</van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 网络设置 -->
    <div class="settings-section">
      <h3>网络设置</h3>
      <van-cell-group inset>
        <van-cell title="请求超时时间" is-link @click="showTimeoutPicker = true">
          <template #value>
            {{ settings.network.timeout / 1000 }}s
          </template>
        </van-cell>
        
        <van-cell title="重试次数" is-link @click="showRetryPicker = true">
          <template #value>
            {{ settings.network.retryCount }} 次
          </template>
        </van-cell>
        
        <van-cell title="离线模式">
          <template #right-icon>
            <van-switch v-model="settings.network.offlineMode" @change="saveSettings" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 重置设置 -->
    <div class="settings-section">
      <van-cell-group inset>
        <van-cell 
          title="重置所有设置" 
          is-link 
          @click="showResetDialog = true"
        >
          <template #value>
            <van-tag type="danger">危险操作</van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 扫描延迟选择器 -->
    <van-popup v-model:show="showScanDelayPicker" position="bottom">
      <van-picker
        :columns="scanDelayOptions"
        @confirm="onScanDelayConfirm"
        @cancel="showScanDelayPicker = false"
      />
    </van-popup>

    <!-- 同步间隔选择器 -->
    <van-popup v-model:show="showSyncIntervalPicker" position="bottom">
      <van-picker
        :columns="syncIntervalOptions"
        @confirm="onSyncIntervalConfirm"
        @cancel="showSyncIntervalPicker = false"
      />
    </van-popup>

    <!-- 批量大小选择器 -->
    <van-popup v-model:show="showBatchSizePicker" position="bottom">
      <van-picker
        :columns="batchSizeOptions"
        @confirm="onBatchSizeConfirm"
        @cancel="showBatchSizePicker = false"
      />
    </van-popup>

    <!-- 字体大小选择器 -->
    <van-popup v-model:show="showFontSizePicker" position="bottom">
      <van-picker
        :columns="fontSizeOptions"
        @confirm="onFontSizeConfirm"
        @cancel="showFontSizePicker = false"
      />
    </van-popup>

    <!-- 数据保留天数选择器 -->
    <van-popup v-model:show="showRetentionPicker" position="bottom">
      <van-picker
        :columns="retentionOptions"
        @confirm="onRetentionConfirm"
        @cancel="showRetentionPicker = false"
      />
    </van-popup>

    <!-- 超时时间选择器 -->
    <van-popup v-model:show="showTimeoutPicker" position="bottom">
      <van-picker
        :columns="timeoutOptions"
        @confirm="onTimeoutConfirm"
        @cancel="showTimeoutPicker = false"
      />
    </van-popup>

    <!-- 重试次数选择器 -->
    <van-popup v-model:show="showRetryPicker" position="bottom">
      <van-picker
        :columns="retryOptions"
        @confirm="onRetryConfirm"
        @cancel="showRetryPicker = false"
      />
    </van-popup>

    <!-- 条码格式选择弹窗 -->
    <van-popup
      v-model:show="showBarcodeFormats"
      position="bottom"
      round
      closeable
      :style="{ height: '60%' }"
    >
      <div class="barcode-formats-popup">
        <h3>支持的条码格式</h3>
        <div class="formats-list">
          <van-checkbox-group v-model="settings.scanner.enabledFormats" @change="saveSettings">
            <van-cell-group>
              <van-cell
                v-for="format in barcodeFormats"
                :key="format.value"
                :title="format.text"
                clickable
                @click="toggleFormat(format.value)"
              >
                <template #right-icon>
                  <van-checkbox :name="format.value" />
                </template>
              </van-cell>
            </van-cell-group>
          </van-checkbox-group>
        </div>
      </div>
    </van-popup>

    <!-- 清理缓存确认弹窗 -->
    <van-dialog
      v-model:show="showClearCacheDialog"
      title="清理缓存"
      message="确定要清理所有缓存数据吗？这将删除临时文件和图片缓存。"
      show-cancel-button
      @confirm="clearCache"
    />

    <!-- 重置设置确认弹窗 -->
    <van-dialog
      v-model:show="showResetDialog"
      title="重置设置"
      message="确定要重置所有设置到默认值吗？此操作不可撤销。"
      show-cancel-button
      @confirm="resetSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// 不再使用AppStore
// import { useAppStore } from '@/stores'
import { storageService } from '@/services/storage'
import { showToast } from 'vant'
import type { AppConfig } from '@/types'

const router = useRouter()
// 不再使用appStore
// const appStore = useAppStore()

// 响应式数据
const settings = ref<AppConfig>({
  apiBaseUrl: '',
  syncInterval: 300000,
  maxRetryAttempts: 3,
  offlineStorageLimit: 1000,
  scanner: {
    soundEnabled: true,
    vibrationEnabled: true,
    autoFocus: true,
    scanDelay: 1000,
    enabledFormats: ['CODE_128', 'EAN_13', 'EAN_8', 'QR_CODE']
  },
  sync: {
    autoSync: true,
    wifiOnlySync: false,
    syncInterval: 300000, // 5分钟
    batchSize: 50
  },
  display: {
    darkMode: false,
    fontSize: 'medium',
    keepScreenOn: false,
    showTaskStats: true
  },
  storage: {
    dataRetentionDays: 30,
    autoCleanup: true
  },
  network: {
    timeout: 10000,
    retryCount: 3,
    offlineMode: false
  }
})

const showScanDelayPicker = ref(false)
const showSyncIntervalPicker = ref(false)
const showBatchSizePicker = ref(false)
const showFontSizePicker = ref(false)
const showRetentionPicker = ref(false)
const showTimeoutPicker = ref(false)
const showRetryPicker = ref(false)
const showBarcodeFormats = ref(false)
const showClearCacheDialog = ref(false)
const showResetDialog = ref(false)
const storageUsage = ref('计算中...')
const cacheSize = ref('计算中...')

// 选择器选项
const scanDelayOptions = [
  { text: '500ms', value: 500 },
  { text: '1000ms', value: 1000 },
  { text: '1500ms', value: 1500 },
  { text: '2000ms', value: 2000 },
  { text: '3000ms', value: 3000 }
]

const syncIntervalOptions = [
  { text: '1分钟', value: 60000 },
  { text: '5分钟', value: 300000 },
  { text: '10分钟', value: 600000 },
  { text: '30分钟', value: 1800000 },
  { text: '1小时', value: 3600000 }
]

const batchSizeOptions = [
  { text: '10条', value: 10 },
  { text: '20条', value: 20 },
  { text: '50条', value: 50 },
  { text: '100条', value: 100 },
  { text: '200条', value: 200 }
]

const fontSizeOptions = [
  { text: '小', value: 'small' },
  { text: '中', value: 'medium' },
  { text: '大', value: 'large' },
  { text: '特大', value: 'extra-large' }
]

const retentionOptions = [
  { text: '7天', value: 7 },
  { text: '15天', value: 15 },
  { text: '30天', value: 30 },
  { text: '60天', value: 60 },
  { text: '90天', value: 90 }
]

const timeoutOptions = [
  { text: '5秒', value: 5000 },
  { text: '10秒', value: 10000 },
  { text: '15秒', value: 15000 },
  { text: '30秒', value: 30000 },
  { text: '60秒', value: 60000 }
]

const retryOptions = [
  { text: '1次', value: 1 },
  { text: '2次', value: 2 },
  { text: '3次', value: 3 },
  { text: '5次', value: 5 }
]

const barcodeFormats = [
  { text: 'Code 128', value: 'CODE_128' },
  { text: 'EAN-13', value: 'EAN_13' },
  { text: 'EAN-8', value: 'EAN_8' },
  { text: 'UPC-A', value: 'UPC_A' },
  { text: 'UPC-E', value: 'UPC_E' },
  { text: 'Code 39', value: 'CODE_39' },
  { text: 'Code 93', value: 'CODE_93' },
  { text: 'QR Code', value: 'QR_CODE' },
  { text: 'Data Matrix', value: 'DATA_MATRIX' },
  { text: 'PDF417', value: 'PDF_417' }
]

// 计算属性
const enabledFormatsCount = computed(() => {
  return settings.value.scanner.enabledFormats.length
})

// 同步设置的计算属性
const autoSync = computed({
  get: () => settings.value.sync?.autoSync ?? false,
  set: (value: boolean) => {
    if (!settings.value.sync) {
      settings.value.sync = {
        autoSync: value,
        wifiOnlySync: false,
        syncInterval: 300000,
        batchSize: 50
      }
    } else {
      settings.value.sync.autoSync = value
    }
  }
})

const wifiOnlySync = computed({
  get: () => settings.value.sync?.wifiOnlySync ?? false,
  set: (value: boolean) => {
    if (!settings.value.sync) {
      settings.value.sync = {
        autoSync: false,
        wifiOnlySync: value,
        syncInterval: 300000,
        batchSize: 50
      }
    } else {
      settings.value.sync.wifiOnlySync = value
    }
  }
})

// 方法
const handleBack = () => {
  router.push('/profile')
}

const saveSettings = async () => {
  try {
    await storageService.saveConfig(settings.value)
    // 应用设置到应用状态
    showToast('设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
    showToast('保存设置失败')
  }
}

const handleDarkModeChange = async (value: boolean) => {
  settings.value.display.darkMode = value
  
  // 应用深色模式
  if (value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  
  await saveSettings()
}

const handleKeepScreenOnChange = async (value: boolean) => {
  settings.value.display.keepScreenOn = value
  
  // 控制屏幕常亮
  if (value && 'wakeLock' in navigator) {
    try {
      await (navigator as any).wakeLock.request('screen')
    } catch (error) {
      console.error('请求屏幕常亮失败:', error)
    }
  }
  
  await saveSettings()
}

const toggleFormat = (format: string) => {
  const index = settings.value.scanner.enabledFormats.indexOf(format)
  if (index > -1) {
    settings.value.scanner.enabledFormats.splice(index, 1)
  } else {
    settings.value.scanner.enabledFormats.push(format)
  }
}

const clearCache = async () => {
  try {
    // 清理缓存逻辑
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }
    
    // 清理本地存储的临时数据
    // 由于没有clearCache方法，这里可以使用其他方法或暂时不执行清理
    // 这里可以根据实际需求实现缓存清理逻辑
    
    showToast('缓存已清理')
    await loadCacheSize()
  } catch (error) {
    console.error('清理缓存失败:', error)
    showToast('清理缓存失败')
  }
}

const resetSettings = async () => {
  try {
    // 重置为默认设置
    const defaultSettings: AppConfig = {
      apiBaseUrl: '',
      syncInterval: 300000,
      maxRetryAttempts: 3,
      offlineStorageLimit: 1000,
      scanner: {
        soundEnabled: true,
        vibrationEnabled: true,
        autoFocus: true,
        scanDelay: 1000,
        enabledFormats: ['CODE_128', 'EAN_13', 'EAN_8', 'QR_CODE']
      },
      sync: {
        autoSync: true,
        wifiOnlySync: false,
        syncInterval: 300000,
        batchSize: 50
      },
      display: {
        darkMode: false,
        fontSize: 'medium',
        keepScreenOn: false,
        showTaskStats: true
      },
      storage: {
        dataRetentionDays: 30,
        autoCleanup: true
      },
      network: {
        timeout: 10000,
        retryCount: 3,
        offlineMode: false
      }
    }
    
    settings.value = defaultSettings
    await saveSettings()
    showToast('设置已重置')
  } catch (error) {
    console.error('重置设置失败:', error)
    showToast('重置设置失败')
  }
}

const loadStorageUsage = async () => {
  try {
    const usage = await storageService.getStorageInfo()
    const totalMB = (usage.total / 1024 / 1024).toFixed(1)
    const usedMB = (usage.used / 1024 / 1024).toFixed(1)
    storageUsage.value = `${usedMB}MB / ${totalMB}MB`
  } catch (error) {
    console.error('获取存储使用情况失败:', error)
    storageUsage.value = '获取失败'
  }
}

const loadCacheSize = async () => {
  try {
    let totalSize = 0
    
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        for (const request of requests) {
          const response = await cache.match(request)
          if (response) {
            const blob = await response.blob()
            totalSize += blob.size
          }
        }
      }
    }
    
    const sizeMB = (totalSize / 1024 / 1024).toFixed(1)
    cacheSize.value = `${sizeMB}MB`
  } catch (error) {
    console.error('获取缓存大小失败:', error)
    cacheSize.value = '获取失败'
  }
}

// 选择器确认事件
const onScanDelayConfirm = ({ selectedOptions }: any) => {
  settings.value.scanner.scanDelay = selectedOptions[0].value
  showScanDelayPicker.value = false
  saveSettings()
}

const onSyncIntervalConfirm = ({ selectedOptions }: any) => {
  if (settings.value.sync) {
    settings.value.sync.syncInterval = selectedOptions[0].value
  } else {
    settings.value.sync = {
      autoSync: true,
      wifiOnlySync: false,
      syncInterval: selectedOptions[0].value,
      batchSize: 50
    }
  }
  showSyncIntervalPicker.value = false
  saveSettings()
}

const onBatchSizeConfirm = ({ selectedOptions }: any) => {
  if (settings.value.sync) {
    settings.value.sync.batchSize = selectedOptions[0].value
  } else {
    settings.value.sync = {
      autoSync: true,
      wifiOnlySync: false,
      syncInterval: 300000,
      batchSize: selectedOptions[0].value
    }
  }
  showBatchSizePicker.value = false
  saveSettings()
}

const onFontSizeConfirm = ({ selectedOptions }: any) => {
  settings.value.display.fontSize = selectedOptions[0].value
  showFontSizePicker.value = false
  
  // 应用字体大小
  document.documentElement.setAttribute('data-font-size', selectedOptions[0].value)
  
  saveSettings()
}

const onRetentionConfirm = ({ selectedOptions }: any) => {
  settings.value.storage.dataRetentionDays = selectedOptions[0].value
  showRetentionPicker.value = false
  saveSettings()
}

const onTimeoutConfirm = ({ selectedOptions }: any) => {
  settings.value.network.timeout = selectedOptions[0].value
  showTimeoutPicker.value = false
  saveSettings()
}

const onRetryConfirm = ({ selectedOptions }: any) => {
  settings.value.network.retryCount = selectedOptions[0].value
  showRetryPicker.value = false
  saveSettings()
}

// 工具方法
const getSyncIntervalText = (interval: number) => {
  const option = syncIntervalOptions.find(opt => opt.value === interval)
  return option ? option.text : `${interval / 1000}秒`
}

const getFontSizeText = (size: string) => {
  const option = fontSizeOptions.find(opt => opt.value === size)
  return option ? option.text : size
}

// 生命周期
onMounted(async () => {
  try {
    // 加载保存的设置
    const savedConfig = await storageService.getConfig()
    if (savedConfig) {
      settings.value = { ...settings.value, ...savedConfig }
    }
    
    // 应用当前设置
    if (settings.value.display.darkMode) {
      document.documentElement.classList.add('dark')
    }
    
    document.documentElement.setAttribute('data-font-size', settings.value.display.fontSize)
    
    // 加载存储和缓存信息
    await Promise.all([
      loadStorageUsage(),
      loadCacheSize()
    ])
  } catch (error) {
    console.error('加载设置失败:', error)
  }
})
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.settings-section {
  margin: 16px 0;
}

.settings-section h3 {
  margin: 0 0 8px 16px;
  font-size: 14px;
  color: #969799;
  font-weight: normal;
}

.barcode-formats-popup {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.barcode-formats-popup h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
  color: #323233;
}

.formats-list {
  flex: 1;
  overflow: auto;
}

/* 字体大小样式 */
:global([data-font-size="small"]) {
  font-size: 12px;
}

:global([data-font-size="medium"]) {
  font-size: 14px;
}

:global([data-font-size="large"]) {
  font-size: 16px;
}

:global([data-font-size="extra-large"]) {
  font-size: 18px;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .settings-container {
    background-color: #1a1a1a;
  }
  
  .settings-section h3 {
    color: #c8c9cc;
  }
}

:global(.dark) {
  background-color: #1a1a1a;
  color: #f0f0f0;
}

:global(.dark .van-cell) {
  background-color: #2d2d2d;
  color: #f0f0f0;
}

:global(.dark .van-cell-group) {
  background-color: #2d2d2d;
}

:global(.dark .van-nav-bar) {
  background-color: #2d2d2d;
  color: #f0f0f0;
}
</style>