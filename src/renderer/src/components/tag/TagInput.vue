<script setup lang="ts">
import { Tag } from '@renderer/batabase';
import { t } from '@renderer/data';
import { get } from '@vueuse/core';
import { computed, defineProps, withDefaults } from 'vue';
import SelectSearchView from '../select/SelectSearch.vue';
import TagListView from './TagList.vue';
import { TagAction } from './action';
import { TagItem } from './type';

interface Props {
  modelValue: Tag[],
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
})

const emit = defineEmits(['update:modelValue'])

const allTag = TagAction.observable()
const handleTag = (val: Tag[]) => val.map(item => ({ id: item.id, value: item.tagName }))
const toTag = (val: TagItem[]) => {
  const result = val.map(item => get(allTag).find(sub => sub.id === item.id)).filter(Boolean) as Tag[]
  return result
}
const tags = computed(() => handleTag(get(allTag) || []))
const selectTag = computed(() => handleTag(props.modelValue))
const updateTag = (val: TagItem[]) => {
  const tagResult = toTag([...val])
  emit('update:modelValue', tagResult)
}

const addTag = async (val: string) => {
  const res = await TagAction.add(val)
  if (res) {
    const isExist = get(selectTag).find(item => item.value === val)
    if (!isExist) {
      const data = { id: res.id, value: res.tagName }
      updateTag([...get(selectTag), data])
      return data
    }
  }
  return { id: '', value: '' }
}

const removeTag = (i: number) => {
  const data = [...get(selectTag)]
  data.splice(i, 1)
  emit('update:modelValue', toTag(data))
}

</script>

<template>
  <div class="space-y-2">
    <div class="text-sm text-base-content/70">
      <span class="inline-flex items-center gap-1">
        🏷️ 标签
        <span class="text-xs opacity-60">(输入标签名称后按回车添加)</span>
      </span>
    </div>
    <SelectSearchView :modelValue="selectTag" :placeholder="'输入新标签...'" :add="addTag" @update:modelValue="updateTag"
      :data="tags">
      <TagListView :tag="selectTag" @remove="removeTag" />
    </SelectSearchView>
  </div>
</template>