<template>
  <div class="sync-settings p-6 max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">笔记同步设置</h2>
    
    <!-- 同步状态 -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h3 class="card-title">同步状态</h3>
        <div class="flex items-center gap-4">
          <div class="badge" :class="syncStatusClass">
            {{ syncStatusText }}
          </div>
          <div v-if="lastSyncTime" class="text-sm text-base-content/70">
            上次同步：{{ formatTime(lastSyncTime) }}
          </div>
        </div>
        
        <div class="card-actions justify-end mt-4">
          <button 
            class="btn btn-primary" 
            :disabled="!isConfigured || isSyncing"
            @click="manualSync"
          >
            <span v-if="isSyncing" class="loading loading-spinner loading-sm"></span>
            {{ isSyncing ? '同步中...' : '立即同步' }}
          </button>
          <button 
            class="btn btn-outline" 
            :disabled="!isConfigured"
            @click="testConnection"
          >
            测试连接
          </button>
        </div>
      </div>
    </div>

    <!-- R2 配置 -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="card-title">Cloudflare R2 配置</h3>
        
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">启用同步</span>
          </label>
          <input 
            type="checkbox" 
            class="toggle toggle-primary" 
            v-model="config.isEnabled"
            @change="updateConfig"
          />
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">账户 ID</span>
          </label>
          <input 
            type="text" 
            placeholder="your-account-id" 
            class="input input-bordered w-full" 
            v-model="config.accountId"
            @blur="updateConfig"
          />
          <label class="label">
            <span class="label-text-alt">端点 URL 将自动生成为: https://{{config.accountId || 'your-account-id'}}.r2.cloudflarestorage.com</span>
          </label>
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">存储桶名称</span>
          </label>
          <input 
            type="text" 
            placeholder="your-bucket-name" 
            class="input input-bordered w-full" 
            v-model="config.bucketName"
            @blur="updateConfig"
          />
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Access Key ID</span>
          </label>
          <input 
            type="text" 
            placeholder="your-access-key-id" 
            class="input input-bordered w-full" 
            v-model="config.accessKeyId"
            @blur="updateConfig"
          />
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Secret Access Key</span>
          </label>
          <input 
            type="password" 
            placeholder="your-secret-access-key" 
            class="input input-bordered w-full" 
            v-model="config.secretAccessKey"
            @blur="updateConfig"
          />
        </div>

        <div class="alert alert-info mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 class="font-bold">配置说明</h3>
            <div class="text-sm">
              <p>1. 在 Cloudflare 控制台创建 R2 存储桶</p>
              <p>2. 创建 API 令牌，确保有读写权限</p>
              <p>3. 填入对应的配置信息</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 同步日志 -->
    <div class="card bg-base-100 shadow-xl mt-6" v-if="syncLogs.length > 0">
      <div class="card-body">
        <h3 class="card-title">同步日志</h3>
        <div class="max-h-60 overflow-y-auto">
          <div 
            v-for="log in syncLogs" 
            :key="log.timestamp"
            class="text-sm p-2 border-b border-base-200 last:border-b-0"
          >
            <div class="flex justify-between items-start">
              <span :class="log.type === 'error' ? 'text-error' : 'text-success'">
                {{ log.message }}
              </span>
              <span class="text-xs text-base-content/50">
                {{ formatTime(log.timestamp) }}
              </span>
            </div>
          </div>
        </div>
        <div class="card-actions justify-end mt-4">
          <button class="btn btn-sm btn-outline" @click="clearLogs">
            清空日志
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NoteSyncService } from '@renderer/shared/note-sync-service'
import { toastSuccess, toastError } from '@renderer/shared'
import { useSyncConfig } from '@renderer/store/config'
import dayjs from 'dayjs'

interface SyncLog {
  timestamp: number
  message: string
  type: 'success' | 'error'
}

const { syncConfig, updateSyncConfig, isConfigured } = useSyncConfig()
const isSyncing = ref(false)
const syncLogs = ref<SyncLog[]>([])

// 创建本地配置对象用于表单绑定
const config = ref({
  isEnabled: syncConfig.r2_is_enabled,
  accountId: syncConfig.r2_account_id,
  bucketName: syncConfig.r2_bucket_name,
  accessKeyId: syncConfig.r2_access_key_id,
  secretAccessKey: syncConfig.r2_secret_access_key
})

// 监听配置变化，同步到全局配置
watch(config, (newConfig) => {
  updateSyncConfig('r2_is_enabled', newConfig.isEnabled)
  updateSyncConfig('r2_account_id', newConfig.accountId)
  updateSyncConfig('r2_bucket_name', newConfig.bucketName)
  updateSyncConfig('r2_access_key_id', newConfig.accessKeyId)
  updateSyncConfig('r2_secret_access_key', newConfig.secretAccessKey)
}, { deep: true })

// 监听全局配置变化，同步到本地配置
watch(syncConfig, (newSyncConfig) => {
  config.value = {
    isEnabled: newSyncConfig.r2_is_enabled,
    accountId: newSyncConfig.r2_account_id,
    bucketName: newSyncConfig.r2_bucket_name,
    accessKeyId: newSyncConfig.r2_access_key_id,
    secretAccessKey: newSyncConfig.r2_secret_access_key
  }
}, { deep: true })

const lastSyncTime = computed(() => syncConfig.r2_last_sync_time)

const syncStatusClass = computed(() => {
  if (!isConfigured()) return 'badge-warning'
  if (isSyncing.value) return 'badge-info'
  return config.value.isEnabled ? 'badge-success' : 'badge-neutral'
})

const syncStatusText = computed(() => {
  if (!isConfigured()) return '未配置'
  if (isSyncing.value) return '同步中'
  return config.value.isEnabled ? '已启用' : '已禁用'
})

const updateConfig = () => {
  // 配置会通过watch自动更新，这里保留兼容性
}

const formatTime = (timestamp: number) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

const addLog = (message: string, type: 'success' | 'error' = 'success') => {
  syncLogs.value.unshift({
    timestamp: Date.now(),
    message,
    type
  })
  
  // 保持最多50条日志
  if (syncLogs.value.length > 50) {
    syncLogs.value = syncLogs.value.slice(0, 50)
  }
}

const clearLogs = () => {
  syncLogs.value = []
}

const manualSync = async () => {
  if (!isConfigured()) {
    toastError('请先完成 R2 配置')
    return
  }

  isSyncing.value = true
  
  try {
    const result = await NoteSyncService.getInstance().sync()
    const message = `同步完成：上传 ${result.uploaded} 条，下载 ${result.downloaded} 条笔记`
    addLog(message, 'success')
    toastSuccess(message)
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => addLog(error, 'error'))
    }
  } catch (error) {
    const message = `同步失败：${error}`
    addLog(message, 'error')
    toastError(message)
  } finally {
    isSyncing.value = false
  }
}

const testConnection = async () => {
  if (!isConfigured()) {
    toastError('请先完成 R2 配置')
    return
  }

  try {
    const success = await NoteSyncService.getInstance().testConnection()
    if (success) {
      addLog('连接测试成功', 'success')
      toastSuccess('连接测试成功')
    } else {
      addLog('连接测试失败', 'error')
      toastError('连接测试失败')
    }
  } catch (error) {
    const message = `连接测试失败：${error}`
    addLog(message, 'error')
    toastError(message)
  }
}
</script>

<style scoped>
.sync-settings {
  min-height: 100vh;
}
</style>