<script setup lang="ts">
import { NoteText } from '@renderer/components';
import { t } from '@renderer/data';
import dayjs from 'dayjs';

withDefaults(defineProps<{ data: NoteText[], opacity?: number, className?: string, show?: boolean }>(), {
  data: () => [],
  opacity: 0.5,
  className: '',
  show: true
})

const emit = defineEmits<{
  (e: 'remove', data: NoteText, index: number): void
}>()


</script>

<template>
  <div v-for="item, index in data"
    class="bg-base-200 text-base-content select-none p-3 hover:bg-info hover:text-info-content" :class="className"
    :style="{ '--tw-bg-opacity': opacity }">
    <div class="flex flex-row justify-between items-center mb-1">
      <div class="stat-desc">{{ dayjs(item.time).format('L LT') }}</div>
      <div v-if="show">
        <button class="btn btn-outline btn-error btn-xs" @click="emit('remove', item, index)">{{ t('common.remove')
          }}</button>
      </div>
    </div>
    <div class="note-content">
      <p class="note-content__text">{{ item.value }}</p>
    </div>
  </div>
</template>

<style scoped>
.note-content {
  max-height: 12rem;
  overflow-y: auto;
}

.note-content__text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
