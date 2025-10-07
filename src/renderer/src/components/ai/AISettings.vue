<template>
  <div class="card bg-base-100 shadow w-full">
    <div class="card-body">
      <h2 class="card-title flex items-center gap-2">
        <Bot class="w-5 h-5" />
        AI助手设置
      </h2>
      
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Deepseek API密钥</span>
          <span class="label-text-alt">
            <a 
              href="https://platform.deepseek.com/api_keys" 
              target="_blank" 
              class="link link-primary text-xs"
            >
              获取API密钥
            </a>
          </span>
        </label>
        <div class="join w-full">
          <input 
            v-model="apiKey"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="请输入您的Deepseek API密钥"
            class="input input-bordered join-item flex-1"
            @blur="saveApiKey"
          />
          <button 
            class="btn btn-outline join-item"
            @click="showApiKey = !showApiKey"
          >
            <Eye v-if="!showApiKey" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
        <label class="label">
          <span class="label-text-alt text-gray-500">
            API密钥将安全存储在本地，不会上传到服务器
          </span>
        </label>
      </div>

      <div class="flex gap-2 mt-4">
        <button 
          class="btn btn-primary btn-sm"
          :class="{ 'loading': testing }"
          :disabled="!apiKey || testing"
          @click="testConnection"
        >
          <Zap v-if="!testing" class="w-4 h-4 mr-1" />
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
        
        <div v-if="connectionStatus" class="flex items-center gap-1">
          <CheckCircle v-if="connectionStatus === 'success'" class="w-4 h-4 text-success" />
          <XCircle v-else class="w-4 h-4 text-error" />
          <span class="text-sm" :class="connectionStatus === 'success' ? 'text-success' : 'text-error'">
            {{ connectionStatus === 'success' ? '连接成功' : '连接失败' }}
          </span>
        </div>
      </div>

      <div class="alert alert-info mt-4">
        <Info class="w-4 h-4" />
        <div class="text-sm">
          <div class="font-medium">使用说明：</div>
          <ul class="list-disc list-inside mt-1 space-y-1">
            <li>配置API密钥后，可在阅读时选中文本并使用AI助手功能</li>
            <li>AI助手支持文本分析、问答、总结等功能</li>
            <li>首次使用需要测试连接确保配置正确</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Bot, Eye, EyeOff, Zap, CheckCircle, XCircle, Info } from 'lucide-vue-next'
import { deepseekAPI } from '../../services/deepseek-api'
import { useAIConfig } from '../../store/config'

const { aiConfig, updateAIConfig } = useAIConfig()

const showApiKey = ref(false)
const testing = ref(false)
const connectionStatus = ref<'success' | 'error' | null>(null)

// 使用计算属性来绑定API密钥
const apiKey = computed({
  get: () => aiConfig.deepseek_api_key,
  set: (value: string) => {
    updateAIConfig('deepseek_api_key', value)
  }
})

// 监听API密钥变化，自动设置到deepseekAPI
watch(
  () => aiConfig.deepseek_api_key,
  (newKey) => {
    if (newKey) {
      deepseekAPI.setApiKey(newKey)
    } else {
      // 如果密钥为空，也要刷新以确保获取最新状态
      deepseekAPI.refreshApiKey()
    }
    connectionStatus.value = null
  },
  { immediate: true }
)

// 保存API密钥（现在通过配置管理器自动保存）
const saveApiKey = () => {
  // 配置会自动保存，这里只需要重置连接状态
  connectionStatus.value = null
}

// 测试连接
const testConnection = async () => {
  if (!apiKey.value) return
  
  testing.value = true
  connectionStatus.value = null
  
  try {
    const isConnected = await deepseekAPI.testConnection()
    connectionStatus.value = isConnected ? 'success' : 'error'
  } catch (error) {
    connectionStatus.value = 'error'
  } finally {
    testing.value = false
  }
}
</script>