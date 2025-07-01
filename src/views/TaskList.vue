<template>
  <div class="task-list-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="分拣任务"
      left-text="退出"
      right-text="同步"
      left-arrow
      @click-left="handleLogout"
      @click-right="handleSync"
    >
      <template #right>
        <van-icon 
          name="refresh" 
          :class="{ 'rotating': appStore.isSyncing }"
          @click="handleSync"
        />
      </template>
    </van-nav-bar>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <van-tag :type="networkStatus.isOnline ? 'success' : 'warning'">
          {{ networkStatus.isOnline ? '在线' : '离线' }}
        </van-tag>
      </div>
      <div class="status-item" v-if="networkStatus.pendingSyncCount > 0">
        <van-tag type="danger">
          待同步: {{ networkStatus.pendingSyncCount }}
        </van-tag>
      </div>
      <div class="status-item" v-if="lastSyncTime">
        <span class="sync-time">{{ formatSyncTime(lastSyncTime) }}</span>
      </div>
    </div>

    <!-- 任务统计 -->
    <div class="task-stats">
      <div class="stat-item">
        <div class="stat-number">{{ pendingTasks.length }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ inProgressTasks.length }}</div>
        <div class="stat-label">进行中</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ completedTasks.length }}</div>
        <div class="stat-label">已完成</div>
      </div>
    </div>

    <!-- 任务筛选 -->
    <van-tabs v-model:active="activeTab" @change="handleTabChange">
      <van-tab title="全部" name="all"></van-tab>
      <van-tab title="待处理" name="pending"></van-tab>
      <van-tab title="进行中" name="in_progress"></van-tab>
      <van-tab title="已完成" name="completed"></van-tab>
    </van-tabs>

    <!-- 任务列表 -->
    <van-pull-refresh 
      v-model="refreshing" 
      @refresh="onRefresh"
      class="task-list"
    >
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div v-if="filteredTasks.length === 0" class="empty-state">
          <van-empty 
            image="search" 
            :description="getEmptyDescription()"
          />
        </div>
        
        <van-card
          v-for="task in filteredTasks"
          :key="task.id"
          :title="task.taskNo"
          :desc="task.warehouseName"
          :thumb="getTaskIcon(task.status)"
          @click="handleTaskClick(task)"
          class="task-card"
        >
          <template #tags>
            <van-tag 
              :type="getTaskStatusType(task.status)"
              size="medium"
            >
              {{ getTaskStatusText(task.status) }}
            </van-tag>
            <van-tag 
              v-if="task.priority > 1"
              type="danger"
              size="medium"
            >
              优先级: {{ task.priority }}
            </van-tag>
          </template>
          
          <template #footer>
            <div class="task-footer">
              <div class="task-info">
                <span>商品数: {{ task.items.length }}</span>
                <span v-if="task.status === 'in_progress'">
                  进度: {{ getTaskProgress(task) }}%
                </span>
              </div>
              <div class="task-time">
                {{ formatTaskTime(task) }}
              </div>
            </div>
          </template>
          
          <template #bottom>
            <div class="task-actions">
              <van-button 
                v-if="task.status === 'pending'"
                type="primary"
                size="small"
                @click.stop="startTask(task)"
              >
                开始分拣
              </van-button>
              <van-button 
                v-else-if="task.status === 'in_progress'"
                type="success"
                size="small"
                @click.stop="continueTask(task)"
              >
                继续分拣
              </van-button>
              <van-button 
                v-else-if="task.status === 'completed'"
                type="default"
                size="small"
                @click.stop="viewTask(task)"
              >
                查看详情
              </van-button>
            </div>
          </template>
        </van-card>
      </van-list>
    </van-pull-refresh>

    <!-- 底部导航 -->
    <van-tabbar v-model="activeBottomTab" @change="handleBottomTabChange">
      <van-tabbar-item icon="apps-o" name="tasks">任务</van-tabbar-item>
      <van-tabbar-item icon="exchange" name="sync">同步</van-tabbar-item>
      <van-tabbar-item icon="user-o" name="profile">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores'
import { showToast, showConfirmDialog } from 'vant'
import type { SortingTask, TaskStatus } from '@/types'

const router = useRouter()
const appStore = useAppStore()

// 响应式数据
const activeTab = ref('all')
const activeBottomTab = ref('tasks')
const refreshing = ref(false)
const loading = ref(false)
const finished = ref(true)

// 计算属性
const networkStatus = computed(() => appStore.networkStatus)
const lastSyncTime = computed(() => appStore.lastSyncTime)
const pendingTasks = computed(() => appStore.pendingTasks)
const inProgressTasks = computed(() => appStore.inProgressTasks)
const completedTasks = computed(() => appStore.completedTasks)

const filteredTasks = computed(() => {
  switch (activeTab.value) {
    case 'pending':
      return pendingTasks.value
    case 'in_progress':
      return inProgressTasks.value
    case 'completed':
      return completedTasks.value
    default:
      return appStore.tasks
  }
})

// 方法
const handleLogout = async () => {
  const result = await showConfirmDialog({
    title: '确认退出',
    message: '确定要退出登录吗？',
    confirmButtonText: '退出',
    cancelButtonText: '取消'
  })
  
  if (result) {
    await appStore.logout()
    router.replace('/login')
    showToast('已退出登录')
  }
}

const handleSync = async () => {
  if (appStore.isSyncing) {
    showToast('正在同步中...')
    return
  }
  
  if (!networkStatus.value.isOnline) {
    showToast('网络不可用，无法同步')
    return
  }
  
  try {
    await appStore.syncData()
    showToast('同步完成')
  } catch (error) {
    showToast('同步失败')
  }
}

const handleTabChange = (name: string) => {
  activeTab.value = name
}

const handleBottomTabChange = (name: string) => {
  switch (name) {
    case 'sync':
      router.push('/sync')
      break
    case 'profile':
      router.push('/profile')
      break
    default:
      break
  }
}

const onRefresh = async () => {
  try {
    await appStore.refreshTasks()
    showToast('刷新成功')
  } catch (error) {
    showToast('刷新失败')
  } finally {
    refreshing.value = false
  }
}

const onLoad = () => {
  // 这里可以实现分页加载
  loading.value = false
  finished.value = true
}

const handleTaskClick = (task: SortingTask) => {
  router.push(`/task/${task.id}`)
}

const startTask = async (task: SortingTask) => {
  try {
    await appStore.selectTask(task.id)
    router.push(`/scan/${task.id}`)
  } catch (error) {
    showToast('启动任务失败')
  }
}

const continueTask = async (task: SortingTask) => {
  try {
    await appStore.selectTask(task.id)
    router.push(`/scan/${task.id}`)
  } catch (error) {
    showToast('继续任务失败')
  }
}

const viewTask = (task: SortingTask) => {
  router.push(`/task/${task.id}`)
}

// 工具方法
const getTaskIcon = (status: TaskStatus) => {
  switch (status) {
    case 'pending':
      return 'clock-o'
    case 'in_progress':
      return 'play-circle-o'
    case 'completed':
      return 'checked'
    case 'synced':
      return 'success'
    default:
      return 'question-o'
  }
}

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

const getTaskProgress = (task: SortingTask) => {
  const totalItems = task.items.length
  const completedItems = task.items.filter(item => 
    item.sortedQuantity >= item.quantity
  ).length
  return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
}

const formatTaskTime = (task: SortingTask) => {
  if (task.completedAt) {
    return `完成于 ${new Date(task.completedAt).toLocaleString('zh-CN')}`
  } else if (task.status === 'in_progress') {
    return `开始于 ${new Date(task.updatedAt).toLocaleString('zh-CN')}`
  } else {
    return `创建于 ${new Date(task.createdAt).toLocaleString('zh-CN')}`
  }
}

const formatSyncTime = (timeStr: string) => {
  const now = new Date()
  const syncTime = new Date(timeStr)
  const diffMs = now.getTime() - syncTime.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) {
    return '刚刚同步'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前同步`
  } else {
    return syncTime.toLocaleString('zh-CN')
  }
}

const getEmptyDescription = () => {
  switch (activeTab.value) {
    case 'pending':
      return '暂无待处理任务'
    case 'in_progress':
      return '暂无进行中任务'
    case 'completed':
      return '暂无已完成任务'
    default:
      return '暂无任务数据'
  }
}

// 生命周期
onMounted(async () => {
  if (!appStore.isLoggedIn) {
    router.replace('/login')
    return
  }
  
  // 初始化应用数据
  await appStore.initApp()
  
  // 尝试刷新任务列表
  if (networkStatus.value.isOnline) {
    appStore.refreshTasks()
  }
})

onUnmounted(() => {
  // 清理工作
})
</script>

<style scoped>
.task-list-container {
  height: 100vh;
  height: 100dvh; /* 动态视口高度 */
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.status-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #ebedf0;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
}

.sync-time {
  font-size: 12px;
  color: #969799;
}

.task-stats {
  display: flex;
  background-color: white;
  padding: 16px;
  margin-bottom: 8px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #1989fa;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #969799;
}

.task-list {
  flex: 1;
  overflow: auto;
}

.task-card {
  margin: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.task-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #969799;
}

.task-time {
  font-size: 12px;
  color: #969799;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.empty-state {
  padding: 40px 20px;
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

/* 移动端和PDA设备优化 */
@media screen and (max-width: 768px) {
  .status-bar {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .task-stats {
    padding: 12px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .task-card {
    margin: 6px 12px;
  }
}

/* PDA设备特殊优化 */
@media screen and (max-width: 480px) {
  .status-bar {
    padding: 4px 8px;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .task-stats {
    padding: 8px;
  }
  
  .stat-number {
    font-size: 18px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  .task-card {
    margin: 4px 8px;
  }
  
  .task-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .task-info {
    flex-direction: column;
    gap: 4px;
  }
}

/* 横屏模式优化 */
@media screen and (orientation: landscape) and (max-height: 500px) {
  .task-stats {
    padding: 8px 16px;
  }
  
  .stat-number {
    font-size: 16px;
    margin-bottom: 2px;
  }
  
  .stat-label {
    font-size: 10px;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .task-list-container {
    background-color: #1a1a1a;
  }
  
  .status-bar {
    background-color: #2d2d2d;
    border-bottom-color: #404040;
  }
  
  .task-stats {
    background-color: #2d2d2d;
  }
}
</style>