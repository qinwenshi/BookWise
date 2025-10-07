import { isElectron } from './index'

// 配置文件版本，用于迁移
const CONFIG_VERSION = '1.0.0'

// 敏感信息字段列表
const SENSITIVE_FIELDS = [
  'deepseek_api_key',
  'r2_access_key_id',
  'r2_secret_access_key',
  'r2_account_id'
]

// 配置接口定义
export interface AppConfig {
  version: string
  settings: {
    // 基础设置
    isOpenNew: boolean
    isFoldCatalog: boolean
    readMode: string
    bookshelf: string
    noteMode: string
    isOpenRecycleBin: boolean
    isNoteShowClass: boolean
    isAutoHighlight: boolean
    isRemeberPosition: boolean
    theme: string
    lang: string
    pdfScale: number
    listenMode: string
    fontFamily: string
  }
  ai: {
    deepseek_api_key: string
  }
  sync: {
    r2_account_id: string
    r2_access_key_id: string
    r2_secret_access_key: string
    r2_bucket_name: string
    r2_last_sync_time: number
    r2_is_enabled: boolean
  }
  lastUpdated: number
}

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
  version: CONFIG_VERSION,
  settings: {
    isOpenNew: true,
    isFoldCatalog: false,
    readMode: 'scroll',
    bookshelf: 'bookshelf',
    noteMode: 'card',
    isOpenRecycleBin: true,
    isNoteShowClass: false,
    isAutoHighlight: true,
    isRemeberPosition: true,
    theme: 'light',
    lang: 'en',
    pdfScale: 1,
    listenMode: '',
    fontFamily: 'fzjzxf'
  },
  ai: {
    deepseek_api_key: ''
  },
  sync: {
    r2_account_id: '',
    r2_access_key_id: '',
    r2_secret_access_key: '',
    r2_bucket_name: '',
    r2_last_sync_time: 0,
    r2_is_enabled: false
  },
  lastUpdated: Date.now()
}

/**
 * 简单的加密/解密函数
 * 注意：这是一个基础的混淆方法，不是真正的安全加密
 * 在生产环境中应该使用更强的加密算法
 */
class SimpleEncryption {
  private static readonly KEY = 'BookWise2024Config'

  static encrypt(text: string): string {
    if (!text) return text
    
    let result = ''
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i)
      const keyChar = this.KEY.charCodeAt(i % this.KEY.length)
      result += String.fromCharCode(charCode ^ keyChar)
    }
    return btoa(result) // Base64编码
  }

  static decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText
    
    try {
      const decoded = atob(encryptedText) // Base64解码
      let result = ''
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i)
        const keyChar = this.KEY.charCodeAt(i % this.KEY.length)
        result += String.fromCharCode(charCode ^ keyChar)
      }
      return result
    } catch (error) {
      console.warn('解密失败，返回原始值:', error)
      return encryptedText
    }
  }
}

/**
 * 配置管理器
 */
export class ConfigManager {
  private static instance: ConfigManager
  private config: AppConfig
  private configPath: string

  private constructor() {
    this.configPath = this.getConfigPath()
    this.config = this.loadConfig()
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * 获取配置文件路径
   */
  private getConfigPath(): string {
    if (isElectron) {
      // Electron环境：使用用户数据目录
      return 'bookwise-config.json'
    } else {
      // Web环境：使用localStorage
      return 'bookwise_config'
    }
  }

  /**
   * 加载配置
   */
  private loadConfig(): AppConfig {
    try {
      let configData: string | null = null

      if (isElectron && window.store) {
        // Electron环境：从electron-store读取
        configData = window.store.get('config')
      } else {
        // Web环境：从localStorage读取
        configData = localStorage.getItem(this.configPath)
      }

      if (configData) {
        const parsed = JSON.parse(configData)
        
        // 解密敏感字段
        this.decryptSensitiveFields(parsed)
        
        // 合并默认配置（处理新增字段）
        const merged = this.mergeWithDefaults(parsed)
        
        // 检查版本并进行迁移
        return this.migrateConfig(merged)
      }
    } catch (error) {
      console.warn('加载配置失败，使用默认配置:', error)
    }

    return { ...DEFAULT_CONFIG }
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      // 创建配置副本用于保存
      const configToSave = JSON.parse(JSON.stringify(this.config))
      
      // 加密敏感字段
      this.encryptSensitiveFields(configToSave)
      
      // 更新时间戳
      configToSave.lastUpdated = Date.now()

      const configString = JSON.stringify(configToSave, null, 2)

      if (isElectron && window.store) {
        // Electron环境：保存到electron-store
        window.store.set('config', configString)
      } else {
        // Web环境：保存到localStorage
        localStorage.setItem(this.configPath, configString)
      }
    } catch (error) {
      console.error('保存配置失败:', error)
    }
  }

  /**
   * 加密敏感字段
   */
  private encryptSensitiveFields(config: any): void {
    const encrypt = (obj: any, path: string = '') => {
      for (const key in obj) {
        const fullPath = path ? `${path}_${key}` : key
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          encrypt(obj[key], fullPath)
        } else if (SENSITIVE_FIELDS.includes(fullPath) && typeof obj[key] === 'string') {
          obj[key] = SimpleEncryption.encrypt(obj[key])
        }
      }
    }
    
    encrypt(config)
  }

  /**
   * 解密敏感字段
   */
  private decryptSensitiveFields(config: any): void {
    const decrypt = (obj: any, path: string = '') => {
      for (const key in obj) {
        const fullPath = path ? `${path}_${key}` : key
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          decrypt(obj[key], fullPath)
        } else if (SENSITIVE_FIELDS.includes(fullPath) && typeof obj[key] === 'string') {
          obj[key] = SimpleEncryption.decrypt(obj[key])
        }
      }
    }
    
    decrypt(config)
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaults(config: any): AppConfig {
    const merge = (target: any, source: any): any => {
      const result = { ...target }
      
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = merge(result[key] || {}, source[key])
        } else if (result[key] === undefined) {
          result[key] = source[key]
        }
      }
      
      return result
    }

    return merge(config, DEFAULT_CONFIG)
  }

  /**
   * 配置迁移
   */
  private migrateConfig(config: AppConfig): AppConfig {
    // 如果版本不匹配，进行迁移
    if (config.version !== CONFIG_VERSION) {
      console.log(`配置版本从 ${config.version} 迁移到 ${CONFIG_VERSION}`)
      
      // 这里可以添加具体的迁移逻辑
      // 例如：重命名字段、转换数据格式等
      
      config.version = CONFIG_VERSION
      this.saveConfig()
    }
    
    return config
  }

  /**
   * 获取完整配置
   */
  getConfig(): AppConfig {
    return { ...this.config }
  }

  /**
   * 获取设置配置
   */
  getSettings() {
    return { ...this.config.settings }
  }

  /**
   * 更新设置配置
   */
  updateSettings(settings: Partial<AppConfig['settings']>): void {
    this.config.settings = { ...this.config.settings, ...settings }
    this.saveConfig()
  }

  /**
   * 获取AI配置
   */
  getAIConfig() {
    return { ...this.config.ai }
  }

  /**
   * 更新AI配置
   */
  updateAIConfig(aiConfig: Partial<AppConfig['ai']>): void {
    this.config.ai = { ...this.config.ai, ...aiConfig }
    this.saveConfig()
  }

  /**
   * 获取同步配置
   */
  getSyncConfig() {
    return { ...this.config.sync }
  }

  /**
   * 更新同步配置
   */
  updateSyncConfig(syncConfig: Partial<AppConfig['sync']>): void {
    this.config.sync = { ...this.config.sync, ...syncConfig }
    this.saveConfig()
  }

  /**
   * 重置配置
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG }
    this.saveConfig()
  }

  /**
   * 导出配置（不包含敏感信息）
   */
  exportConfig(): string {
    const exportConfig = { ...this.config }
    
    // 移除敏感信息
    exportConfig.ai.deepseek_api_key = ''
    exportConfig.sync.r2_access_key_id = ''
    exportConfig.sync.r2_secret_access_key = ''
    exportConfig.sync.r2_account_id = ''
    
    return JSON.stringify(exportConfig, null, 2)
  }

  /**
   * 导入配置（合并非敏感信息）
   */
  importConfig(configString: string): boolean {
    try {
      const importedConfig = JSON.parse(configString)
      
      // 只导入非敏感信息
      if (importedConfig.settings) {
        this.updateSettings(importedConfig.settings)
      }
      
      // 同步配置中的非敏感部分
      if (importedConfig.sync) {
        const { r2_access_key_id, r2_secret_access_key, r2_account_id, ...safeSyncConfig } = importedConfig.sync
        this.updateSyncConfig(safeSyncConfig)
      }
      
      return true
    } catch (error) {
      console.error('导入配置失败:', error)
      return false
    }
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance()