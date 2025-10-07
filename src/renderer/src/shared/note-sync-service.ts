import { Note, db } from '@renderer/batabase'
import { toastError, toastSuccess } from '@renderer/shared'
import { S3Client } from './s3-client'
import { configManager } from './config-manager'

export interface NoteSyncPayload {
  note: Note
  assets: any[] // 暂时为空，后续可扩展
}

export interface SyncResult {
  uploaded: number
  downloaded: number
  errors: string[]
}

export class NoteSyncService {
  private static instance: NoteSyncService
  private s3Client: S3Client | null = null
  private isSyncing = false

  private constructor() {}

  static getInstance(): NoteSyncService {
    if (!NoteSyncService.instance) {
      NoteSyncService.instance = new NoteSyncService()
    }
    return NoteSyncService.instance
  }

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client()
    }
    return this.s3Client
  }

  private noteKey(id: string): string {
    return `notes/${id}.json`
  }

  private shouldApplyRemote(localNote: Note | undefined, remoteNote: Note): boolean {
    if (!localNote) return true
    
    // 如果远程笔记被删除，且删除时间晚于本地更新时间，则应用删除
    if (remoteNote.isDelete && remoteNote.updateTime > localNote.updateTime) {
      return true
    }
    
    // 如果远程笔记未删除，且更新时间晚于本地，则应用更新
    if (!remoteNote.isDelete && remoteNote.updateTime > localNote.updateTime) {
      return true
    }
    
    return false
  }

  async uploadNote(note: Note): Promise<void> {
    const config = configManager.getConfig()
    if (!config.sync.r2_is_enabled || !this.isConfigured()) {
      return
    }

    try {
      const s3Client = this.getS3Client()
      const key = this.noteKey(note.id)
      
      // 创建同步负载
      const payload: NoteSyncPayload = {
        note: {
          ...note,
          updateTime: Date.now() // 更新同步时间戳
        },
        assets: []
      }

      await s3Client.putObject(key, JSON.stringify(payload), 'application/json')
      console.log(`Note ${note.id} uploaded successfully`)
    } catch (error) {
      console.error('Failed to upload note:', error)
      throw error
    }
  }

  async uploadLocalChanges(): Promise<number> {
    const config = configManager.getConfig()
    if (!config.sync.r2_is_enabled || !this.isConfigured()) {
      return 0
    }

    try {
      const lastSyncTime = config.sync.r2_last_sync_time
      console.log(`🔍 [同步调试] lastSyncTime: ${lastSyncTime} (${new Date(lastSyncTime).toLocaleString()})`)
      
      // 获取所有笔记用于调试
      const allNotes = await db.notes.toArray()
      console.log(`🔍 [同步调试] 数据库中总共有 ${allNotes.length} 条笔记`)
      
      if (allNotes.length > 0) {
        console.log(`🔍 [同步调试] 第一条笔记的updateTime: ${allNotes[0].updateTime} (${new Date(allNotes[0].updateTime).toLocaleString()})`)
        console.log(`🔍 [同步调试] 第一条笔记是否需要同步: ${allNotes[0].updateTime > lastSyncTime}`)
      }
      
      // 获取自上次同步以来修改的笔记
      const localNotes = await db.notes
        .where('updateTime')
        .above(lastSyncTime)
        .toArray()

      console.log(`🔍 [同步调试] 找到 ${localNotes.length} 条需要上传的笔记`)
      
      if (localNotes.length > 0) {
        localNotes.forEach((note, index) => {
          console.log(`🔍 [同步调试] 笔记 ${index + 1}: id=${note.id}, updateTime=${note.updateTime} (${new Date(note.updateTime).toLocaleString()})`)
        })
      }

      let uploadedCount = 0
      
      for (const note of localNotes) {
        try {
          await this.uploadNote(note)
          uploadedCount++
          console.log(`✅ [同步调试] 成功上传笔记: ${note.id}`)
        } catch (error) {
          console.error(`❌ [同步调试] 上传笔记失败 ${note.id}:`, error)
        }
      }

      console.log(`🔍 [同步调试] 总共上传了 ${uploadedCount} 条笔记`)
      return uploadedCount
    } catch (error) {
      console.error('Failed to upload local changes:', error)
      throw error
    }
  }

  async downloadRemoteChanges(): Promise<number> {
    const config = configManager.getConfig()
    if (!config.sync.r2_is_enabled || !this.isConfigured()) {
      return 0
    }

    try {
      const s3Client = this.getS3Client()
      const lastSyncTime = config.sync.r2_last_sync_time
      console.log(`🔍 [下载调试] lastSyncTime: ${lastSyncTime} (${new Date(lastSyncTime).toLocaleString()})`)
      
      // 列出所有远程笔记
      const response = await s3Client.listObjects('notes/')
      console.log(`🔍 [下载调试] 远程总共有 ${response.objects.length} 个对象`)
      
      const remoteObjects = response.objects.filter(obj => 
        obj.key.startsWith('notes/') && 
        obj.key.endsWith('.json') &&
        obj.lastModified.getTime() > lastSyncTime
      )
      
      console.log(`🔍 [下载调试] 过滤后需要下载的远程笔记: ${remoteObjects.length} 条`)
      
      if (remoteObjects.length > 0) {
        remoteObjects.forEach((obj, index) => {
          console.log(`🔍 [下载调试] 远程笔记 ${index + 1}: key=${obj.key}, lastModified=${obj.lastModified.getTime()} (${obj.lastModified.toLocaleString()})`)
        })
      }

      let downloadedCount = 0
      
      for (const obj of remoteObjects) {
        try {
          const noteId = obj.key.replace('notes/', '').replace('.json', '')
          const content = await s3Client.getObject(obj.key)
          const payload: NoteSyncPayload = JSON.parse(content)
          
          // 获取本地笔记
          const localNote = await db.notes.get(noteId)
          console.log(`🔍 [下载调试] 处理笔记 ${noteId}, 本地是否存在: ${!!localNote}`)
          
          // 调试远程笔记的标签信息
          console.log(`🏷️ [标签调试] 远程笔记 ${noteId} 的标签信息: ${payload.note.tag}`)
          if (payload.note.tag && payload.note.tag !== '[]') {
            try {
              const tags = JSON.parse(payload.note.tag)
              console.log(`🏷️ [标签调试] 远程笔记解析后的标签:`, tags)
            } catch (error) {
              console.error(`🏷️ [标签调试] 远程笔记标签解析失败:`, error)
            }
          } else {
            console.log(`🏷️ [标签调试] 远程笔记没有标签或标签为空`)
          }
          
          // 检查是否应该应用远程更改
          if (this.shouldApplyRemote(localNote, payload.note)) {
            if (payload.note.isDelete) {
              // 删除本地笔记
              await db.notes.delete(noteId)
              console.log(`🗑️ [下载调试] 删除本地笔记: ${noteId}`)
            } else {
              // 更新或插入笔记
              await db.notes.put(payload.note)
              console.log(`💾 [下载调试] 保存笔记: ${noteId}`)
            }
            downloadedCount++
          } else {
            console.log(`⏭️ [下载调试] 跳过笔记: ${noteId} (不需要应用远程更改)`)
          }
        } catch (error) {
          console.error(`❌ [下载调试] 下载笔记失败 ${obj.key}:`, error)
        }
      }

      console.log(`🔍 [下载调试] 总共下载了 ${downloadedCount} 条笔记`)
      return downloadedCount
    } catch (error) {
      console.error('Failed to download remote changes:', error)
      throw error
    }
  }

  async sync(): Promise<SyncResult> {
    const config = configManager.getConfig()
    if (!config.sync.r2_is_enabled || !this.isConfigured()) {
      throw new Error('R2 同步未启用或未配置')
    }

    if (this.isSyncing) {
      throw new Error('Sync is already in progress')
    }

    this.isSyncing = true
    const errors: string[] = []
    let uploaded = 0
    let downloaded = 0

    try {
      // 上传本地更改
      try {
        uploaded = await this.uploadLocalChanges()
      } catch (error) {
        errors.push(`Upload failed: ${error}`)
      }

      // 下载远程更改
      try {
        downloaded = await this.downloadRemoteChanges()
      } catch (error) {
        errors.push(`Download failed: ${error}`)
      }

      // 更新最后同步时间
      configManager.updateSyncConfig({ r2_last_sync_time: Date.now() })

      const result: SyncResult = { uploaded, downloaded, errors }
      
      if (errors.length === 0) {
        toastSuccess(`同步完成：上传 ${uploaded} 条，下载 ${downloaded} 条笔记`)
      } else {
        toastError(`同步部分失败：${errors.join(', ')}`)
      }

      return result
    } finally {
      this.isSyncing = false
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    const config = configManager.getConfig()
    if (!config.sync.r2_is_enabled || !this.isConfigured()) {
      return
    }

    try {
      const s3Client = this.getS3Client()
      const key = this.noteKey(noteId)
      
      // 获取本地笔记数据（应该已经标记为删除）
      const localNote = await db.notes.get(noteId)
      if (!localNote) {
        console.warn(`Local note ${noteId} not found for deletion`)
        return
      }
      
      // 创建删除标记的笔记数据
      const deletedNote: Note = {
        ...localNote,
        isDelete: localNote.isDelete || Date.now(),
        updateTime: localNote.updateTime
      }
      
      const payload: NoteSyncPayload = {
        note: deletedNote,
        assets: []
      }
      
      // 上传标记为删除的笔记到远程
      try {
        await s3Client.putObject(key, JSON.stringify(payload), 'application/json')
        console.log(`✅ Successfully marked remote note ${noteId} as deleted`)
      } catch (error) {
        console.error(`❌ Failed to mark remote note ${noteId} as deleted:`, error)
        throw error
      }
    } catch (error) {
      console.error('Failed to delete remote note:', error)
      throw error
    }
  }

  // 手动触发单个笔记同步
  async syncNote(note: Note): Promise<void> {
    const config = configManager.getConfig()
    if (!config.sync.r2_is_enabled || !this.isConfigured()) {
      return
    }

    try {
      await this.uploadNote(note)
      toastSuccess('笔记同步成功')
    } catch (error) {
      toastError(`笔记同步失败：${error}`)
      throw error
    }
  }

  // 检查同步状态
  isSyncInProgress(): boolean {
    return this.isSyncing
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false
    }

    try {
      const client = new S3Client()
      console.log('Created S3Client, testing listObjects...')
      const result = await client.listObjects()
      console.log('Connection test successful:', result)
      return true
    } catch (error) {
      console.error('Connection test error details:', {
        type: typeof error,
        constructor: error?.constructor?.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        fullError: error
      })
      
      // 如果是网络错误，提供更具体的错误信息
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network fetch failed - this could be due to CORS, network connectivity, or invalid URL')
        throw new Error('Network connection failed. Please check: 1. Internet connection 2. Account ID format 3. Credentials 4. Firewall/proxy settings')
      }
      
      // 如果是HTTP错误，显示状态码
      if (error instanceof Error && error.message.includes('HTTP')) {
        console.error('HTTP error occurred:', error.message)
        throw new Error(`HTTP error: ${error.message}`)
      }
      
      if (error instanceof Error) {
        throw new Error(`Connection failed: ${error.message}`)
      } else {
        throw new Error('Connection failed: Unknown error occurred')
      }
    }
  }

  private isConfigured(): boolean {
    const config = configManager.getConfig().sync
    return !!(
      config.r2_account_id &&
      config.r2_access_key_id &&
      config.r2_secret_access_key &&
      config.r2_bucket_name
    )
  }
}