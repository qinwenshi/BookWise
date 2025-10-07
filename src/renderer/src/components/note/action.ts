import { Note, db } from '@renderer/batabase'
import { t } from '@renderer/data'
import { bookJump } from '@renderer/hooks'
import { now, toastError } from '@renderer/shared'
import { NoteSyncService } from '@renderer/shared/note-sync-service'
import { DomSource } from '@renderer/web-highlight'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import { ref } from 'vue'

export type NoteText = {
  value: string
  time: number
}

export class NoteAction {
  static async add({
    sources,
    eBookId,
    eBookName,
    chapterName,
    notes,
    tag
  }: {
    sources: DomSource[]
    eBookId: string
    eBookName: string
    chapterName: string
    notes: string
    tag: string
  }) {
    try {
      if (sources.length === 0) return null
      const sourceId = sources[0].id
      const isExist = await this.findBySourceId(sourceId)
      if (isExist) return null

      const res: Note = {
        id: uuidv4(),
        sourceId: sourceId,
        eBookId,
        eBookName,
        notes,
        chapterName,
        domSource: JSON.stringify(sources),
        createTime: now(),
        updateTime: now(),
        tag,
        isDelete: null
      }

      await db.notes.put(res)
      
      // 触发同步
      try {
        await NoteSyncService.getInstance().syncNote(res)
      } catch (error) {
        console.warn('Failed to sync note after creation:', error)
      }
      
      return res
    } catch (error) {
      toastError(t('note.addNoteFail'))
      return Promise.reject(error)
    }
  }

  static async removeOne(id: string) {
    try {
      const currentTime = now()
      
      // 1. 先在本地标记为删除状态
      await db.notes.update(id, { 
        isDelete: currentTime, 
        updateTime: currentTime 
      })
      
      // 2. 触发远程删除同步
      try {
        await NoteSyncService.getInstance().deleteNote(id)
        // 远程同步成功，本地笔记保持 isDelete 标记状态，不进行物理删除
        console.log(`Note ${id} marked as deleted locally and remotely`)
      } catch (error) {
        console.warn('Failed to sync note deletion:', error)
        // 如果远程同步失败，恢复本地状态
        await db.notes.update(id, { 
          isDelete: null, 
          updateTime: currentTime 
        })
        throw error
      }
    } catch (error) {
      toastError(t('common.removeFail'))
      return Promise.reject(error)
    }
  }

  static async removeBySoureIds(sourceId: string[]) {
    try {
      const notes = await db.notes.where('sourceId').anyOf(sourceId).toArray()
      const promises = notes.map(note => this.removeOne(note.id))
      await Promise.all(promises)
    } catch (error) {
      toastError(t('common.removeFail'))
      return Promise.reject(error)
    }
  }

  static async update(id: string, value: Partial<Note>) {
    try {
      const result = await db.notes.update(id, { ...value, updateTime: now() })
      
      // 获取更新后的笔记并触发同步
      try {
        const updatedNote = await db.notes.get(id)
        if (updatedNote) {
          await NoteSyncService.getInstance().syncNote(updatedNote)
        }
      } catch (error) {
        console.warn('Failed to sync note after update:', error)
      }
      
      return result
    } catch (error) {
      toastError(t('common.updateFail'))
      return Promise.reject(error)
    }
  }

  static async updateBySourceId(sourceId: string, value: Partial<Note>) {
    try {
      const note = await this.findBySourceId(sourceId)
      if (note) {
        await this.update(note.id, value)
        return true
      }
      return false
    } catch (error) {
      toastError(t('common.updateFail'))
      return Promise.reject(error)
    }
  }

  static async updateBookName(bookId: string, bookName: string) {
    try {
      const notes = await this.findByEBookId(bookId)
      for (const note of notes) {
        await this.update(note.id, { eBookName: bookName })
      }
    } catch (error) {
      toastError(t('common.updateFail'))
      return Promise.reject(error)
    }
  }

  static observable() {
    try {
      return useObservable<Note[], Note[]>(
        liveQuery(async () => (await db.notes.toArray()).filter((item) => !item.isDelete)) as any
      )
    } catch (error) {
      toastError(t('note.getNoteFail'))
      return ref([] as Note[])
    }
  }

  static async findByEBookId(eBookId: string) {
    const notes = await db.notes.where('eBookId').equals(eBookId).toArray()
    return notes.filter(note => !note.isDelete)
  }

  static async findBySourceId(id: string) {
    const note = await db.notes.where('sourceId').equals(id).first()
    return note && !note.isDelete ? note : undefined
  }

  static async findBySourceIds(ids: string[]) {
    const notes = await db.notes.where('sourceId').anyOf(ids).toArray()
    return notes.filter(note => !note.isDelete)
  }

  static async findBookPageNotes(eBookId: string, page: string) {
    const bookNotes = await this.findByEBookId(eBookId)
    const result: Note[] = []
    for (const note of bookNotes) {
      const source = this.getDomSource(note.domSource)
      const pageNote = source.find((item) => item.page === page)
      if (pageNote) {
        result.push({ ...note, domSource: JSON.stringify([pageNote]) })
      }
    }
    return result
  }

  static async getAll() {
    const notes = await db.notes.toArray()
    return notes.filter(note => !note.isDelete)
  }

  static noteToDomSource(note: Note): DomSource {
    const source = this.getDomSource(note.domSource)[0]
    return {
      id: note.sourceId,
      text: source.text,
      className: source.className,
      tagName: 'span',
      startDomMeta: source.startDomMeta,
      endDomMeta: source.endDomMeta,
      page: source.page
    }
  }

  static getDomSource(value: string | undefined) {
    if (!value) return []

    return JSON.parse(value) as DomSource[]
  }

  static getNoteText(value: string | undefined) {
    if (!value) return []

    return JSON.parse(value) as NoteText[]
  }

  static async jumpToBook(value: Note) {
    localStorage.setItem('__note__', JSON.stringify(value))
    bookJump(value.eBookId)
  }

}
