// 任务状态常量
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SYNCED: 'synced'
} as const

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus]

// 优先级常量
export const Priority = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4
} as const

export type Priority = typeof Priority[keyof typeof Priority]

// 分拣任务接口
export interface SortingTask {
  id: string
  taskNo: string
  warehouseId: string
  warehouseName: string
  priority: number
  status: TaskStatus
  items: SortingItem[]
  assignedTo?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  syncedAt?: string
  dueDate?: string
  notes?: string
}

// 分拣商品项
export interface SortingItem {
  id: string
  taskId: string
  sku: string
  barcode: string
  productName: string
  quantity: number
  sortedQuantity: number
  location: string
  status: TaskStatus
  scannedAt?: string
  notes?: string
  specifications?: string
}

// 扫描记录
export interface ScanRecord {
  id: string
  taskId: string
  itemId: string
  barcode: string
  scannedAt: string
  isValid: boolean
  errorMessage?: string
  productName?: string
  timestamp?: string
}

// 同步数据
export interface SyncData {
  tasks: SortingTask[]
  scanRecords: ScanRecord[]
  lastSyncTime: string
}

// API响应
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

// 同步状态接口
export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: string | null
  pendingCount: number
  error?: string
}

// 网络状态
export interface NetworkStatus {
  isOnline: boolean
  lastOnlineTime: string
  pendingSyncCount: number
}

// 用户信息
export interface User {
  id: string
  username: string
  name: string
  role: string
  warehouseId: string
  avatar?: string
  department?: string
}

// 应用配置接口
export interface AppConfig {
  apiBaseUrl: string
  syncInterval: number
  sync?: {
    autoSync: boolean
    wifiOnlySync: boolean
    batchSize: number
    syncInterval: number
  }
  maxRetryAttempts: number
  offlineStorageLimit: number
  display: {
    darkMode: boolean
    fontSize: string
    keepScreenOn: boolean
    showTaskStats: boolean
  }
  network: {
    timeout: number
    retryCount: number
    offlineMode: boolean
  }
  scanner: {
    soundEnabled: boolean
    vibrationEnabled: boolean
    autoFocus: boolean
    scanDelay: number
    enabledFormats: string[]
  }
  storage: {
    dataRetentionDays: number
    autoCleanup: boolean
  }
}