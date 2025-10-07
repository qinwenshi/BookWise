import Dexie, { Table } from 'dexie'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string
  timestamp: number
}

export interface ChatSession {
  id?: number
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  bookId?: string // 关联的书籍ID
  context?: string // 初始上下文
}

class ChatDatabase extends Dexie {
  chatSessions!: Table<ChatSession>

  constructor() {
    super('ChatDatabase')
    this.version(1).stores({
      chatSessions: '++id, title, createdAt, updatedAt, bookId'
    })
  }
}

const db = new ChatDatabase()

export class ChatStorageService {
  // 创建新的聊天会话
  async createSession(title: string, context?: string, bookId?: string): Promise<number> {
    const session: ChatSession = {
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bookId,
      context
    }
    
    return await db.chatSessions.add(session)
  }

  // 获取所有聊天会话
  async getAllSessions(): Promise<ChatSession[]> {
    return await db.chatSessions.orderBy('updatedAt').reverse().toArray()
  }

  // 获取特定会话
  async getSession(id: number): Promise<ChatSession | undefined> {
    return await db.chatSessions.get(id)
  }

  // 更新会话消息
  async updateSessionMessages(id: number, messages: ChatMessage[]): Promise<void> {
    await db.chatSessions.update(id, {
      messages,
      updatedAt: Date.now()
    })
  }

  // 添加消息到会话
  async addMessageToSession(id: number, message: ChatMessage): Promise<void> {
    const session = await this.getSession(id)
    if (session) {
      session.messages.push(message)
      await this.updateSessionMessages(id, session.messages)
    }
  }

  // 删除会话
  async deleteSession(id: number): Promise<void> {
    await db.chatSessions.delete(id)
  }

  // 更新会话标题
  async updateSessionTitle(id: number, title: string): Promise<void> {
    await db.chatSessions.update(id, {
      title,
      updatedAt: Date.now()
    })
  }

  // 根据书籍ID获取相关会话
  async getSessionsByBookId(bookId: string): Promise<ChatSession[]> {
    return await db.chatSessions.where('bookId').equals(bookId).toArray()
  }

  // 清空所有聊天记录
  async clearAllSessions(): Promise<void> {
    await db.chatSessions.clear()
  }

  // 生成会话标题（基于第一条用户消息）
  generateSessionTitle(firstUserMessage: string): string {
    const maxLength = 30
    const cleaned = firstUserMessage.trim().replace(/\n/g, ' ')
    
    if (cleaned.length <= maxLength) {
      return cleaned
    }
    
    return cleaned.substring(0, maxLength - 3) + '...'
  }

  // 导出聊天记录
  async exportSessions(): Promise<ChatSession[]> {
    return await this.getAllSessions()
  }

  // 导入聊天记录
  async importSessions(sessions: ChatSession[]): Promise<void> {
    await db.transaction('rw', db.chatSessions, async () => {
      for (const session of sessions) {
        // 移除ID，让数据库自动生成新的ID
        const { id, ...sessionData } = session
        await db.chatSessions.add(sessionData)
      }
    })
  }
}

// 创建单例实例
export const chatStorage = new ChatStorageService()