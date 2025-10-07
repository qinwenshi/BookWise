<script setup lang="ts">
import { clearDB } from '@renderer/batabase';
import { CheckBoxView, Select, SelectView, } from '@renderer/components';
import { bookshelfModeList, fontFamilies, langs, nodeModeList, t, themes } from '@renderer/data';
import { useSettings } from '@renderer/store/config';
import SyncSettings from '@renderer/components/sync/SyncSettings.vue';
import AISettings from '@renderer/components/ai/AISettings.vue';

const { settings } = useSettings();
const textOpacity = { '--tw-text-opacity': 0.6 };

</script>

<template>
  <div class="absoulte inset-0 h-full overflow-auto scrollbar-thin">
    <div class="p-6 grid grid-cols-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-screen-2xl">
      <div class="col-span-full">
        <h2 class="font-bold text-2xl ">
          {{ t('setting.userSetting') }}
        </h2>
      </div>
      <div class="col-span-full lg:col-auto flex flex-col gap-6">
        <div class="card w-full bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title">{{ t('setting.language') }} & {{ t('setting.theme') }}</h2>
            <SelectView v-model="settings.lang" :list="langs" :label="t('setting.chooseLanguage')" />
            <label class="form-control w-full max-w-xs">
              <div class="label">
                <span class="label-text" :style="textOpacity">{{ t('setting.chooseTheme') }}</span>
              </div>
              <Select v-model="settings.theme" :is-cloce="false" :list="themes" />
            </label>
            <SelectView v-model="settings.fontFamily" :list="fontFamilies" label="选择字体" />
          </div>
        </div>
        <div class="card w-full bg-base-100 shadow">
          <div class="card-body">
            <h2 class="card-title">{{ t('setting.mode') }}</h2>
            <SelectView v-model="settings.bookshelf" :list="bookshelfModeList" :label="t('setting.bookMode')" />
            <!-- <SelectView v-model="settings.readMode" :list="readModeList" :label="t('setting.readMode')" /> -->
            <SelectView v-model="settings.noteMode" :list="nodeModeList" :label="t('note.mode')" />
          </div>
        </div>
      </div>
      <div class="col-span-full lg:col-span-2">
        <div class="card bg-base-100 shadow w-full">
          <div class="card-body">
            <CheckBoxView v-model="settings.isOpenNew" :title="t('setting.openNewTitle')"
              :desc="t('setting.openNewDesc')" />
            <CheckBoxView v-model="settings.isOpenRecycleBin" :title="t('setting.openRecycleBinTitle')"
              :desc="t('setting.openRecycleBinDesc')" />
            <CheckBoxView v-model="settings.isNoteShowClass" :title="t('setting.noteShowClassTitle')"
              :desc="t('setting.noteShowClassDesc')" />
            <CheckBoxView v-model="settings.isAutoHighlight" :title="t('setting.autoHighlightTitle')"
              :desc="t('setting.autoHighlightDesc')" />
            <CheckBoxView v-model="settings.isRemeberPosition" :title="t('setting.rememberPositionTitle')"
              :desc="t('setting.rememberPositionDesc')" />
            <div>
              <button class="btn btn-error" @click="clearDB()">清空所有数据</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- AI设置 -->
      <div class="col-span-full">
        <AISettings />
      </div>
      
      <!-- 同步设置 -->
      <div class="col-span-full">
        <SyncSettings />
      </div>
    </div>
  </div>
</template>