<template>
  <div class="sync-status flex items-center gap-2">
    <!-- 同步状态图标 -->
    <div class="tooltip" :data-tip="statusTooltip">
      <div class="indicator">
        <span 
          v-if="hasError" 
          class="indicator-item badge badge-error badge-xs"
        ></span>
        <button 
          class="btn btn-ghost btn-sm btn-circle"
          :class="statusClass"
          @click="$emit('openSettings')"
        >
          <svg 
            v-if="isSyncing" 
            class="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg 
            v-else-if="isEnabled && isConfigured" 
            class="h-4 w-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
          </svg>
          <svg 
            v-else 
            class="h-4 w-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- 最后同步时间 -->
    <div v-if="lastSyncTime && showLastSync" class="text-xs text-base-content/60">
      {{ formatLastSyncTime(lastSyncTime) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { R2ConfigManager } from '@renderer/shared/r2-config'
import { NoteSyncService } from '@renderer/shared/note-sync-service'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

interface Props {
  showLastSync?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLastSync: true
})

defineEmits<{
  openSettings: []
}>()

const isConfigured = ref(false)
const isEnabled = ref(false)
const isSyncing = ref(false)
const lastSyncTime = ref<number | null>(null)
const hasError = ref(false)

let syncCheckInterval: number | null = null

const statusClass = computed(() => {
  if (isSyncing.value) return 'text-info'
  if (!isConfigured.value || !isEnabled.value) return 'text-base-content/40'
  if (hasError.value) return 'text-error'
  return 'text-success'
})

const statusTooltip = computed(() => {
  if (isSyncing.value) return '正在同步...'
  if (!isConfigured.value) return '未配置同步'
  if (!isEnabled.value) return '同步已禁用'
  if (hasError.value) return '同步出现错误'
  return '同步正常'
})

const formatLastSyncTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  return dayjs(timestamp).format('MM-DD HH:mm')
}

const updateStatus = () => {
  isConfigured.value = R2ConfigManager.isConfigured()
  isEnabled.value = R2ConfigManager.config.isEnabled
  lastSyncTime.value = R2ConfigManager.getLastSyncTime()
  isSyncing.value = NoteSyncService.getInstance().isSyncInProgress()
}

onMounted(() => {
  updateStatus()
  
  // 每30秒检查一次状态
  syncCheckInterval = window.setInterval(updateStatus, 30000)
})

onUnmounted(() => {
  if (syncCheckInterval) {
    clearInterval(syncCheckInterval)
  }
})
</script>

<style scoped>
.sync-status {
  user-select: none;
}
</style>