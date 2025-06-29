import { defineStore } from 'pinia'
import type { SortingTask, SortingItem, ScanRecord, User, NetworkStatus, TaskStatus } from '@/types'
import { storageService } from '@/services/storage'
import { syncService } from '@/services/sync'
import { apiService } from '@/services/api'

// 主应用状态
export const useAppStore = defineStore('app', {
  state: () => ({
    // 用户信息
    user: null as User | null,
    isLoggedIn: false,
    
    // 任务数据
    tasks: [] as SortingTask[],
    currentTask: null as SortingTask | null,
    
    // 扫描记录
    scanRecords: [] as ScanRecord[],
    
    // 网络状态
    networkStatus: {
      isOnline: navigator.onLine,
      lastOnlineTime: new Date().toISOString(),
      pendingSyncCount: 0
    } as NetworkStatus,
    
    // 应用状态
    isLoading: false,
    error: null as string | null,
    
    // 同步状态
    isSyncing: false,
    lastSyncTime: null as string | null
  }),
  
  getters: {
    // 获取待处理任务
    pendingTasks: (state) => 
      state.tasks.filter(task => task.status === 'pending'),
    
    // 获取进行中任务
    inProgressTasks: (state) => 
      state.tasks.filter(task => task.status === 'in_progress'),
    
    // 获取已完成任务
    completedTasks: (state) => 
      state.tasks.filter(task => task.status === 'completed'),
    
    // 获取当前任务的未完成商品
    currentTaskPendingItems: (state) => {
      if (!state.currentTask) return []
      return state.currentTask.items.filter(item => 
        item.sortedQuantity < item.quantity
      )
    },
    
    // 获取当前任务进度
    currentTaskProgress: (state) => {
      if (!state.currentTask) return 0
      const totalItems = state.currentTask.items.length
      const completedItems = state.currentTask.items.filter(item => 
        item.sortedQuantity >= item.quantity
      ).length
      return totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    },
    
    // 检查是否有待同步数据
    hasPendingSync: (state) => state.networkStatus.pendingSyncCount > 0,
    
    // 获取待同步数量
    pendingSyncCount: (state) => state.networkStatus.pendingSyncCount
  },
  
  actions: {
    // 初始化应用
    async initApp() {
      this.isLoading = true
      try {
        // 加载用户信息
        const user = await storageService.getUser()
        if (user) {
          this.user = user
          this.isLoggedIn = true
        }
        
        // 加载任务数据
        await this.loadTasks()
        
        // 加载扫描记录
        await this.loadScanRecords()
        
        // 加载同步状态
        await this.loadSyncStatus()
        
        // 初始化网络状态监听
        this.initNetworkListener()
        
        // 初始化同步监听
        this.initSyncListener()
        
      } catch (error) {
        console.error('应用初始化失败:', error)
        this.error = '应用初始化失败'
      } finally {
        this.isLoading = false
      }
    },
    
    // 用户登录
    async login(username: string, password: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiService.login(username, password)
        if (response.success && response.data) {
          this.user = response.data
          this.isLoggedIn = true
          await storageService.saveUser(response.data)
          
          // 登录后同步数据
          await this.syncData()
        } else {
          throw new Error(response.message || '登录失败')
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : '登录失败'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    // 用户登出
    async logout() {
      try {
        await apiService.logout()
      } catch (error) {
        console.error('登出请求失败:', error)
      } finally {
        this.user = null
        this.isLoggedIn = false
        this.tasks = []
        this.currentTask = null
        this.scanRecords = []
        await storageService.clearUser()
      }
    },
    
    // 加载任务列表
    async loadTasks() {
      try {
        this.tasks = await storageService.getTasks()
      } catch (error) {
        console.error('加载任务失败:', error)
        this.error = '加载任务失败'
      }
    },
    
    // 刷新任务列表
    async refreshTasks() {
      if (!this.user || !navigator.onLine) {
        await this.loadTasks()
        return
      }
      
      this.isLoading = true
      try {
        const response = await apiService.getTasks(this.user.id)
        if (response.success && response.data) {
          this.tasks = response.data
          await storageService.saveTasks(response.data)
        }
      } catch (error) {
        console.error('刷新任务失败:', error)
        this.error = '刷新任务失败'
        // 失败时加载本地数据
        await this.loadTasks()
      } finally {
        this.isLoading = false
      }
    },
    
    // 选择当前任务
    async selectTask(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId)
      if (task) {
        this.currentTask = task
        
        // 如果任务状态是待处理，更新为进行中
        if (task.status === 'pending') {
          await this.updateTaskStatus(taskId, 'in_progress')
        }
      }
    },
    
    // 更新任务状态
    async updateTaskStatus(taskId: string, status: TaskStatus, completedAt?: string) {
      try {
        const task = this.tasks.find(t => t.id === taskId)
        if (!task) return
        
        task.status = status
        task.updatedAt = new Date().toISOString()
        
        if (completedAt) {
          task.completedAt = completedAt
        }
        
        // 更新当前任务
        if (this.currentTask && this.currentTask.id === taskId) {
          this.currentTask = { ...task }
        }
        
        // 保存到本地
        await storageService.updateTask(task)
        
        // 如果在线，尝试同步到服务器
        if (navigator.onLine) {
          try {
            await apiService.updateTaskStatus(taskId, status, completedAt)
            task.syncedAt = new Date().toISOString()
            await storageService.updateTask(task)
          } catch (error) {
            console.error('同步任务状态失败:', error)
            // 添加到待同步队列
            await this.addToPendingSync()
          }
        } else {
          // 离线时添加到待同步队列
          await this.addToPendingSync()
        }
      } catch (error) {
        console.error('更新任务状态失败:', error)
        this.error = '更新任务状态失败'
      }
    },
    
    // 处理条码扫描
    async processScan(barcode: string) {
      if (!this.currentTask) {
        throw new Error('请先选择任务')
      }
      
      const scanRecord: ScanRecord = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId: this.currentTask.id,
        itemId: '',
        barcode: barcode.trim(),
        scannedAt: new Date().toISOString(),
        isValid: false
      }
      
      try {
        // 验证条码
        const item = this.currentTask.items.find(item => 
          item.barcode === barcode || item.sku === barcode
        )
        
        if (!item) {
          scanRecord.isValid = false
          scanRecord.errorMessage = '条码不匹配任何商品'
          throw new Error('条码不匹配任何商品')
        }
        
        if (item.sortedQuantity >= item.quantity) {
          scanRecord.isValid = false
          scanRecord.errorMessage = '该商品已完成分拣'
          throw new Error('该商品已完成分拣')
        }
        
        // 更新商品分拣数量
        item.sortedQuantity += 1
        item.status = item.sortedQuantity >= item.quantity ? 'completed' : 'in_progress'
        item.scannedAt = scanRecord.scannedAt
        
        scanRecord.itemId = item.id
        scanRecord.isValid = true
        
        // 检查任务是否完成
        const allItemsCompleted = this.currentTask.items.every(item => 
          item.sortedQuantity >= item.quantity
        )
        
        if (allItemsCompleted) {
          await this.updateTaskStatus(
            this.currentTask.id, 
            'completed', 
            new Date().toISOString()
          )
        } else {
          await this.updateTaskStatus(this.currentTask.id, 'in_progress')
        }
        
        // 保存扫描记录
        await this.saveScanRecord(scanRecord)
        
        return { success: true, item }
      } catch (error) {
        // 保存失败的扫描记录
        await this.saveScanRecord(scanRecord)
        throw error
      }
    },
    
    // 保存扫描记录
    async saveScanRecord(record: ScanRecord) {
      try {
        this.scanRecords.push(record)
        await storageService.saveScanRecord(record)
        
        // 如果在线，尝试立即上传
        if (navigator.onLine) {
          try {
            await apiService.submitScanRecord(record)
          } catch (error) {
            console.error('上传扫描记录失败:', error)
            await this.addToPendingSync()
          }
        } else {
          await this.addToPendingSync()
        }
      } catch (error) {
        console.error('保存扫描记录失败:', error)
        throw error
      }
    },
    
    // 加载扫描记录
    async loadScanRecords() {
      try {
        this.scanRecords = await storageService.getScanRecords()
      } catch (error) {
        console.error('加载扫描记录失败:', error)
      }
    },
    
    // 同步数据
    async syncData() {
      try {
        await syncService.syncData()
        await this.loadSyncStatus()
      } catch (error) {
        console.error('同步数据失败:', error)
        this.error = '同步数据失败'
      }
    },
    
    // 加载同步状态
    async loadSyncStatus() {
      try {
        const status = await syncService.getSyncStatus()
        this.isSyncing = status.isSyncing
        this.lastSyncTime = status.lastSyncTime
        this.networkStatus.pendingSyncCount = status.pendingCount
      } catch (error) {
        console.error('加载同步状态失败:', error)
      }
    },
    
    // 添加到待同步队列
    async addToPendingSync() {
      try {
        const unSyncedTasks = this.tasks.filter(task => 
          task.status === 'completed' && !task.syncedAt
        )
        await syncService.savePendingData(unSyncedTasks, this.scanRecords)
        this.networkStatus.pendingSyncCount = unSyncedTasks.length + this.scanRecords.length
      } catch (error) {
        console.error('添加待同步数据失败:', error)
      }
    },
    
    // 初始化网络状态监听
    initNetworkListener() {
      const updateNetworkStatus = () => {
        this.networkStatus.isOnline = navigator.onLine
        if (navigator.onLine) {
          this.networkStatus.lastOnlineTime = new Date().toISOString()
        }
      }
      
      window.addEventListener('online', updateNetworkStatus)
      window.addEventListener('offline', updateNetworkStatus)
    },
    
    // 初始化同步监听
    initSyncListener() {
      syncService.addSyncListener((status) => {
        this.isSyncing = status.isSyncing
        this.lastSyncTime = status.lastSyncTime
        this.networkStatus.pendingSyncCount = status.pendingCount
        
        if (status.error) {
          this.error = status.error
        }
      })
    },
    
    // 清除错误
    clearError() {
      this.error = null
    },
    
    // 刷新当前任务
    async refreshCurrentTask() {
      if (!this.currentTask) return
      
      try {
        if (navigator.onLine && this.user) {
          const response = await apiService.getTask(this.currentTask.id)
          if (response.success && response.data) {
            this.currentTask = response.data
            // 更新任务列表中的对应任务
            const taskIndex = this.tasks.findIndex(t => t.id === this.currentTask!.id)
            if (taskIndex !== -1) {
              this.tasks[taskIndex] = response.data
            }
            await storageService.updateTask(response.data)
          }
        } else {
          // 离线时从本地存储刷新
          const task = this.tasks.find(t => t.id === this.currentTask!.id)
          if (task) {
            this.currentTask = { ...task }
          }
        }
      } catch (error) {
        console.error('刷新当前任务失败:', error)
        this.error = '刷新任务失败'
      }
    },
    
    // 更新分拣商品项
    async updateSortingItem(itemId: string, updates: Partial<SortingItem>) {
      if (!this.currentTask) return
      
      try {
        const itemIndex = this.currentTask.items.findIndex(item => item.id === itemId)
        if (itemIndex === -1) {
          throw new Error('商品项不存在')
        }
        
        // 更新商品项
        this.currentTask.items[itemIndex] = {
          ...this.currentTask.items[itemIndex],
          ...updates
        }
        
        // 更新任务的更新时间
        this.currentTask.updatedAt = new Date().toISOString()
        
        // 更新任务列表中的对应任务
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentTask!.id)
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = { ...this.currentTask }
        }
        
        // 保存到本地
        await storageService.updateTask(this.currentTask)
        
        // 如果在线，尝试同步到服务器
        if (navigator.onLine) {
          try {
            await apiService.updateSortingItem(itemId, updates)
            this.currentTask.syncedAt = new Date().toISOString()
            await storageService.updateTask(this.currentTask)
          } catch (error) {
            console.error('同步商品项更新失败:', error)
            await this.addToPendingSync()
          }
        } else {
          await this.addToPendingSync()
        }
      } catch (error) {
        console.error('更新商品项失败:', error)
        this.error = '更新商品项失败'
        throw error
      }
    }
  }
})