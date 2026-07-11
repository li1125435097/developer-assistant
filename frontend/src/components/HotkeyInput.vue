<template>
  <div class="hotkey-input">
    <el-input
      :model-value="displayValue"
      readonly
      :placeholder="recording ? '请按下快捷键…' : '点击后按下快捷键，用于显示或隐藏窗口'"
      :class="{ recording }"
      @focus="startRecording"
      @blur="stopRecording"
    />
    <el-button v-if="modelValue" @mousedown.prevent @click="clear">清除</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { buildAccelerator, formatAccelerator } from '@/utils/hotkey';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();

const recording = ref(false);

const displayValue = computed(() => {
  if (recording.value) {
    return '请按下快捷键…';
  }
  return formatAccelerator(props.modelValue);
});

function startRecording(): void {
  recording.value = true;
  window.addEventListener('keydown', handleKeyDown, true);
}

function stopRecording(): void {
  recording.value = false;
  window.removeEventListener('keydown', handleKeyDown, true);
}

function handleKeyDown(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();

  if (event.key === 'Escape') {
    stopRecording();
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    emit('update:modelValue', '');
    emit('change', '');
    stopRecording();
    return;
  }

  const accelerator = buildAccelerator(event);
  if (!accelerator) {
    return;
  }

  emit('update:modelValue', accelerator);
  emit('change', accelerator);
  stopRecording();
}

function clear(): void {
  emit('update:modelValue', '');
  emit('change', '');
}

watch(
  () => props.modelValue,
  () => {
    stopRecording();
  },
);

onBeforeUnmount(() => {
  stopRecording();
});
</script>

<style scoped lang="scss">
.hotkey-input {
  display: flex;
  gap: 8px;
  width: 100%;
}

.recording :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}
</style>
