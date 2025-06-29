import { storageService } from './storage'
import { apiService } from './api'
import type { SortingTask, ScanRecord, SyncData } from '@/types'

// 同步状态接口
interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  pendingCount: number
  error?: string
}

class SyncService {
  private syncInProgress = false
  private syncInterval: number | null = null
  private retryAttempts = 0
  private maxRetryAttempts = 3
  private syncCallbacks: Array<(status: SyncStatus) => void> = []

  constructor() {
    this.initNetworkListener()
    this.startAutoSync()
  }

  // 初始化网络状态监听
  private initNetworkListener(): void {
    window.addEventListener('online', () => {
      console.log('网络已连接，开始同步数据')
      this.syncData()
    })

    window.addEventListener('offline', () => {
      console.log('网络已断开，停止同步')
      this.stopAutoSync()
    })
  }

  // 开始自动同步
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    // 每30秒同步一次
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncData()
      }
    }, 30000)
  }

  // 停止自动同步
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // 添加同步状态监听器
  addSyncListener(callback: (status: SyncStatus) => void): void {
    this.syncCallbacks.push(callback)
  }

  // 移除同步状态监听器
  removeSyncListener(callback: (status: SyncStatus) => void): void {
    const index = this.syncCallbacks.findIndex(cb => cb === callback)
    if (index > -1) {
      this.syncCallbacks.splice(index, 1)
    }
  }

  // 通知同步状态变化
  private notifySyncStatus(status: Partial<SyncStatus>): void {
    const fullStatus: SyncStatus = {
      isOnline: navigator.onLine,
      isSyncing: this.syncInProgress,
      lastSyncTime: localStorage.getItem('lastSyncTime'),
      pendingCount: 0,
      ...status
    }

    this.syncCallbacks.forEach(callback => {
      try {
        callback(fullStatus)
      } catch (error) {
        console.error('同步状态回调执行失败:', error)
      }
    })
  }

  // 主同步方法
  async syncData(force: boolean = false): Promise<boolean> {
    if (this.syncInProgress && !force) {
      console.log('同步正在进行中，跳过本次同步')
      return false
    }

    if (!navigator.onLine) {
      console.log('网络未连接，无法同步')
      this.notifySyncStatus({ error: '网络未连接' })
      return false
    }

    this.syncInProgress = true
    this.notifySyncStatus({ isSyncing: true })

    try {
      // 1. 上传本地数据
      const uploadSuccess = await this.uploadLocalData()
      if (!uploadSuccess) {
        throw new Error('上传本地数据失败')
      }

      // 2. 下载服务器数据
      const downloadSuccess = await this.downloadServerData()
      if (!downloadSuccess) {
        throw new Error('下载服务器数据失败')
      }

      // 3. 更新最后同步时间
      const now = new Date().toISOString()
      localStorage.setItem('lastSyncTime', now)
      
      this.retryAttempts = 0
      this.notifySyncStatus({ 
        isSyncing: false, 
        lastSyncTime: now,
        error: undefined 
      })
      
      console.log('数据同步完成')
      return true

    } catch (error) {
      console.error('同步失败:', error)
      this.retryAttempts++
      
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      this.notifySyncStatus({ 
        isSyncing: false, 
        error: errorMessage 
      })
      
      // 如果重试次数未达到上限，延迟重试
      if (this.retryAttempts < this.maxRetryAttempts) {
        setTimeout(() => {
          this.syncData()
        }, 5000 * this.retryAttempts) // 递增延迟
      }
      
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  // 上传本地数据
  private async uploadLocalData(): Promise<boolean> {
    try {
      const pendingData = await storageService.getPendingData()
      if (!pendingData || (pendingData.tasks.length === 0 && pendingData.scanRecords.length === 0)) {
        console.log('没有待上传的数据')
        return true
      }

      // 上传已完成的任务
      const completedTasks = pendingData.tasks.filter(task => task.status === 'completed')
      for (const task of completedTasks) {
        try {
          await apiService.updateTask(task.id, task)
          // 上传成功后从本地删除
          await storageService.removeTask(task.id)
        } catch (error) {
          console.error(`上传任务 ${task.id} 失败:`, error)
          throw error
        }
      }

      // 上传扫描记录
      if (pendingData.scanRecords.length > 0) {
        try {
          await apiService.uploadScanRecords(pendingData.scanRecords)
          // 上传成功后清空本地扫描记录
          await storageService.clearScanRecords()
        } catch (error) {
          console.error('上传扫描记录失败:', error)
          throw error
        }
      }

      return true
    } catch (error) {
      console.error('上传本地数据失败:', error)
      return false
    }
  }

  // 下载服务器数据
  private async downloadServerData(): Promise<boolean> {
    try {
      const lastSyncTime = localStorage.getItem('lastSyncTime')
      
      try {
        const response = await apiService.getSyncData(lastSyncTime)
        if (response.success && response.data) {
          await this.mergeServerData(response.data)
          return true
        } else {
          throw new Error(response.message || '获取服务器数据失败')
        }
      } catch (error) {
        console.error('下载服务器数据失败:', error)
        return false
      }
    } catch (error) {
      console.error('下载服务器数据失败:', error)
      return false
    }
  }

  // 合并服务器数据
  private async mergeServerData(serverData: SyncData): Promise<void> {
    try {
      // 获取本地数据
      const localTasks = await storageService.getAllTasks()
      const serverTasks = serverData.tasks
      
      // 合并任务数据
      const mergedTasks = this.mergeTasks(localTasks, serverTasks)
      
      // 保存合并后的任务
      for (const task of mergedTasks) {
        await storageService.saveTask(task)
      }
      
      // 保存服务器的扫描记录
      for (const record of serverData.scanRecords) {
        await storageService.saveScanRecord(record)
      }
      
      console.log('服务器数据合并完成')
    } catch (error) {
      console.error('合并服务器数据失败:', error)
      throw error
    }
  }

  // 合并任务数据
  private mergeTasks(localTasks: SortingTask[], serverTasks: SortingTask[]): SortingTask[] {
    const taskMap = new Map<string, SortingTask>()
    
    // 先添加本地任务
    localTasks.forEach(task => {
      taskMap.set(task.id, task)
    })
    
    // 合并服务器任务
    serverTasks.forEach(serverTask => {
      const localTask = taskMap.get(serverTask.id)
      if (!localTask) {
        // 新任务，直接添加
        taskMap.set(serverTask.id, serverTask)
      } else {
        // 存在冲突，以更新时间较新的为准
        const serverTime = new Date(serverTask.updatedAt).getTime()
        const localTime = new Date(localTask.updatedAt).getTime()
        
        if (serverTime > localTime) {
          taskMap.set(serverTask.id, serverTask)
        }
      }
    })
    
    return Array.from(taskMap.values())
  }

  // 保存待同步数据
  async savePendingData(tasks: SortingTask[], scanRecords: ScanRecord[]): Promise<void> {
    try {
      const syncData: SyncData = {
        tasks,
        scanRecords,
        lastSyncTime: new Date().toISOString()
      }
      
      await storageService.savePendingData(syncData)
      
      // 通知待同步数据数量变化
      this.notifySyncStatus({ 
        pendingCount: tasks.length + scanRecords.length 
      })
    } catch (error) {
      console.error('保存待同步数据失败:', error)
      throw error
    }
  }

  // 获取同步状态
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const lastSyncTime = localStorage.getItem('lastSyncTime')
      const pendingData = await storageService.getPendingData()
      const pendingCount = pendingData ? 
        (pendingData.tasks?.length || 0) + (pendingData.scanRecords?.length || 0) : 0
      
      return {
        isOnline: navigator.onLine,
        isSyncing: this.syncInProgress,
        lastSyncTime,
        pendingCount
      }
    } catch (error) {
      console.error('获取同步状态失败:', error)
      return {
        isOnline: navigator.onLine,
        isSyncing: this.syncInProgress,
        lastSyncTime: null,
        pendingCount: 0,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  // 强制同步
  async forceSync(): Promise<boolean> {
    this.retryAttempts = 0
    return this.syncData(true)
  }

  // 销毁服务
  destroy(): void {
    this.stopAutoSync()
    // 使用匿名函数而不是直接传递方法引用
    window.removeEventListener('online', () => this.syncData())
    window.removeEventListener('offline', () => this.stopAutoSync())
    this.syncCallbacks = []
  }
}

export const syncService = new SyncService()
export default syncService