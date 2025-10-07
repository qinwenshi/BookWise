import { useStorage } from '@vueuse/core'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  lastSyncTime: number
  isEnabled: boolean
}

const defaultConfig: R2Config = {
  accountId: '',
  accessKeyId: '',
  secretAccessKey: '',
  bucketName: '',
  lastSyncTime: 0,
  isEnabled: false
}

// 使用localStorage存储R2配置
export const r2ConfigStore = useStorage<R2Config>(
  'book-wise_r2_config',
  defaultConfig,
  localStorage,
  {
    mergeDefaults: true
  }
)

export class R2ConfigManager {
  static get config(): R2Config {
    return r2ConfigStore.value
  }

  static updateConfig(config: Partial<R2Config>) {
    r2ConfigStore.value = { ...r2ConfigStore.value, ...config }
  }

  static isConfigured(): boolean {
    const config = this.config
    return !!(
      config.accountId &&
      config.accessKeyId &&
      config.secretAccessKey &&
      config.bucketName
    )
  }

  static getAccountId(): string {
    return this.config.accountId
  }

  static getEndpoint(): string {
    const accountId = this.config.accountId
    if (!accountId) {
      return ''
    }
    return `https://${accountId}.r2.cloudflarestorage.com`
  }

  static getBucketName(): string {
    return this.config.bucketName
  }

  static getAccessKeyId(): string {
    return this.config.accessKeyId
  }

  static getSecretAccessKey(): string {
    return this.config.secretAccessKey
  }

  static getLastSyncTime(): number {
    return this.config.lastSyncTime
  }

  static setLastSyncTime(time: number) {
    this.updateConfig({ lastSyncTime: time })
  }

  static isEnabled(): boolean {
    return this.config.isEnabled && this.isConfigured()
  }

  static enable() {
    this.updateConfig({ isEnabled: true })
  }

  static disable() {
    this.updateConfig({ isEnabled: false })
  }

  static reset() {
    r2ConfigStore.value = { ...defaultConfig }
  }
}