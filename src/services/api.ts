import type { ApiResponse, User, SortingTask, ScanRecord, SyncData } from '@/types'

class ApiService {
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
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
    return this.request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST'
    })
  }

  // 获取分拣任务列表
  async getTasks(userId: string): Promise<ApiResponse<SortingTask[]>> {
    return this.request<SortingTask[]>(`/tasks?userId=${userId}`)
  }

  // 获取单个任务详情
  async getTask(taskId: string): Promise<ApiResponse<SortingTask>> {
    return this.request<SortingTask>(`/tasks/${taskId}`)
  }

  // 更新任务状态
  async updateTaskStatus(
    taskId: string,
    status: string,
    completedAt?: string
  ): Promise<ApiResponse> {
    return this.request(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, completedAt })
    })
  }

  // 更新任务
  async updateTask(taskId: string, task: SortingTask): Promise<ApiResponse> {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(task)
    })
  }

  // 更新分拣商品项
  async updateSortingItem(itemId: string, updates: Partial<any>): Promise<ApiResponse> {
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
    return this.request(`/tasks/${taskId}/validate-barcode`, {
      method: 'POST',
      body: JSON.stringify({ barcode })
    })
  }

  // 提交扫描记录
  async submitScanRecord(record: ScanRecord): Promise<ApiResponse> {
    return this.request('/scan-records', {
      method: 'POST',
      body: JSON.stringify(record)
    })
  }

  // 批量提交扫描记录
  async submitScanRecords(records: ScanRecord[]): Promise<ApiResponse> {
    return this.request('/scan-records/batch', {
      method: 'POST',
      body: JSON.stringify({ records })
    })
  }

  // 上传扫描记录（别名方法）
  async uploadScanRecords(records: ScanRecord[]): Promise<ApiResponse> {
    return this.submitScanRecords(records)
  }

  // 同步数据到服务器
  async syncToServer(data: SyncData): Promise<ApiResponse> {
    return this.request('/sync/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // 从服务器获取最新数据
  async syncFromServer(lastSyncTime?: string): Promise<ApiResponse<SyncData>> {
    const params = lastSyncTime ? `?lastSyncTime=${lastSyncTime}` : ''
    return this.request<SyncData>(`/sync/download${params}`)
  }

  // 获取同步数据（别名方法）
  async getSyncData(lastSyncTime?: string | null): Promise<ApiResponse<SyncData>> {
    const params = lastSyncTime ? `?lastSyncTime=${lastSyncTime}` : ''
    return this.request<SyncData>(`/sync/download${params}`)
  }

  // 检查网络连接
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.request('/health')
      return response.success
    } catch (error) {
      return false
    }
  }

  // 获取服务器时间
  async getServerTime(): Promise<ApiResponse<{ timestamp: string }>> {
    return this.request<{ timestamp: string }>('/time')
  }

  // 上传设备信息
  async uploadDeviceInfo(deviceInfo: any): Promise<ApiResponse> {
    return this.request('/device/info', {
      method: 'POST',
      body: JSON.stringify(deviceInfo)
    })
  }

  // 获取应用配置
  async getAppConfig(): Promise<ApiResponse<any>> {
    return this.request('/config')
  }

  // 错误报告
  async reportError(error: any): Promise<ApiResponse> {
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