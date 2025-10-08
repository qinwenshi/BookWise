<script setup lang="ts">
import { Note } from '@renderer/batabase';
import { t } from '@renderer/data';
import dayjs from 'dayjs';
import TagListView from '../../tag/TagList.vue';
import { TagAction } from '../../tag/action';
import { NoteAction, NoteText } from '../action';
import { ref } from 'vue';

const props = defineProps<{ note: Note, noteList: NoteText[] }>()

const editableNoteList = ref(JSON.parse(JSON.stringify(props.noteList)))

// 跳转
const jump = (value: Note) => NoteAction.jumpToBook(value)
</script>

<template>
  <div v-if="note.createTime">
    {{ dayjs(note.createTime).format('L LT') }}
  </div>
  <div class="prose">
    <blockquote class="my-[1em] ">
      <p class=" my-[0.6em]" v-for="item in NoteAction.getDomSource(note.domSource)">{{ item.text }}</p>
    </blockquote>
  </div>
  <!-- 笔记内容 -->
  <div class="bg-base-200 p-3 rounded-md grid grid-cols-1 divide-y">
    <div v-for="(item, index) in editableNoteList" :key="index"> :key="index">
      <div class="flex flex-row justify-between items-center mt-3">
        <div class="stat-desc">{{ dayjs(item.time).format('L LT') }}</div>
      </div>
      <textarea class="textarea textarea-bordered w-full" v-model="item.value"></textarea>
    </div>
  </div>
  <!-- 笔记标签 -->
  <div v-if="TagAction.toTag(note.tag).length" class="pt-2 flex flex-wrap flex-row gap-2">
    <TagListView :tag="TagAction.toTag(note.tag)" :show="false" />
  </div>
  <div class="pt-2 text-right">
    <span class="text-base-content/70">{{ t('common.comeFrom') }}----</span>
    <a class="link link-accent" @click="jump(note)">{{ note.eBookName }}</a>
  </div>
</template>