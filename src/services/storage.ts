import localforage from 'localforage'
import type { SortingTask, ScanRecord, SyncData, User, AppConfig } from '@/types'

// 配置localforage
localforage.config({
  name: 'PMS_PDA',
  version: 1.0,
  storeName: 'pms_data',
  description: 'PMS PDA 分拣系统离线数据存储'
})

// 存储键名常量
const STORAGE_KEYS = {
  TASKS: 'sorting_tasks',
  SCAN_RECORDS: 'scan_records',
  USER: 'current_user',
  CONFIG: 'app_config',
  SYNC_DATA: 'sync_data',
  LAST_SYNC_TIME: 'last_sync_time',
  PENDING_SYNC: 'pending_sync'
} as const

class StorageService {
  // 任务相关存储
  async getTasks(): Promise<SortingTask[]> {
    try {
      const tasks = await localforage.getItem<SortingTask[]>(STORAGE_KEYS.TASKS)
      return tasks || []
    } catch (error) {
      console.error('获取任务数据失败:', error)
      return []
    }
  }

  // 获取所有任务（别名方法）
  async getAllTasks(): Promise<SortingTask[]> {
    return this.getTasks()
  }

  // 获取分拣任务（别名方法）
  async getSortingTasks(): Promise<SortingTask[]> {
    return this.getTasks()
  }

  // 保存单个任务
  async saveTask(task: SortingTask): Promise<void> {
    try {
      const tasks = await this.getTasks()
      const index = tasks.findIndex(t => t.id === task.id)
      if (index !== -1) {
        tasks[index] = task
      } else {
        tasks.push(task)
      }
      await this.saveTasks(tasks)
    } catch (error) {
      console.error('保存任务失败:', error)
      throw error
    }
  }

  // 删除任务
  async removeTask(taskId: string): Promise<void> {
    try {
      const tasks = await this.getTasks()
      const filteredTasks = tasks.filter(task => task.id !== taskId)
      await this.saveTasks(filteredTasks)
    } catch (error) {
      console.error('删除任务失败:', error)
      throw error
    }
  }

  async saveTasks(tasks: SortingTask[]): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.TASKS, tasks)
    } catch (error) {
      console.error('保存任务数据失败:', error)
      throw error
    }
  }

  async getTask(taskId: string): Promise<SortingTask | null> {
    try {
      const tasks = await this.getTasks()
      return tasks.find(task => task.id === taskId) || null
    } catch (error) {
      console.error('获取单个任务失败:', error)
      return null
    }
  }

  async updateTask(updatedTask: SortingTask): Promise<void> {
    try {
      const tasks = await this.getTasks()
      const index = tasks.findIndex(task => task.id === updatedTask.id)
      if (index !== -1) {
        tasks[index] = updatedTask
        await this.saveTasks(tasks)
      }
    } catch (error) {
      console.error('更新任务失败:', error)
      throw error
    }
  }

  // 扫描记录存储
  async getScanRecords(): Promise<ScanRecord[]> {
    try {
      const records = await localforage.getItem<ScanRecord[]>(STORAGE_KEYS.SCAN_RECORDS)
      return records || []
    } catch (error) {
      console.error('获取扫描记录失败:', error)
      return []
    }
  }

  async saveScanRecord(record: ScanRecord): Promise<void> {
    try {
      const records = await this.getScanRecords()
      records.push(record)
      await localforage.setItem(STORAGE_KEYS.SCAN_RECORDS, records)
    } catch (error) {
      console.error('保存扫描记录失败:', error)
      throw error
    }
  }

  async clearScanRecords(): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.SCAN_RECORDS, [])
    } catch (error) {
      console.error('清除扫描记录失败:', error)
      throw error
    }
  }

  // 用户信息存储
  async getUser(): Promise<User | null> {
    try {
      return await localforage.getItem<User>(STORAGE_KEYS.USER)
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.USER, user)
    } catch (error) {
      console.error('保存用户信息失败:', error)
      throw error
    }
  }

  async clearUser(): Promise<void> {
    try {
      await localforage.removeItem(STORAGE_KEYS.USER)
    } catch (error) {
      console.error('清除用户信息失败:', error)
      throw error
    }
  }

  // 应用配置存储
  async getConfig(): Promise<AppConfig | null> {
    try {
      return await localforage.getItem<AppConfig>(STORAGE_KEYS.CONFIG)
    } catch (error) {
      console.error('获取应用配置失败:', error)
      return null
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.CONFIG, config)
    } catch (error) {
      console.error('保存应用配置失败:', error)
      throw error
    }
  }

  // 同步相关存储
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await localforage.getItem<string>(STORAGE_KEYS.LAST_SYNC_TIME)
    } catch (error) {
      console.error('获取最后同步时间失败:', error)
      return null
    }
  }

  async saveLastSyncTime(time: string): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, time)
    } catch (error) {
      console.error('保存最后同步时间失败:', error)
      throw error
    }
  }

  async getPendingSyncData(): Promise<SyncData | null> {
    try {
      return await localforage.getItem<SyncData>(STORAGE_KEYS.PENDING_SYNC)
    } catch (error) {
      console.error('获取待同步数据失败:', error)
      return null
    }
  }

  // 获取待同步数据（别名方法）
  async getPendingData(): Promise<SyncData | null> {
    return this.getPendingSyncData()
  }

  async savePendingSyncData(data: SyncData): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.PENDING_SYNC, data)
    } catch (error) {
      console.error('保存待同步数据失败:', error)
      throw error
    }
  }

  // 保存待同步数据（别名方法）
  async savePendingData(data: SyncData): Promise<void> {
    return this.savePendingSyncData(data)
  }

  async clearPendingSyncData(): Promise<void> {
    try {
      await localforage.removeItem(STORAGE_KEYS.PENDING_SYNC)
    } catch (error) {
      console.error('清除待同步数据失败:', error)
      throw error
    }
  }

  // 清除所有数据
  async clearAll(): Promise<void> {
    try {
      await localforage.clear()
    } catch (error) {
      console.error('清除所有数据失败:', error)
      throw error
    }
  }

  // 获取存储使用情况
  async getStorageInfo(): Promise<{ used: number; total: number }> {
    try {
      const keys = await localforage.keys()
      let totalSize = 0
      
      for (const key of keys) {
        const value = await localforage.getItem(key)
        totalSize += JSON.stringify(value).length
      }
      
      return {
        used: totalSize,
        total: 50 * 1024 * 1024 // 假设50MB限制
      }
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return { used: 0, total: 0 }
    }
  }

  // 获取存储使用情况
  async getStorageUsage(): Promise<{ used: number; total: number }> {
    try {
      const info = await this.getStorageInfo()
      return {
        used: info.used,
        total: info.total
      }
    } catch (error) {
      console.error('获取存储使用情况失败:', error)
      return { used: 0, total: 0 }
    }
  }
}

export const storageService = new StorageService()
export default storageService