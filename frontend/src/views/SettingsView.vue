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
        <el-select
          v-else-if="key === 'backup_tables'"
          v-model="backupTables"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="3"
          placeholder="选择要定时备份的数据库表"
          class="backup-tables-select"
          @change="handleBackupTablesChange"
        >
          <template #header>
            <el-checkbox
              :model-value="isAllTablesSelected"
              :indeterminate="isTablesIndeterminate"
              @change="handleSelectAllTables"
            >
              全选
            </el-checkbox>
          </template>
          <el-option
            v-for="table in databaseTables"
            :key="table"
            :label="table"
            :value="table"
          />
        </el-select>
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
import { ref, computed, onMounted } from 'vue';
import { fetchSettings, updateSettings, fetchDatabaseTables } from '@/api/settings';
import { showMessage } from '@/utils/request';
import { CONFIG_LABELS } from '@/utils';
import type { AppConfig } from '@/types';

const loading = ref(false);
const saving = ref(false);
const config = ref<AppConfig>({});
const configKeys = ref<string[]>([]);
const databaseTables = ref<string[]>([]);
const savedBackupTables = ref<string[]>([]);

const backupTables = computed({
  get: () => {
    const value = config.value.backup_tables;
    return Array.isArray(value) ? value : [];
  },
  set: (value: string[]) => {
    config.value.backup_tables = value;
  },
});

const isAllTablesSelected = computed(() => {
  if (!databaseTables.value.length) return false;
  return backupTables.value.length === databaseTables.value.length;
});

const isTablesIndeterminate = computed(() => {
  const selectedCount = backupTables.value.length;
  return selectedCount > 0 && selectedCount < databaseTables.value.length;
});

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function normalizeConfig(data: AppConfig): AppConfig {
  return {
    ...data,
    backup_tables: Array.isArray(data.backup_tables) ? data.backup_tables : [],
  };
}

async function loadDatabaseTables(): Promise<void> {
  try {
    databaseTables.value = await fetchDatabaseTables();
  } catch {
    databaseTables.value = [];
    showMessage('加载数据库表列表失败', 'error');
  }
}

async function loadSettings(): Promise<void> {
  loading.value = true;
  try {
    const [data] = await Promise.all([fetchSettings(), loadDatabaseTables()]);
    config.value = normalizeConfig(data);
    savedBackupTables.value = [...(config.value.backup_tables ?? [])];
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
  value: boolean | number | string | string[],
  revert?: () => void,
): Promise<void> {
  if (saving.value) return;
  saving.value = true;
  try {
    const data = await updateSettings({ [key]: value });
    config.value = normalizeConfig(data);
    if (key === 'backup_tables' && Array.isArray(value)) {
      savedBackupTables.value = [...value];
    }
    if (key === 'close_to_tray_on_close') {
      window.electronAPI?.markCloseBehaviorRemembered();
    }
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

function handleBackupTablesChange(value: string[]): void {
  const previous = [...savedBackupTables.value];
  updateField('backup_tables', value, () => {
    config.value.backup_tables = previous;
  });
}

function handleSelectAllTables(checked: boolean | string | number): void {
  const next = checked ? [...databaseTables.value] : [];
  backupTables.value = next;
  handleBackupTablesChange(next);
}

onMounted(loadSettings);
</script>

<style scoped lang="scss">
.backup-tables-select {
  width: 100%;
}
</style>
