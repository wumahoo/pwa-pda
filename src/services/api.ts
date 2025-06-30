import type { ApiResponse, User, SortingTask, ScanRecord, SyncData, SortingItem, AppConfig, TaskStatus } from '@/types'

// --- MOCK DATA ---
const mockSortingItems: SortingItem[] = [
  { id: 'item-1', taskId: 'task-1', sku: 'SKU001', barcode: '1234567890123', productName: 'Product A', quantity: 10, sortedQuantity: 5, location: 'A-1-1', status: 'in_progress' },
  { id: 'item-2', taskId: 'task-1', sku: 'SKU002', barcode: '1234567890124', productName: 'Product B', quantity: 5, sortedQuantity: 5, location: 'A-1-2', status: 'completed' },
  { id: 'item-3', taskId: 'task-2', sku: 'SKU003', barcode: '1234567890125', productName: 'Product C', quantity: 8, sortedQuantity: 0, location: 'B-2-1', status: 'pending' },
];

const mockTasks: SortingTask[] = [
  { id: 'task-1', taskNo: 'T20240101-001', warehouseId: 'WH-MOCK-01', warehouseName: 'Mock Warehouse A', priority: 3, status: 'in_progress', items: mockSortingItems.filter(i => i.taskId === 'task-1'), createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T11:00:00Z' },
  { id: 'task-2', taskNo: 'T20240101-002', warehouseId: 'WH-MOCK-01', warehouseName: 'Mock Warehouse A', priority: 2, status: 'pending', items: mockSortingItems.filter(i => i.taskId === 'task-2'), createdAt: '2024-01-01T10:05:00Z', updatedAt: '2024-01-01T10:05:00Z' },
  { id: 'task-3', taskNo: 'T20240101-003', warehouseId: 'WH-MOCK-02', warehouseName: 'Mock Warehouse B', priority: 1, status: 'completed', items: [], createdAt: '2024-01-01T09:00:00Z', updatedAt: '2024-01-01T12:00:00Z', completedAt: '2024-01-01T12:00:00Z' },
];

const mockScanRecords: ScanRecord[] = [
    { id: 'rec-1', taskId: 'task-1', itemId: 'item-1', barcode: '1234567890123', scannedAt: new Date().toISOString(), isValid: true, productName: 'Product A', timestamp: new Date().toISOString() }
];

const mockSyncData: SyncData = {
    tasks: mockTasks,
    scanRecords: mockScanRecords,
    lastSyncTime: new Date().toISOString(),
};

const mockAppConfig: AppConfig = {
    apiBaseUrl: 'http://mock-server/api',
    syncInterval: 300000,
    sync: {
        autoSync: true,
        wifiOnlySync: false,
        batchSize: 50,
        syncInterval: 300000,
    },
    maxRetryAttempts: 3,
    offlineStorageLimit: 100, // MB
    display: {
        darkMode: false,
        fontSize: 'medium',
        keepScreenOn: true,
        showTaskStats: true,
    },
    network: {
        timeout: 15000,
        retryCount: 2,
        offlineMode: true,
    },
    scanner: {
        soundEnabled: true,
        vibrationEnabled: true,
        autoFocus: true,
        scanDelay: 500,
        enabledFormats: ['QR_CODE', 'CODE_128', 'EAN_13'],
    },
    storage: {
        dataRetentionDays: 30,
        autoCleanup: true,
    }
};

function mockResponse<T>(data: T, message: string = 'Mock success', success: boolean = true): Promise<ApiResponse<T>> {
    console.log(`[MOCK API] Returning mock response for ${message}`, data);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success,
          data,
          message,
        });
      }, 300);
    });
  }

class ApiService {
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://pms.huaquai.cn/api'
    this.timeout = 10000 // 10秒超时
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)
      console.error(`API请求失败 ${endpoint}:`, error)
      throw error
    }
  }

  // 用户认证
  async login(username: string, password: string): Promise<ApiResponse<User>> {
    if (import.meta.env.DEV) {
        if (username === 'admin' && password === 'admin') {
            return mockResponse<User>({
                id: 'user-mock-id',
                username: 'admin',
                name: 'Mock Admin',
                token: 'mock-jwt-token-12345',
                avatar: '/logo.svg',
                roles: ['admin'],
                warehouseId: 'WH-MOCK-01'
            }, '模拟登录成功');
        } else {
            return mockResponse<User>({} as User, '用户名或密码错误', false);
        }
    }
    return this.request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  }

  async logout(): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        return mockResponse(null, '登出成功');
    }
    return this.request('/auth/logout', {
      method: 'POST'
    })
  }

  // 获取分拣任务列表
  async getTasks(userId: string): Promise<ApiResponse<SortingTask[]>> {
    if (import.meta.env.DEV) {
        return mockResponse(mockTasks, `获取用户 ${userId} 的任务列表`);
    }
    return this.request<SortingTask[]>(`/tasks?userId=${userId}`)
  }

  // 获取单个任务详情
  async getTask(taskId: string): Promise<ApiResponse<SortingTask>> {
    if (import.meta.env.DEV) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
            return mockResponse(task, `获取任务 ${taskId} 详情`);
        } else {
            return mockResponse({} as SortingTask, `任务 ${taskId} 未找到`, false);
        }
    }
    return this.request<SortingTask>(`/tasks/${taskId}`)
  }

  // 更新任务状态
  async updateTaskStatus(
    taskId: string,
    status: string,
    completedAt?: string
  ): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
            task.status = status as TaskStatus;
            if (completedAt) task.completedAt = completedAt;
            task.updatedAt = new Date().toISOString();
        }
        return mockResponse({ taskId, status }, `更新任务 ${taskId} 状态为 ${status}`);
    }
    return this.request(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, completedAt })
    })
  }

  // 更新任务
  async updateTask(taskId: string, taskData: Partial<SortingTask>): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        let task = mockTasks.find(t => t.id === taskId);
        if (task) {
            task = { ...task, ...taskData, updatedAt: new Date().toISOString() };
        }
        return mockResponse(task, `更新任务 ${taskId}`);
    }
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    })
  }

  // 更新分拣商品项
  async updateSortingItem(itemId: string, updates: Partial<any>): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        for (const task of mockTasks) {
            const item = task.items.find(i => i.id === itemId);
            if (item) {
                Object.assign(item, updates);
                break;
            }
        }
        return mockResponse({ itemId, updates }, `更新分拣项 ${itemId}`);
    }
    return this.request(`/sorting-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  // 验证条码
  async validateBarcode(
    taskId: string,
    barcode: string
  ): Promise<ApiResponse<{ isValid: boolean; item?: any }>> {
    if (import.meta.env.DEV) {
        const item = mockSortingItems.find(i => i.barcode === barcode && i.taskId === taskId);
        if (item) {
            return mockResponse({ isValid: true, item }, `条码 ${barcode} 验证成功`);
        } else {
            return mockResponse({ isValid: false }, `条码 ${barcode} 无效或不属于任务 ${taskId}`, false);
        }
    }
    return this.request(`/tasks/${taskId}/validate-barcode`, {
      method: 'POST',
      body: JSON.stringify({ barcode })
    })
  }

  // 提交扫描记录
  async submitScanRecord(record: ScanRecord): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        mockScanRecords.push(record);
        return mockResponse(record, `提交扫描记录 ${record.id}`);
    }
    return this.request('/scan-records', {
      method: 'POST',
      body: JSON.stringify(record)
    })
  }

  // 批量提交扫描记录
  async submitScanRecords(records: ScanRecord[]): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        mockScanRecords.push(...records);
        return mockResponse({ count: records.length }, `批量提交 ${records.length} 条扫描记录`);
    }
    return this.request('/scan-records/batch', {
      method: 'POST',
      body: JSON.stringify({ records })
    })
  }

  // 上传扫描记录（别名方法）
  async uploadScanRecords(records: ScanRecord[]): Promise<ApiResponse<any>> {
    return this.submitScanRecords(records)
  }

  // 同步数据到服务器
  async syncToServer(data: SyncData): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        console.log('[MOCK API] Syncing to server:', data);
        return mockResponse({ received: true }, '数据同步到服务器');
    }
    return this.request('/sync/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // 从服务器获取最新数据
  async syncFromServer(lastSyncTime?: string): Promise<ApiResponse<SyncData>> {
    if (import.meta.env.DEV) {
        console.log(`[MOCK API] Syncing from server, last sync: ${lastSyncTime}`);
        return mockResponse(mockSyncData, '从服务器同步数据');
    }
    const params = lastSyncTime ? `?lastSyncTime=${lastSyncTime}` : ''
    return this.request<SyncData>(`/sync/download${params}`)
  }

  // 获取同步数据（别名方法）
  async getSyncData(lastSyncTime?: string | null): Promise<ApiResponse<SyncData>> {
    if (import.meta.env.DEV) {
        return this.syncFromServer(lastSyncTime || undefined);
    }
    const params = lastSyncTime ? `?lastSyncTime=${lastSyncTime}` : ''
    return this.request<SyncData>(`/sync/download${params}`)
  }

  // 检查网络连接
  async checkConnection(): Promise<boolean> {
    if (import.meta.env.DEV) {
        return Promise.resolve(true);
    }
    try {
      const response = await this.request('/health')
      return response.success
    } catch (error) {
      return false
    }
  }

  // 获取服务器时间
  async getServerTime(): Promise<ApiResponse<{ timestamp: string }>> {
    if (import.meta.env.DEV) {
        return mockResponse({ timestamp: new Date().toISOString() }, '获取服务器时间');
    }
    return this.request<{ timestamp: string }>('/time')
  }

  // 上传设备信息
  async uploadDeviceInfo(deviceInfo: any): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        console.log('[MOCK API] Uploading device info:', deviceInfo);
        return mockResponse({ received: true }, '上传设备信息');
    }
    return this.request('/device/info', {
      method: 'POST',
      body: JSON.stringify(deviceInfo)
    })
  }

  // 获取应用配置
  async getAppConfig(): Promise<ApiResponse<AppConfig>> {
    if (import.meta.env.DEV) {
        return mockResponse(mockAppConfig, '获取应用配置');
    }
    return this.request('/config')
  }

  // 错误报告
  async reportError(error: any): Promise<ApiResponse<any>> {
    if (import.meta.env.DEV) {
        console.error('[MOCK API] Reporting error:', error);
        return mockResponse({ reported: true }, '报告错误');
    }
    return this.request('/errors', {
      method: 'POST',
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    })
  }
}

export const apiService = new ApiService()
export default apiService