import { ipcMain } from 'electron'
import Store from 'electron-store'

interface SettingState {
  isOpenNew: boolean // 是否打开新页面
  isFoldCatalog: boolean // 目录是显示折叠效果，还是全面展开
  readMode: string // 阅读模式
  bookshelf: string // 书架模式
  noteMode: string
  isOpenRecycleBin: boolean // 是否打开回收站
  isNoteShowClass: boolean // 笔记是否显示class
  isAutoHighlight: boolean // 选中文字的时候是否自定高亮
  isRemeberPosition: boolean // 是否记住阅读位置
  theme: string // 主题
  lang: string // 语言
  pdfScale: number // PDF展示比例
  listenMode: string // 听书音频模型
  fontFamily: string // 字体设置
}

const schemaSetting: SettingState = {
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
}

// 扩展Store接口以支持新的配置系统
interface StoreSchema {
  setting: SettingState
  config: string // 新的统一配置（JSON字符串）
}

const store: any = new Store<StoreSchema>({
  defaults: { 
    setting: schemaSetting,
    config: '' // 新配置系统的默认值
  },
  migrations: {
    '0.0.2': (store) => {
      store.set('setting.listenMode', schemaSetting.listenMode)
    },
    '1.0.0': (store) => {
      // 迁移到新的配置系统
      const oldSetting = store.get('setting')
      if (oldSetting && !store.get('config')) {
        // 如果有旧配置但没有新配置，则进行迁移
        const newConfig = {
          version: '1.0.0',
          settings: oldSetting,
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
        store.set('config', JSON.stringify(newConfig))
      }
    }
  },
  watch: true
})

export function initSettingStore() {
  // 监听来自渲染进程的请求
  ipcMain.on('getStore', <T extends keyof SettingState>(event, key: T) => {
    event.returnValue = store.get(key)
  })

  ipcMain.on('setStore', (_, value) => {
    store.set(value.key, value.value)
  })

  ipcMain.on('clearStore', () => {
    store.clear()
  })
}
