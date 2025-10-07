interface DeepseekMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface DeepseekResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason?: string
  }>
}

interface StreamCallbacks {
  onThinking?: (thinking: string) => void
  onContent?: (content: string) => void
  onError?: (error: string) => void
  onComplete?: () => void
}

export class DeepseekAPI {
  private apiKey: string
  private baseUrl: string = 'https://api.deepseek.com/v1'

  constructor(apiKey?: string) {
    // 从环境变量或设置中获取API密钥
    this.apiKey = apiKey || this.getApiKeyFromSettings() || ''
  }

  private getApiKeyFromSettings(): string {
    // 从localStorage获取API密钥
    return localStorage.getItem('deepseek_api_key') || ''
  }

  async chatStream(
    messages: DeepseekMessage[],
    callbacks: StreamCallbacks,
    systemPrompt?: string
  ): Promise<void> {
    if (!this.apiKey) {
      callbacks.onError?.('请先配置Deepseek API密钥')
      return
    }

    try {
      // 构建完整的消息数组，包含系统提示词
      const fullMessages: DeepseekMessage[] = []
      
      // 如果有系统提示词，添加到消息开头
      if (systemPrompt) {
        fullMessages.push({
          role: 'system',
          content: systemPrompt
        })
      }
      
      // 添加用户和助手的历史消息
      fullMessages.push(...messages)

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: fullMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let isThinkingPhase = true
      let thinkingContent = ''
      let responseContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            if (line.trim() === 'data: [DONE]') {
              callbacks.onComplete?.()
              return
            }

            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6)
                const data: DeepseekResponse = JSON.parse(jsonStr)
                
                const choice = data.choices?.[0]
                if (!choice) continue

                // 检查是否完成
                if (choice.finish_reason) {
                  callbacks.onComplete?.()
                  return
                }

                const content = choice.delta?.content || ''
                if (!content) continue

                // Deepseek的思考过程通常在开始部分
                // 这里简化处理，实际可能需要更复杂的逻辑来区分思考和回答
                if (isThinkingPhase && this.isThinkingContent(content)) {
                  thinkingContent += content
                  callbacks.onThinking?.(thinkingContent)
                } else {
                  if (isThinkingPhase) {
                    isThinkingPhase = false
                  }
                  responseContent += content
                  callbacks.onContent?.(responseContent)
                }

              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError)
              }
            }
          }
        }
        
        // 如果流正常结束但没有收到 [DONE] 标记，也要调用完成回调
        callbacks.onComplete?.()
      } finally {
        reader.releaseLock()
      }

    } catch (error) {
      console.error('Deepseek API调用失败:', error)
      callbacks.onError?.(error instanceof Error ? error.message : '未知错误')
    }
  }

  private isThinkingContent(content: string): boolean {
    // 简单的启发式方法来判断是否是思考内容
    // 实际使用中可能需要更复杂的逻辑
    const thinkingKeywords = ['让我', '首先', '我需要', '分析', '考虑', '思考']
    return thinkingKeywords.some(keyword => content.includes(keyword))
  }

  // 设置API密钥
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    // TODO: 保存到应用设置中
  }

  // 检查API密钥是否已配置
  hasApiKey(): boolean {
    return !!this.apiKey
  }

  // 测试API连接
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// 创建单例实例
export const deepseekAPI = new DeepseekAPI()