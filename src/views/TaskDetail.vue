<template>
  <div class="task-detail-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="任务详情"
      left-text="返回"
      left-arrow
      @click-left="handleBack"
    >
      <template #right>
        <van-icon 
          name="scan" 
          @click="startScanning"
          v-if="canStartScanning"
        />
      </template>
    </van-nav-bar>

    <!-- 任务基本信息 -->
    <div class="task-info" v-if="currentTask">
      <van-cell-group inset>
        <van-cell title="任务编号" :value="currentTask.taskNo" />
        <van-cell title="任务状态">
          <template #value>
            <van-tag :type="getTaskStatusType(currentTask.status)">
              {{ getTaskStatusText(currentTask.status) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="优先级">
          <template #value>
            <van-tag :type="getPriorityType(currentTask.priority)">
              {{ getPriorityText(currentTask.priority) }}
            </van-tag>
          </template>
        </van-cell>
        <van-cell title="创建时间" :value="formatDateTime(currentTask.createdAt)" />
        <van-cell title="截止时间" :value="formatDateTime(currentTask.dueDate)" />
        <van-cell title="分拣员" :value="currentTask.assignedTo || '未分配'" />
        <van-cell title="备注" :value="currentTask.notes || '无'" />
      </van-cell-group>
    </div>

    <!-- 任务进度 -->
    <div class="task-progress" v-if="currentTask">
      <van-cell-group inset>
        <van-cell title="完成进度">
          <template #value>
            <div class="progress-info">
              <span>{{ taskProgress }}%</span>
              <van-progress 
                :percentage="taskProgress" 
                :color="getProgressColor(taskProgress)"
                :pivot-text="`${taskProgress}%`"
              />
            </div>
          </template>
        </van-cell>
        <van-cell title="商品总数" :value="`${currentTask.items.length} 种`" />
        <van-cell title="已完成" :value="`${completedItemsCount} 种`" />
        <van-cell title="剩余" :value="`${pendingItemsCount} 种`" />
      </van-cell-group>
    </div>

    <!-- 商品筛选 -->
    <div class="item-filter">
      <van-tabs v-model:active="activeFilter" @change="handleFilterChange">
        <van-tab title="全部" name="all">
          <template #title>
            全部 <van-badge :content="allItemsCount" v-if="allItemsCount > 0" />
          </template>
        </van-tab>
        <van-tab title="待分拣" name="pending">
          <template #title>
            待分拣 <van-badge :content="pendingItemsCount" v-if="pendingItemsCount > 0" />
          </template>
        </van-tab>
        <van-tab title="已完成" name="completed">
          <template #title>
            已完成 <van-badge :content="completedItemsCount" v-if="completedItemsCount > 0" />
          </template>
        </van-tab>
      </van-tabs>
    </div>

    <!-- 商品列表 -->
    <div class="item-list">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <div 
            v-for="item in filteredItems" 
            :key="item.id"
            class="item-card"
            @click="handleItemClick(item)"
          >
            <div class="item-header">
              <div class="item-title">
                <span class="item-name">{{ item.productName }}</span>
                <van-tag 
                  :type="getItemStatusType(item)"
                >
                  {{ getItemStatusText(item) }}
                </van-tag>
              </div>
              <div class="item-progress">
                <span class="progress-text">
                  {{ item.sortedQuantity }}/{{ item.quantity }}
                </span>
                <van-progress 
                  :percentage="getItemProgress(item)" 
                  :color="getItemProgressColor(item)"
                  :show-pivot="false"
                  stroke-width="4"
                />
              </div>
            </div>
            
            <div class="item-content">
              <div class="item-info">
                <div class="info-row">
                  <span class="label">SKU:</span>
                  <span class="value">{{ item.sku }}</span>
                </div>
                <div class="info-row">
                  <span class="label">条码:</span>
                  <span class="value">{{ item.barcode }}</span>
                </div>
                <div class="info-row">
                  <span class="label">位置:</span>
                  <span class="value">{{ item.location }}</span>
                </div>
                <div class="info-row" v-if="item.specifications">
                  <span class="label">规格:</span>
                  <span class="value">{{ item.specifications }}</span>
                </div>
              </div>
              
              <div class="item-actions">
                <van-button 
                  size="small" 
                  type="primary" 
                  icon="scan"
                  @click.stop="scanItem(item)"
                  :disabled="isItemCompleted(item)"
                >
                  扫描
                </van-button>
                <van-button 
                  size="small" 
                  type="primary" 
                  icon="edit"
                  @click.stop="editItem(item)"
                >
                  编辑
                </van-button>
              </div>
            </div>
          </div>
          
          <van-empty 
            v-if="filteredItems.length === 0 && !loading"
            description="暂无商品"
            image="search"
          />
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar" v-if="currentTask">
      <van-button 
        type="primary" 
        size="large" 
        icon="scan" 
        @click="startScanning"
        :disabled="!canStartScanning"
      >
        开始扫描
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

    <!-- 商品编辑弹窗 -->
    <van-popup
      v-model:show="showEditDialog"
      position="bottom"
      round
      closeable
    >
      <div class="edit-popup" v-if="editingItem">
        <h3>编辑商品</h3>
        
        <van-form @submit="saveItemEdit">
          <van-field
            v-model="editForm.sortedQuantity"
            name="sortedQuantity"
            label="已分拣数量"
            type="number"
            :min="0"
            :max="editingItem.quantity"
            placeholder="请输入已分拣数量"
            :rules="[{ required: true, message: '请输入已分拣数量' }]"
          />
          
          <van-field
            v-model="editForm.notes"
            name="notes"
            label="备注"
            type="textarea"
            placeholder="请输入备注信息"
            rows="3"
          />
          
          <div class="edit-actions">
            <van-button 
              type="default" 
              block 
              @click="showEditDialog = false"
            >
              取消
            </van-button>
            <van-button 
              type="primary" 
              block 
              native-type="submit"
            >
              保存
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 任务完成确认弹窗 -->
    <van-dialog
      v-model:show="showCompleteDialog"
      title="确认完成任务"
      message="确定要完成这个任务吗？完成后将无法继续编辑。"
      show-cancel-button
      @confirm="confirmCompleteTask"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores'
import { showToast } from 'vant'
import type { SortingItem, TaskStatus } from '@/types'
import { Priority } from '@/types'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 响应式数据
const refreshing = ref(false)
const loading = ref(false)
const finished = ref(false)
const activeFilter = ref<'all' | 'pending' | 'completed'>('all')
const showEditDialog = ref(false)
const showCompleteDialog = ref(false)
const editingItem = ref<SortingItem | null>(null)
const editForm = ref({
  sortedQuantity: 0,
  notes: ''
})

// 计算属性
const taskId = computed(() => route.params.taskId as string)
const currentTask = computed(() => appStore.currentTask)
const taskProgress = computed(() => appStore.currentTaskProgress)

const allItemsCount = computed(() => {
  return currentTask.value?.items.length || 0
})

const pendingItemsCount = computed(() => {
  return currentTask.value?.items.filter(item => item.sortedQuantity < item.quantity).length || 0
})

const completedItemsCount = computed(() => {
  return currentTask.value?.items.filter(item => item.sortedQuantity >= item.quantity).length || 0
})

const filteredItems = computed(() => {
  if (!currentTask.value) return []
  
  const items = currentTask.value.items
  
  switch (activeFilter.value) {
    case 'pending':
      return items.filter(item => item.sortedQuantity < item.quantity)
    case 'completed':
      return items.filter(item => item.sortedQuantity >= item.quantity)
    default:
      return items
  }
})

const canStartScanning = computed(() => {
  return currentTask.value && 
         currentTask.value.status !== 'completed' && 
         pendingItemsCount.value > 0
})

const canCompleteTask = computed(() => {
  return currentTask.value && 
         currentTask.value.status !== 'completed' && 
         pendingItemsCount.value === 0
})

// 方法
const handleBack = () => {
  router.push('/tasks')
}

const onRefresh = async () => {
  try {
    await appStore.refreshCurrentTask()
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

const handleFilterChange = (name: string | number) => {
  activeFilter.value = name as 'all' | 'pending' | 'completed'
}

const handleItemClick = (item: SortingItem) => {
  // 点击商品卡片的处理逻辑
  console.log('点击商品:', item)
}

const scanItem = (item: SortingItem) => {
  // 跳转到扫描页面，并传递商品信息
  router.push({
    path: `/tasks/${taskId.value}/scan`,
    query: { itemId: item.id }
  })
}

const editItem = (item: SortingItem) => {
  editingItem.value = item
  editForm.value = {
    sortedQuantity: item.sortedQuantity,
    notes: item.notes || ''
  }
  showEditDialog.value = true
}

const saveItemEdit = async () => {
  if (!editingItem.value) return
  
  try {
    await appStore.updateSortingItem(
      editingItem.value.id,
      {
        sortedQuantity: editForm.value.sortedQuantity,
        notes: editForm.value.notes
      }
    )
    
    showToast('保存成功')
    showEditDialog.value = false
    editingItem.value = null
  } catch (error) {
    showToast('保存失败')
  }
}

const startScanning = () => {
  if (!canStartScanning.value) return
  
  router.push(`/tasks/${taskId.value}/scan`)
}

const completeTask = () => {
  if (!canCompleteTask.value) return
  
  showCompleteDialog.value = true
}

const confirmCompleteTask = async () => {
  if (!currentTask.value) return
  
  try {
    await appStore.updateTaskStatus(
      currentTask.value.id,
      'completed',
      new Date().toISOString()
    )
    
    showToast('任务已完成')
    router.push('/tasks')
  } catch (error) {
    showToast('完成任务失败')
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

const getPriorityType = (priority: number) => {
  switch (priority) {
    case Priority.URGENT:
      return 'danger'
    case Priority.HIGH:
      return 'danger'
    case Priority.MEDIUM:
      return 'warning'
    case Priority.LOW:
      return 'default'
    default:
      return 'default'
  }
}

const getPriorityText = (priority: number) => {
  switch (priority) {
    case Priority.URGENT:
      return '紧急'
    case Priority.HIGH:
      return '高'
    case Priority.MEDIUM:
      return '中'
    case Priority.LOW:
      return '低'
    default:
      return '未知'
  }
}

const getProgressColor = (progress: number) => {
  if (progress < 30) return '#ee0a24'
  if (progress < 70) return '#ff976a'
  return '#07c160'
}

const getItemStatusType = (item: SortingItem) => {
  return isItemCompleted(item) ? 'success' : 'warning'
}

const getItemStatusText = (item: SortingItem) => {
  return isItemCompleted(item) ? '已完成' : '待分拣'
}

const getItemProgress = (item: SortingItem) => {
  return Math.round((item.sortedQuantity / item.quantity) * 100)
}

const getItemProgressColor = (item: SortingItem) => {
  const progress = getItemProgress(item)
  if (progress < 30) return '#ee0a24'
  if (progress < 70) return '#ff976a'
  return '#07c160'
}

const isItemCompleted = (item: SortingItem) => {
  return item.sortedQuantity >= item.quantity
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '无'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

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
  } catch (error) {
    console.error('加载任务详情失败:', error)
    showToast('加载任务详情失败')
    router.replace('/tasks')
  }
})
</script>

<style scoped>
.task-detail-container {
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

.task-info,
.task-progress {
  margin: 8px 0;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.item-filter {
  background-color: white;
  border-bottom: 1px solid #ebedf0;
}

.item-list {
  flex: 1;
  overflow: auto;
  padding: 8px 16px;
}

.item-card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.item-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.item-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.item-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-name {
  font-weight: bold;
  font-size: 16px;
}

.item-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 12px;
  color: #969799;
  align-self: flex-end;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  font-size: 14px;
}

.label {
  color: #969799;
  min-width: 50px;
}

.value {
  color: #323233;
  flex: 1;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.bottom-bar {
  display: flex;
  padding: 16px;
  gap: 16px;
  background-color: white;
  border-top: 1px solid #ebedf0;
}

.edit-popup {
  padding: 20px;
}

.edit-popup h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
}

.edit-actions {
  display: flex;
  gap: 16px;
  margin-top: 20px;
}

/* 移动端和PDA设备优化 */
@media screen and (max-width: 768px) {
  .task-info {
    padding: 12px;
  }
  
  .task-progress {
    padding: 12px;
  }
  
  .progress-stats {
    gap: 16px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .item-filter {
    padding: 8px 12px;
  }
  
  .item-card {
    margin: 6px 12px;
  }
  
  .bottom-bar {
    padding: 12px;
  }
}

/* PDA设备特殊优化 */
@media screen and (max-width: 480px) {
  .task-info {
    padding: 8px;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .task-progress {
    padding: 8px;
  }
  
  .progress-stats {
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .stat-number {
    font-size: 18px;
  }
  
  .stat-label {
    font-size: 11px;
  }
  
  .item-filter {
    padding: 6px 8px;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .item-card {
    margin: 4px 8px;
  }
  
  .item-content {
    flex-direction: column;
    gap: 8px;
  }
  
  .item-info {
    flex: 1;
  }
  
  .item-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .bottom-bar {
    padding: 8px;
    flex-direction: column;
    gap: 8px;
  }
  
  .bottom-bar .van-button {
    width: 100%;
  }
}

/* 横屏模式优化 */
@media screen and (orientation: landscape) and (max-height: 500px) {
  .task-info {
    padding: 8px 16px;
  }
  
  .task-progress {
    padding: 8px 16px;
  }
  
  .progress-stats {
    gap: 20px;
  }
  
  .stat-number {
    font-size: 16px;
    margin-bottom: 2px;
  }
  
  .stat-label {
    font-size: 10px;
  }
  
  .item-filter {
    padding: 6px 16px;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .task-detail-container {
    background-color: #1a1a1a;
  }
  
  .item-filter {
    background-color: #2d2d2d;
    border-bottom-color: #404040;
  }
  
  .item-card {
    background-color: #2d2d2d;
    box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1);
  }
  
  .item-card:hover {
    box-shadow: 0 4px 8px rgba(255, 255, 255, 0.15);
  }
  
  .bottom-bar {
    background-color: #2d2d2d;
    border-top-color: #404040;
  }
}
</style>