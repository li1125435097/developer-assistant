<template>
  <div class="rich-text-editor" :class="{ 'is-readonly': readonly }">
    <Toolbar
      v-if="!readonly"
      class="rich-text-editor-toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
    />
    <Editor
      class="rich-text-editor-body"
      :style="{ height }"
      :default-config="editorConfig"
      mode="default"
      @on-created="handleCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from 'vue';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    readonly?: boolean;
    height?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: '',
    readonly: false,
    height: '280px',
    placeholder: '请输入内容…',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editorRef = shallowRef<IDomEditor>();

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['group-video', 'fullScreen'],
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  readOnly: props.readonly,
  MENU_CONF: {},
};

function handleCreated(editor: IDomEditor): void {
  editorRef.value = editor;
  editor.setHtml(props.modelValue || '');

  editor.on('change', () => {
    emit('update:modelValue', editor.getHtml());
  });
}

watch(
  () => props.modelValue,
  (value) => {
    const editor = editorRef.value;
    if (!editor) return;
    const current = editor.getHtml();
    if (value !== current) {
      editor.setHtml(value || '');
    }
  },
);

watch(
  () => props.readonly,
  (readonly) => {
    if (readonly) {
      editorRef.value?.disable();
    } else {
      editorRef.value?.enable();
    }
  },
);

onBeforeUnmount(() => {
  editorRef.value?.destroy();
});
</script>

<style scoped lang="scss">
.rich-text-editor {
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
}

.rich-text-editor-toolbar {
  border-bottom: 1px solid var(--el-border-color);
}

.rich-text-editor-body {
  overflow-y: auto;
}

.is-readonly :deep(.w-e-toolbar) {
  display: none;
}
</style>
