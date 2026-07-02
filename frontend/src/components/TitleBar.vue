<template>
  <header class="title-bar" :class="{ 'is-maximized': isMaximized }">
    <div class="title-bar-drag">
      <span class="title-bar-icon">
        <el-icon :size="14"><Monitor /></el-icon>
      </span>
      <span class="title-bar-text">{{ title }}</span>
    </div>

    <div class="title-bar-controls">
      <button
        type="button"
        class="title-bar-btn"
        aria-label="最小化"
        @click="handleMinimize"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <rect x="1.5" y="5.5" width="9" height="1" fill="currentColor" />
        </svg>
      </button>

      <button
        type="button"
        class="title-bar-btn"
        :aria-label="isMaximized ? '还原' : '最大化'"
        @click="handleMaximize"
      >
        <svg v-if="!isMaximized" viewBox="0 0 12 12" aria-hidden="true">
          <rect
            x="2"
            y="2"
            width="8"
            height="8"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
          />
        </svg>
        <svg v-else viewBox="0 0 12 12" aria-hidden="true">
          <rect
            x="3.5"
            y="1.5"
            width="6"
            height="6"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
          />
          <rect
            x="1.5"
            y="3.5"
            width="6"
            height="6"
            fill="var(--title-bar-bg)"
            stroke="currentColor"
            stroke-width="1"
          />
        </svg>
      </button>

      <button
        type="button"
        class="title-bar-btn title-bar-btn-close"
        aria-label="关闭"
        @click="handleClose"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 2.5l7 7M9.5 2.5l-7 7"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Monitor } from '@element-plus/icons-vue';

defineProps<{
  title?: string;
}>();

const isMaximized = ref(false);
let removeMaximizeListener: (() => void) | undefined;

function handleMinimize(): void {
  window.electronAPI?.minimize();
}

async function handleMaximize(): Promise<void> {
  if (!window.electronAPI) {
    return;
  }

  isMaximized.value = await window.electronAPI.maximize();
}

function handleClose(): void {
  window.electronAPI?.close();
}

onMounted(async () => {
  if (!window.electronAPI) {
    return;
  }

  isMaximized.value = await window.electronAPI.isMaximized();
  removeMaximizeListener = window.electronAPI.onMaximizeChange((maximized) => {
    isMaximized.value = maximized;
  });
});

onUnmounted(() => {
  removeMaximizeListener?.();
});
</script>
