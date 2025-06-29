<template>
  <div class="scanner-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="条码扫描"
      left-text="返回"
      left-arrow
      @click-left="handleBack"
    >
      <template #right>
        <van-icon 
          name="setting-o" 
          @click="showSettings = true"
        />
      </template>
    </van-nav-bar>

    <!-- 任务信息 -->
    <div class="task-info" v-if="currentTask">
      <div class="task-header">
        <div class="task-title">
          <span>任务编号: {{ currentTask.taskNo }}</span>
          <van-tag :type="getTaskStatusType(currentTask.status)">
            {{ getTaskStatusText(currentTask.status) }}
          </van-tag>
        </div>
        <div class="task-progress">
          <span>进度: {{ taskProgress }}%</span>
          <van-progress 
            :percentage="taskProgress" 
            :color="getProgressColor(taskProgress)"
            :pivot-text="`${taskProgress}%`"
          />
        </div>
      </div>
    </div>

    <!-- 扫描区域 -->
    <div class="scanner-view">
      <!-- 摄像头视图 -->
      <div class="camera-container" v-if="scanMode === 'camera'">
        <video ref="videoElement" class="camera-view"></video>
        <div class="scan-overlay">
          <div class="scan-frame"></div>
          <div class="scan-line"></div>
        </div>
      </div>

      <!-- 手动输入 -->
      <div class="manual-input" v-else>
        <van-field
          v-model="manualBarcode"
          label="条码"
          placeholder="请输入商品条码"
          clearable
          @keyup.enter="handleManualScan"
        >
          <template #button>
            <van-button size="small" type="primary" @click="handleManualScan">
              确认
            </van-button>
          </template>
        </van-field>
      </div>

      <!-- 扫描控制按钮 -->
      <div class="scan-controls">
        <van-button 
          type="primary" 
          size="large" 
          icon="scan" 
          :disabled="scanMode === 'camera'"
          @click="startCameraScan"
        >
          相机扫描
        </van-button>
        <van-button 
          type="primary" 
          size="large" 
          icon="edit" 
          :disabled="scanMode === 'manual'"
          @click="switchToManualInput"
        >
          手动输入
        </van-button>
      </div>
    </div>

    <!-- 扫描结果 -->
    <div class="scan-results">
      <div class="result-header">
        <h3>扫描记录</h3>
        <van-button 
          v-if="scanResults.length > 0"
          size="small" 
          type="danger" 
          @click="clearResults"
        >
          清空
        </van-button>
      </div>

      <van-empty 
        v-if="scanResults.length === 0"
        description="暂无扫描记录"
        image="search"
      />

      <div class="result-list" v-else>
        <div 
          v-for="(result, index) in scanResults" 
          :key="index"
          :class="['result-item', result.isValid ? 'valid' : 'invalid']"
        >
          <div class="result-icon">
            <van-icon 
              :name="result.isValid ? 'success' : 'cross'" 
              :color="result.isValid ? '#07c160' : '#ee0a24'"
              size="20"
            />
          </div>
          <div class="result-content">
            <div class="result-barcode">{{ result.barcode }}</div>
            <div class="result-message">
              {{ result.isValid ? '匹配成功' : result.errorMessage || '匹配失败' }}
            </div>
            <div class="result-time">{{ formatTime(result.time) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <van-button 
        type="warning" 
        size="large" 
        icon="close" 
        @click="handleBack"
      >
        退出扫描
      </van-button>
      <van-button 
        type="success" 
        size="large" 
        icon="checked" 
        @click="completeTask"
        :disabled="!canCompleteTask"
      >
        完成任务
      </van-button>
    </div>

    <!-- 设置弹窗 -->
    <van-popup
      v-model:show="showSettings"
      position="bottom"
      round
      closeable
    >
      <div class="settings-popup">
        <h3>扫描设置</h3>
        
        <van-cell-group inset>
          <van-cell title="摄像头选择" v-if="cameraDevices.length > 1">
            <template #right-icon>
              <van-dropdown-menu>
                <van-dropdown-item v-model="selectedCamera" :options="cameraOptions" />
              </van-dropdown-menu>
            </template>
          </van-cell>
          
          <van-cell title="闪光灯">
            <template #right-icon>
              <van-switch v-model="flashEnabled" :disabled="!hasFlashlight" />
            </template>
          </van-cell>
          
          <van-cell title="声音提示">
            <template #right-icon>
              <van-switch v-model="soundEnabled" />
            </template>
          </van-cell>
          
          <van-cell title="振动提示">
            <template #right-icon>
              <van-switch v-model="vibrationEnabled" />
            </template>
          </van-cell>
        </van-cell-group>
        
        <div class="settings-actions">
          <van-button type="primary" block @click="showSettings = false">
            确定
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 扫描成功弹窗 -->
    <van-popup
      v-model:show="showScanSuccess"
      round
      closeable
      :style="{ width: '80%' }"
    >
      <div class="scan-success-popup">
        <van-icon name="success" size="48" color="#07c160" />
        <h3>扫描成功</h3>
        <p>{{ lastScannedItem?.productName }}</p>
        <p>SKU: {{ lastScannedItem?.sku }}</p>
        <p>条码: {{ lastScannedBarcode }}</p>
        <p>位置: {{ lastScannedItem?.location }}</p>
        <div class="success-actions">
          <van-button type="primary" block @click="showScanSuccess = false">
            继续扫描
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores'
import { scannerService } from '@/services/scanner'
import { showToast } from 'vant'
import type { TaskStatus, SortingItem } from '@/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 响应式数据
const videoElement = ref<HTMLVideoElement | null>(null)
const scanMode = ref<'camera' | 'manual'>('camera')
const manualBarcode = ref('')
const scanResults = ref<Array<{barcode: string; isValid: boolean; errorMessage?: string; time: Date}>>([]) 
const showSettings = ref(false)
const showScanSuccess = ref(false)
const cameraDevices = ref<MediaDeviceInfo[]>([])
const selectedCamera = ref('')
const flashEnabled = ref(false)
const soundEnabled = ref(true)
const vibrationEnabled = ref(true)
const hasFlashlight = ref(false)
const lastScannedBarcode = ref('')
const lastScannedItem = ref<SortingItem | null>(null)

// 计算属性
const taskId = computed(() => route.params.taskId as string)
const currentTask = computed(() => appStore.currentTask)
const taskProgress = computed(() => appStore.currentTaskProgress)
const canCompleteTask = computed(() => {
  if (!currentTask.value) return false
  return currentTask.value.items.every(item => item.sortedQuantity >= item.quantity)
})

const cameraOptions = computed(() => {
  return cameraDevices.value.map(device => ({
    text: device.label || `摄像头 ${device.deviceId.substring(0, 5)}...`,
    value: device.deviceId
  }))
})

// 方法
const handleBack = async () => {
  // 停止扫描
  stopScanner()
  
  // 返回任务列表
  router.push('/tasks')
}

const startCameraScan = async () => {
  scanMode.value = 'camera'
  
  try {
    // 检查摄像头权限
    const hasPermission = await scannerService.checkCameraPermission()
    if (!hasPermission) {
      showToast('无法访问摄像头，请检查权限设置')
      switchToManualInput()
      return
    }
    
    // 获取摄像头设备
    if (cameraDevices.value.length === 0) {
      cameraDevices.value = await scannerService.getVideoDevices()
      if (cameraDevices.value.length > 0) {
        selectedCamera.value = cameraDevices.value[0].deviceId
      }
    }
    
    // 启动扫描
    if (videoElement.value) {
      await scannerService.startScan(
        videoElement.value, 
        selectedCamera.value || undefined
      )
      
      // 检查闪光灯支持
      hasFlashlight.value = scannerService.hasFlashlight()
      
      // 添加扫描监听
      scannerService.addScanListener(handleScanResult)
      scannerService.addErrorListener(handleScanError)
    }
  } catch (error) {
    console.error('启动扫描失败:', error)
    showToast('启动扫描失败，请尝试手动输入')
    switchToManualInput()
  }
}

const switchToManualInput = () => {
  stopScanner()
  scanMode.value = 'manual'
  manualBarcode.value = ''
}

const stopScanner = () => {
  scannerService.removeScanListener(handleScanResult)
  scannerService.removeErrorListener(handleScanError)
  scannerService.stopScan()
}

const handleScanResult = async (barcode: string) => {
  // 播放声音和振动反馈
  if (soundEnabled.value) {
    playBeepSound()
  }
  
  if (vibrationEnabled.value && navigator.vibrate) {
    navigator.vibrate(100)
  }
  
  // 处理扫描结果
  try {
    const result = await appStore.processScan(barcode)
    
    if (result.success) {
      // 添加到扫描结果列表
      scanResults.value.unshift({
        barcode,
        isValid: true,
        time: new Date()
      })
      
      // 显示成功弹窗
      lastScannedBarcode.value = barcode
      lastScannedItem.value = result.item
      showScanSuccess.value = true
      
      // 3秒后自动关闭成功弹窗
      setTimeout(() => {
        showScanSuccess.value = false
      }, 3000)
    }
  } catch (error) {
    // 添加到扫描结果列表
    scanResults.value.unshift({
      barcode,
      isValid: false,
      errorMessage: error instanceof Error ? error.message : '扫描失败',
      time: new Date()
    })
    
    // 显示错误提示
    showToast({
      type: 'fail',
      message: error instanceof Error ? error.message : '扫描失败'
    })
  }
}

const handleScanError = (error: Error) => {
  console.error('扫描错误:', error)
}

const handleManualScan = async () => {
  if (!manualBarcode.value) {
    showToast('请输入条码')
    return
  }
  
  // 验证条码格式
  const validation = scannerService.validateBarcode(manualBarcode.value)
  if (!validation.isValid) {
    showToast(validation.error || '条码格式无效')
    return
  }
  
  // 处理扫描结果
  await handleScanResult(manualBarcode.value)
  
  // 清空输入框
  manualBarcode.value = ''
}

const clearResults = () => {
  scanResults.value = []
}

const completeTask = async () => {
  if (!currentTask.value) return
  
  try {
    await appStore.updateTaskStatus(
      currentTask.value.id,
      'completed',
      new Date().toISOString()
    )
    
    showToast({
      type: 'success',
      message: '任务已完成'
    })
    
    // 返回任务列表
    router.push('/tasks')
  } catch (error) {
    showToast({
      type: 'fail',
      message: '完成任务失败'
    })
  }
}

const playBeepSound = () => {
  try {
    const audio = new Audio('/beep.mp3')
    audio.play()
  } catch (error) {
    console.error('播放声音失败:', error)
  }
}

// 工具方法
const getTaskStatusType = (status: TaskStatus) => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'in_progress':
      return 'primary'
    case 'completed':
      return 'success'
    case 'synced':
      return 'success'
    default:
      return 'default'
  }
}

const getTaskStatusText = (status: TaskStatus) => {
  switch (status) {
    case 'pending':
      return '待处理'
    case 'in_progress':
      return '进行中'
    case 'completed':
      return '已完成'
    case 'synced':
      return '已同步'
    default:
      return '未知'
  }
}

const getProgressColor = (progress: number) => {
  if (progress < 30) return '#ee0a24'
  if (progress < 70) return '#ff976a'
  return '#07c160'
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN')
}

// 监听器
watch(selectedCamera, async (newValue) => {
  if (scanMode.value === 'camera' && newValue) {
    // 重启扫描器使用新选择的摄像头
    stopScanner()
    await startCameraScan()
  }
})

watch(flashEnabled, async (newValue) => {
  if (hasFlashlight.value) {
    try {
      await scannerService.toggleFlashlight(newValue)
    } catch (error) {
      console.error('切换闪光灯失败:', error)
      showToast('切换闪光灯失败')
      flashEnabled.value = false
    }
  }
})

// 生命周期
onMounted(async () => {
  if (!appStore.isLoggedIn) {
    router.replace('/login')
    return
  }
  
  // 检查任务ID
  if (!taskId.value) {
    showToast('任务ID无效')
    router.replace('/tasks')
    return
  }
  
  // 选择任务
  try {
    await appStore.selectTask(taskId.value)
    
    if (!currentTask.value) {
      showToast('任务不存在')
      router.replace('/tasks')
      return
    }
    
    // 启动扫描
    await startCameraScan()
  } catch (error) {
    console.error('初始化扫描页面失败:', error)
    showToast('初始化失败')
    router.replace('/tasks')
  }
})

onUnmounted(() => {
  // 停止扫描
  stopScanner()
})
</script>

<style scoped>
.scanner-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
}

.task-info {
  background-color: white;
  padding: 12px 16px;
  border-bottom: 1px solid #ebedf0;
}

.task-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scanner-view {
  flex: 0 0 auto;
  position: relative;
  background-color: #000;
}

.camera-container {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}

.camera-view {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.scan-frame {
  width: 200px;
  height: 200px;
  border: 2px solid #1989fa;
  border-radius: 16px;
  box-shadow: 0 0 0 5000px rgba(0, 0, 0, 0.5);
}

.scan-line {
  position: absolute;
  width: 200px;
  height: 2px;
  background-color: #1989fa;
  animation: scan-animation 2s infinite;
}

@keyframes scan-animation {
  0% {
    transform: translateY(-100px);
  }
  50% {
    transform: translateY(100px);
  }
  100% {
    transform: translateY(-100px);
  }
}

.manual-input {
  padding: 16px;
  background-color: white;
}

.scan-controls {
  display: flex;
  padding: 8px 16px;
  gap: 8px;
  background-color: white;
}

.scan-results {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background-color: white;
  margin-top: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  padding: 12px;
  border-radius: 8px;
  background-color: #f7f8fa;
  gap: 12px;
}

.result-item.valid {
  border-left: 4px solid #07c160;
}

.result-item.invalid {
  border-left: 4px solid #ee0a24;
}

.result-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-content {
  flex: 1;
}

.result-barcode {
  font-weight: bold;
  margin-bottom: 4px;
}

.result-message {
  font-size: 12px;
  color: #969799;
  margin-bottom: 4px;
}

.result-time {
  font-size: 12px;
  color: #969799;
}

.bottom-bar {
  display: flex;
  padding: 16px;
  gap: 16px;
  background-color: white;
  border-top: 1px solid #ebedf0;
}

.settings-popup {
  padding: 20px;
}

.settings-popup h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
}

.settings-actions {
  margin-top: 20px;
}

.scan-success-popup {
  padding: 24px;
  text-align: center;
}

.scan-success-popup h3 {
  margin: 16px 0;
}

.scan-success-popup p {
  margin: 8px 0;
  color: #323233;
}

.success-actions {
  margin-top: 24px;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .scanner-container {
    background-color: #1a1a1a;
  }
  
  .task-info {
    background-color: #2d2d2d;
    border-bottom-color: #404040;
  }
  
  .manual-input,
  .scan-controls,
  .scan-results,
  .bottom-bar {
    background-color: #2d2d2d;
  }
  
  .result-item {
    background-color: #3d3d3d;
  }
}
</style>