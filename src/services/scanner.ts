import { BrowserMultiFormatReader, Result } from '@zxing/library'

class ScannerService {
  private codeReader: BrowserMultiFormatReader
  private isScanning = false
  private currentStream: MediaStream | null = null
  private scanCallbacks: Array<(result: string) => void> = []
  private errorCallbacks: Array<(error: Error) => void> = []

  constructor() {
    this.codeReader = new BrowserMultiFormatReader()
  }

  // 添加扫描结果监听器
  addScanListener(callback: (result: string) => void): void {
    this.scanCallbacks.push(callback)
  }

  // 移除扫描结果监听器
  removeScanListener(callback: (result: string) => void): void {
    const index = this.scanCallbacks.indexOf(callback)
    if (index > -1) {
      this.scanCallbacks.splice(index, 1)
    }
  }

  // 添加错误监听器
  addErrorListener(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback)
  }

  // 移除错误监听器
  removeErrorListener(callback: (error: Error) => void): void {
    const index = this.errorCallbacks.indexOf(callback)
    if (index > -1) {
      this.errorCallbacks.splice(index, 1)
    }
  }

  // 通知扫描结果
  private notifyScanResult(result: string): void {
    this.scanCallbacks.forEach(callback => {
      try {
        callback(result)
      } catch (error) {
        console.error('扫描结果回调执行失败:', error)
      }
    })
  }

  // 通知错误
  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        console.error('错误回调执行失败:', err)
      }
    })
  }

  // 获取可用的摄像头设备
  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter(device => device.kind === 'videoinput')
    } catch (error) {
      console.error('获取摄像头设备失败:', error)
      throw new Error('无法获取摄像头设备')
    }
  }

  // 检查摄像头权限
  async checkCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (error) {
      console.error('摄像头权限检查失败:', error)
      return false
    }
  }

  // 开始扫描
  async startScan(videoElement: HTMLVideoElement, deviceId?: string): Promise<void> {
    if (this.isScanning) {
      throw new Error('扫描已在进行中')
    }

    try {
      this.isScanning = true

      // 获取摄像头流
      const videoConstraints: MediaTrackConstraints = {
        facingMode: 'environment', // 优先使用后置摄像头
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }

      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId }
      }

      const constraints: MediaStreamConstraints = {
        video: videoConstraints
      }

      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints)
      videoElement.srcObject = this.currentStream

      // 等待视频加载
      await new Promise<void>((resolve, reject) => {
        videoElement.onloadedmetadata = () => resolve()
        videoElement.onerror = () => reject(new Error('视频加载失败'))
      })

      await videoElement.play()

      // 开始解码
      this.codeReader.decodeFromVideoDevice(
        deviceId || null,
        videoElement,
        (result: Result | null, error?: Error) => {
          if (result) {
            console.log('扫描成功:', result.getText())
            this.notifyScanResult(result.getText())
          }
          
          if (error && !(error.name === 'NotFoundException')) {
            console.error('扫描错误:', error)
            this.notifyError(error)
          }
        }
      )

      console.log('扫描已开始')
    } catch (error) {
      this.isScanning = false
      console.error('启动扫描失败:', error)
      throw error
    }
  }

  // 停止扫描
  stopScan(): void {
    if (!this.isScanning) return

    try {
      // 停止解码器
      this.codeReader.reset()

      // 停止摄像头流
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => {
          track.stop()
        })
        this.currentStream = null
      }

      this.isScanning = false
      console.log('扫描已停止')
    } catch (error) {
      console.error('停止扫描失败:', error)
    }
  }

  // 从图片文件扫描
  async scanFromFile(file: File): Promise<string> {
    try {
      const result = await this.codeReader.decodeFromImageElement(await this.createImageElement(file))
      return result.getText()
    } catch (error) {
      console.error('从文件扫描失败:', error)
      throw new Error('无法识别图片中的条码')
    }
  }

  // 创建图片元素
  private createImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('图片加载失败'))
      }
      
      img.src = url
    })
  }

  // 切换闪光灯（如果支持）
  async toggleFlashlight(enable: boolean): Promise<void> {
    if (!this.currentStream) {
      throw new Error('摄像头未启动')
    }

    try {
      const track = this.currentStream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      
      if ('torch' in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: enable } as any]
        })
      } else {
        throw new Error('设备不支持闪光灯')
      }
    } catch (error) {
      console.error('切换闪光灯失败:', error)
      throw error
    }
  }

  // 检查是否支持闪光灯
  hasFlashlight(): boolean {
    if (!this.currentStream) return false
    
    try {
      const track = this.currentStream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      return 'torch' in capabilities
    } catch (error) {
      return false
    }
  }

  // 获取扫描状态
  isCurrentlyScanning(): boolean {
    return this.isScanning
  }

  // 验证条码格式
  validateBarcode(barcode: string): { isValid: boolean; type?: string; error?: string } {
    if (!barcode || barcode.trim().length === 0) {
      return { isValid: false, error: '条码不能为空' }
    }

    // 移除空白字符
    const cleanBarcode = barcode.trim()

    // 基本长度检查
    if (cleanBarcode.length < 4 || cleanBarcode.length > 50) {
      return { isValid: false, error: '条码长度不符合要求' }
    }

    // 检查是否包含有效字符
    const validPattern = /^[A-Za-z0-9\-_]+$/
    if (!validPattern.test(cleanBarcode)) {
      return { isValid: false, error: '条码包含无效字符' }
    }

    // 简单的条码类型识别
    let type = 'UNKNOWN'
    if (/^\d{8}$/.test(cleanBarcode)) {
      type = 'EAN-8'
    } else if (/^\d{13}$/.test(cleanBarcode)) {
      type = 'EAN-13'
    } else if (/^\d{12}$/.test(cleanBarcode)) {
      type = 'UPC-A'
    } else if (/^[A-Za-z0-9]+$/.test(cleanBarcode)) {
      type = 'CODE-128'
    }

    return { isValid: true, type }
  }

  // 清理资源
  destroy(): void {
    this.stopScan()
    this.scanCallbacks = []
    this.errorCallbacks = []
  }
}

export const scannerService = new ScannerService()
export default scannerService