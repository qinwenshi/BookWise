<template>
  <div class="h-full flex flex-col bg-base-100">
    <!-- 头部 -->
    <div class="flex-shrink-0 px-3 py-1.5 border-b border-base-300">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Bot class="w-4 h-4 text-primary" />
          <h3 class="font-semibold text-base">AI助手</h3>
        </div>
        <div class="flex gap-1">
          <button 
            class="btn btn-ghost btn-xs"
            @click="createNewSession"
            title="新建对话"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
          <button 
            class="btn btn-ghost btn-xs"
            @click="showHistory = !showHistory"
            title="聊天历史"
          >
            <History class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- 聊天历史侧边栏 -->
    <div v-if="showHistory" class="flex-shrink-0 border-b border-base-300">
      <div class="p-3 max-h-48 overflow-y-auto">
        <h4 class="font-medium mb-2 text-sm">聊天历史</h4>
        <div class="space-y-1">
          <div 
            v-for="session in chatSessions" 
            :key="session.id"
            class="flex items-center justify-between p-2 rounded hover:bg-base-200 cursor-pointer"
            :class="{ 'bg-primary/10': currentSessionId === session.id }"
            @click="loadSession(session.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium truncate">{{ session.title }}</div>
              <div class="text-xs text-base-content/60">{{ formatTime(session.createdAt) }}</div>
            </div>
            <button 
              @click.stop="deleteSession(session.id)"
              class="btn btn-ghost btn-xs text-error"
              title="删除会话"
            >
              ×
            </button>
          </div>
        </div>
        <div v-if="chatSessions.length === 0" class="text-xs text-base-content/60 text-center py-4">
          暂无聊天历史
        </div>
      </div>
    </div>

    <!-- AI聊天界面 -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3" ref="chatContainer">
      <!-- 聊天记录 -->
      <div v-for="(message, index) in chatHistory" :key="index" class="chat" 
           :class="message.role === 'user' ? 'chat-end' : 'chat-start'">
        <div class="chat-image avatar">
          <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <component :is="message.role === 'user' ? User : Bot" class="w-3 h-3 text-primary-content" />
          </div>
        </div>
        <div class="chat-header text-xs">
          {{ message.role === 'user' ? '你' : 'AI助手' }}
          <time class="text-xs opacity-50 ml-1">{{ formatTime(message.timestamp) }}</time>
        </div>
        <div class="chat-bubble text-sm" :class="message.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'">
          <!-- 用户消息 -->
          <div v-if="message.role === 'user'">{{ message.content }}</div>
          
          <!-- AI消息 -->
          <div v-else>
            <!-- 思考过程 -->
            <div v-if="message.thinking" class="mb-2 p-2 bg-base-200 rounded text-xs opacity-75">
              <div class="font-semibold mb-1">💭 思考过程:</div>
              <div class="whitespace-pre-wrap">{{ message.thinking }}</div>
            </div>
            
            <!-- 最终回答 -->
            <div class="whitespace-pre-wrap">{{ message.content }}</div>
          </div>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="chat chat-start">
        <div class="chat-image avatar">
          <div class="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
            <Bot class="w-3 h-3 text-secondary-content animate-pulse" />
          </div>
        </div>
        <div class="chat-bubble chat-bubble-secondary text-sm">
          <div class="flex items-center space-x-2">
            <span class="loading loading-dots loading-sm"></span>
            <span>AI正在思考中...</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 输入区域 -->
    <div class="border-t border-base-200 p-3">
      <!-- 上下文显示 -->
      <div v-if="contextText" class="mb-3 p-2 bg-base-200 rounded-lg">
        <div class="text-xs font-semibold mb-1">📖 选中文本:</div>
        <div class="text-xs text-base-content/70 line-clamp-3">{{ contextText }}</div>
        <button @click="clearContext" class="btn btn-xs btn-ghost mt-1">清除上下文</button>
      </div>
      
      <!-- 快捷提示词 -->
      <div class="mb-2 flex flex-wrap gap-1">
        <button v-for="prompt in quickPrompts" :key="prompt.text" 
                @click="useQuickPrompt(prompt.text)"
                class="btn btn-xs btn-outline text-xs">
          {{ prompt.label }}
        </button>
      </div>
      
      <!-- 输入框 -->
      <div class="flex space-x-2">
        <textarea 
          v-model="inputMessage" 
          @keydown.enter.prevent="handleEnter"
          placeholder="输入你的问题或提示词..."
          class="textarea textarea-bordered flex-1 resize-none text-sm"
          rows="2"
          :disabled="isLoading"
        ></textarea>
        <button 
          @click="sendMessage" 
          :disabled="!inputMessage.trim() || isLoading"
          class="btn btn-primary btn-sm"
        >
          <Send class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { deepseekAPI } from '../../services/deepseek-api'
import { chatStorage, ChatMessage, ChatSession } from '../../services/chat-storage'
import { Bot, User, Send, History, Plus } from 'lucide-vue-next'

// 响应式数据
const inputMessage = ref('')
const chatHistory = ref<ChatMessage[]>([])
const isLoading = ref(false)
const contextText = ref('')
const chatContainer = ref<HTMLElement>()

// 会话管理
const currentSessionId = ref<string | null>(null)
const chatSessions = ref<ChatSession[]>([])
const showHistory = ref(false)

// 快捷提示词
const quickPrompts = ref([
  { label: '解释', text: '请解释这段文本的含义' },
  { label: '总结', text: '请总结这段文本的主要内容' },
  { label: '翻译', text: '请翻译这段文本' },
  { label: '分析', text: '请分析这段文本的结构和要点' }
])

// 格式化时间
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return new Date(timestamp).toLocaleDateString()
}

// 会话管理方法
const loadChatSessions = async () => {
  try {
    chatSessions.value = await chatStorage.getAllSessions()
  } catch (error) {
    console.error('加载聊天会话失败:', error)
  }
}

const loadSession = async (sessionId: string) => {
  try {
    const session = await chatStorage.getSession(sessionId)
    if (session) {
      currentSessionId.value = sessionId
      chatHistory.value = session.messages
      contextText.value = session.context || ''
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    console.error('加载会话失败:', error)
  }
}

const createNewSession = () => {
  currentSessionId.value = null
  chatHistory.value = []
  contextText.value = ''
  showHistory.value = false
}

const deleteSession = async (sessionId: string) => {
  try {
    await chatStorage.deleteSession(sessionId)
    await loadChatSessions()
    
    if (currentSessionId.value === sessionId) {
      createNewSession()
    }
  } catch (error) {
    console.error('删除会话失败:', error)
  }
}

// 清除上下文
const clearContext = () => {
  contextText.value = ''
}

// 使用快捷提示词
const useQuickPrompt = (prompt: string) => {
  if (contextText.value) {
    inputMessage.value = `${prompt}：\n\n${contextText.value}`
  } else {
    inputMessage.value = prompt
  }
}

// 处理回车键
const handleEnter = (event: KeyboardEvent) => {
  if (!event.shiftKey) {
    sendMessage()
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage: ChatMessage = {
    role: 'user',
    content: inputMessage.value.trim(),
    timestamp: Date.now()
  }

  // 检查是否是新会话
  const isNewSession = !currentSessionId.value

  // 如果是新会话，创建会话记录
  if (isNewSession) {
    try {
      const sessionTitle = await chatStorage.generateSessionTitle(userMessage.content)
      const newSession: Omit<ChatSession, 'id'> = {
        title: sessionTitle,
        context: contextText.value,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      }
      
      const sessionId = await chatStorage.createSession(newSession)
      currentSessionId.value = sessionId
      await loadChatSessions()
    } catch (error) {
      console.error('创建会话失败:', error)
    }
  }

  // 保存用户消息到数据库
  if (currentSessionId.value) {
    try {
      await chatStorage.addMessageToSession(currentSessionId.value, userMessage)
    } catch (error) {
      console.error('保存用户消息失败:', error)
    }
  }

  chatHistory.value.push(userMessage)
  const currentInput = inputMessage.value
  inputMessage.value = ''
  isLoading.value = true

  await nextTick()
  scrollToBottom()

  // 调用AI API
  await callDeepseekAPI(currentInput)
}

// 调用Deepseek API
const callDeepseekAPI = async (message: string) => {
  try {
    // 构建消息历史
    const messages = chatHistory.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // 添加上下文信息
    let systemPrompt = '你是一个智能阅读助手，帮助用户理解和分析文本内容。'
    if (contextText.value) {
      systemPrompt += `\n\n用户当前选中的文本内容是：\n${contextText.value}`
    }

    // 创建AI消息对象
    const aiMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      thinking: '',
      timestamp: Date.now()
    }

    chatHistory.value.push(aiMessage)
    await nextTick()
    scrollToBottom()

    // 调用API
    await deepseekAPI.chatStream(
      messages,
      {
        onThinking: (thinking: string) => {
          const lastMessage = chatHistory.value[chatHistory.value.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.thinking = thinking
          }
        },
        onContent: (content: string) => {
          const lastMessage = chatHistory.value[chatHistory.value.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = content
          }
          scrollToBottom()
        },
        onError: (error: string) => {
          console.error('AI API错误:', error)
          const lastMessage = chatHistory.value[chatHistory.value.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = `抱歉，发生了错误：${error}`
          }
        },
        onComplete: async () => {
          isLoading.value = false
          
          // 保存AI回复到数据库
          if (currentSessionId.value) {
            try {
              const lastMessage = chatHistory.value[chatHistory.value.length - 1]
              await chatStorage.addMessageToSession(currentSessionId.value, lastMessage)
            } catch (error) {
              console.error('保存AI消息失败:', error)
            }
          }
        }
      },
      systemPrompt
    )
  } catch (error) {
    console.error('调用AI API失败:', error)
    isLoading.value = false
    
    const lastMessage = chatHistory.value[chatHistory.value.length - 1]
    if (lastMessage.role === 'assistant') {
      lastMessage.content = '抱歉，AI服务暂时不可用，请稍后再试。'
    }
  }
}

// 组件挂载时加载会话列表
onMounted(async () => {
  await loadChatSessions()
})

// 暴露给父组件的方法
defineExpose({
  setContext: (text: string) => {
    contextText.value = text
  }
})
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>