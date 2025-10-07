import { configManager, type AppConfig } from '@renderer/shared/config-manager'
import { reactive, watch } from 'vue'

// 创建响应式配置对象
export const appConfig = reactive<AppConfig>(configManager.getConfig())

// 监听配置变化并自动保存
watch(
  () => appConfig.settings,
  (newSettings) => {
    configManager.updateSettings(newSettings)
  },
  { deep: true }
)

watch(
  () => appConfig.ai,
  (newAI) => {
    configManager.updateAIConfig(newAI)
  },
  { deep: true }
)

watch(
  () => appConfig.sync,
  (newSync) => {
    configManager.updateSyncConfig(newSync)
  },
  { deep: true }
)

// 设置相关的便捷方法
export const useSettings = () => {
  const updateSetting = <K extends keyof AppConfig['settings']>(
    key: K,
    value: AppConfig['settings'][K]
  ) => {
    appConfig.settings[key] = value
  }

  const resetSettings = () => {
    const defaultConfig = configManager.getConfig()
    Object.assign(appConfig.settings, defaultConfig.settings)
  }

  return {
    settings: appConfig.settings,
    updateSetting,
    resetSettings
  }
}

// AI配置相关的便捷方法
export const useAIConfig = () => {
  const updateAIConfig = <K extends keyof AppConfig['ai']>(
    key: K,
    value: AppConfig['ai'][K]
  ) => {
    appConfig.ai[key] = value
  }

  const resetAIConfig = () => {
    const defaultConfig = configManager.getConfig()
    Object.assign(appConfig.ai, defaultConfig.ai)
  }

  return {
    aiConfig: appConfig.ai,
    updateAIConfig,
    resetAIConfig
  }
}

// 同步配置相关的便捷方法
export const useSyncConfig = () => {
  const updateSyncConfig = <K extends keyof AppConfig['sync']>(
    key: K,
    value: AppConfig['sync'][K]
  ) => {
    appConfig.sync[key] = value
  }

  const resetSyncConfig = () => {
    const defaultConfig = configManager.getConfig()
    Object.assign(appConfig.sync, defaultConfig.sync)
  }

  const isConfigured = () => {
    const { r2_account_id, r2_access_key_id, r2_secret_access_key, r2_bucket_name } = appConfig.sync
    return !!(r2_account_id && r2_access_key_id && r2_secret_access_key && r2_bucket_name)
  }

  return {
    syncConfig: appConfig.sync,
    updateSyncConfig,
    resetSyncConfig,
    isConfigured
  }
}

// 配置管理相关的便捷方法
export const useConfigManager = () => {
  const exportConfig = () => {
    return configManager.exportConfig()
  }

  const importConfig = (configString: string) => {
    const success = configManager.importConfig(configString)
    if (success) {
      // 重新加载配置到响应式对象
      const newConfig = configManager.getConfig()
      Object.assign(appConfig, newConfig)
    }
    return success
  }

  const resetAllConfig = () => {
    configManager.resetConfig()
    const newConfig = configManager.getConfig()
    Object.assign(appConfig, newConfig)
  }

  return {
    exportConfig,
    importConfig,
    resetAllConfig
  }
}

// 兼容性：为了保持与现有代码的兼容性，导出一个类似原settingStore的对象
export const settingStore = {
  value: appConfig.settings
}

// 监听模式的兼容性类
export class ListenMode {
  static set({ id, value }: { id: string; value: string }) {
    const data = appConfig.settings.listenMode
    if (data) {
      let obj = {}
      try {
        obj = JSON.parse(data)
      } catch (error) {}
      obj[id] = value
      appConfig.settings.listenMode = JSON.stringify(obj)
    } else {
      appConfig.settings.listenMode = JSON.stringify({ [id]: value })
    }
  }

  static get(id: string) {
    const data = appConfig.settings.listenMode
    if (data) {
      let obj = {}
      try {
        obj = JSON.parse(data)
      } catch (error) {}
      return obj[id] || ''
    } else {
      return ''
    }
  }
}