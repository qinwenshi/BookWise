import { BookAudio } from '@renderer/batabase'
import { BookAudioAction } from '@renderer/components'

export const useAudio = () => {
  const audiosMap = new Map<string, BookAudio>()

  async function loadAudio(bookId: string, voice: string) {
    const local = await BookAudioAction.findByBookIdAndVoice(bookId, voice)
    if (local) {
      audiosMap.set(bookId, local)
    } else {
    }
  }
}
