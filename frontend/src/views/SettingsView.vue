<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="page-card-header-left">
        <span>应用配置</span>
      </div>
    </template>

    <el-empty v-if="!loading && !configKeys.length" description="暂无配置项" />

    <el-form v-else label-width="200px" label-position="left" class="settings-form">
      <el-form-item v-for="key in configKeys" :key="key" :label="getLabel(key)">
        <el-switch
          v-if="typeof config[key] === 'boolean'"
          v-model="config[key]"
          @change="(val: boolean) => handleSwitchChange(key, val)"
        />
        <el-input-number
          v-else-if="typeof config[key] === 'number'"
          v-model="config[key]"
          :min="1"
          :step="1"
          @change="(val: number) => handleInputChange(key, val)"
        />
        <el-input
          v-else
          v-model="config[key]"
          @change="(val: string) => handleInputChange(key, val)"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchSettings, updateSettings } from '@/api/settings';
import { showMessage } from '@/utils/request';
import { CONFIG_LABELS } from '@/utils';
import type { AppConfig } from '@/types';

const loading = ref(false);
const saving = ref(false);
const config = ref<AppConfig>({});
const configKeys = ref<string[]>([]);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function loadSettings(): Promise<void> {
  loading.value = true;
  try {
    const data = await fetchSettings();
    config.value = { ...data };
    configKeys.value = Object.keys(data);
  } catch {
    configKeys.value = [];
    showMessage('加载配置失败', 'error');
  } finally {
    loading.value = false;
  }
}

function getLabel(key: string): string {
  return CONFIG_LABELS[key] || key;
}

async function updateField(
  key: string,
  value: boolean | number | string,
  revert?: () => void,
): Promise<void> {
  if (saving.value) return;
  saving.value = true;
  try {
    const data = await updateSettings({ [key]: value });
    config.value = { ...data };
    showMessage('已保存');
  } catch (error) {
    revert?.();
    showMessage(getErrorMessage(error, '保存失败'), 'error');
  } finally {
    saving.value = false;
  }
}

function handleSwitchChange(key: string, val: boolean): void {
  const previous = config.value[key];
  updateField(key, val, () => {
    config.value[key] = previous as boolean;
  });
}

function handleInputChange(key: string, val: number | string): void {
  const previous = config.value[key];

  if (typeof previous === 'number') {
    const value = Number(val);
    if (!Number.isInteger(value) || value < 1) {
      showMessage('请输入大于 0 的整数', 'error');
      config.value[key] = previous;
      return;
    }
    if (value === previous) return;
    updateField(key, value, () => {
      config.value[key] = previous;
    });
    return;
  }

  if (val === previous) return;
  updateField(key, val, () => {
    config.value[key] = previous;
  });
}

onMounted(loadSettings);
</script>

<style scoped lang="scss">
// styles in global index.scss
</style>
