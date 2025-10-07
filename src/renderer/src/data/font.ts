const fontData = [
  { id: 'fzjzxf', name: '方正静蕴小方', value: 'fzjzxf' },
  { id: 'KingHwa_OldSong', name: '华康古籍宋体', value: 'KingHwa_OldSong' },
  { id: 'fzss', name: '方正书宋', value: 'fzss' },
  { id: 'system', name: '系统默认', value: 'system-ui, -apple-system, sans-serif' }
]

export const fonts: { id: string; name: string; value: string }[] = fontData

export const fontFamilies = fonts.map(font => ({
  id: font.id,
  value: font.name
}))