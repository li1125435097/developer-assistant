<template>
  <el-card shadow="never">
    <template #header>
      <div class="page-card-header">
        <div class="page-card-header-left">
          <span>剪贴板记录</span>
          <el-tag v-if="monitoringEnabled" type="success" size="small" effect="dark">记录中</el-tag>
          <el-tag type="info" size="small">{{ totalRecords }}</el-tag>
        </div>
        <el-space>
          <el-button
            :type="monitoringEnabled ? 'success' : 'default'"
            :loading="toggling"
            @click="handleToggleMonitoring"
          >
            <el-icon class="el-icon--left">
              <VideoPause v-if="monitoringEnabled" />
              <VideoPlay v-else />
            </el-icon>
            {{ monitoringEnabled ? '停止记录' : '开始记录' }}
          </el-button>
          <el-button type="danger" plain :icon="Delete" @click="handleClear">清空记录</el-button>
        </el-space>
      </div>
    </template>

    <el-table v-loading="loading" :data="records" stripe border>
      <template #empty>
        <el-empty description="暂无剪贴板记录" />
      </template>

      <el-table-column label="时间" width="170">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>

      <el-table-column label="内容" min-width="300" show-overflow-tooltip>
        <template #default="{ row }">
          <el-text size="small" tag="code">{{ truncateContent(row.content, 120) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="140" align="center">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" :icon="View" @click="handleView(row.id)" />
            <el-button size="small" :icon="DocumentCopy" @click="handleCopy(row.id)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(row.id)" />
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="totalRecords > 0" class="page-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="PAGE_SIZE_OPTIONS"
        :total="totalRecords"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </el-card>

  <el-dialog v-model="detailVisible" title="剪贴板内容" width="640px" destroy-on-close>
    <template v-if="detailRecord">
      <el-text type="info" size="small">{{ formatDateTime(detailRecord.created_at) }}</el-text>
      <el-divider />
      <el-input
        class="log-output"
        :model-value="detailRecord.content"
        type="textarea"
        :rows="14"
        readonly
      />
    </template>
    <template #footer>
      <el-button type="primary" plain :icon="DocumentCopy" @click="handleCopyDetail">复制内容</el-button>
      <el-button @click="detailVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Delete, View, DocumentCopy, VideoPlay, VideoPause } from '@element-plus/icons-vue';
import {
  fetchClipboardConfig,
  updateClipboardConfig,
  fetchClipboardRecords,
  fetchClipboardRecord,
  deleteClipboardRecord,
  clearClipboardRecords,
} from '@/api/clipboard';
import { showMessage } from '@/utils/request';
import {
  formatDateTime,
  truncateContent,
  copyToClipboard,
  PAGE_SIZE_OPTIONS,
} from '@/utils';
import type { ClipboardRecord } from '@/types';

const loading = ref(false);
const records = ref<ClipboardRecord[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const totalRecords = ref(0);
const monitoringEnabled = ref(false);
const toggling = ref(false);

const detailVisible = ref(false);
const detailRecord = ref<ClipboardRecord | null>(null);

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function loadConfig(): Promise<void> {
  try {
    const config = await fetchClipboardConfig();
    monitoringEnabled.value = Boolean(config.clipboard_monitoring);
  } catch {
    monitoringEnabled.value = false;
  }
}

async function loadRecords(): Promise<void> {
  loading.value = true;
  try {
    const result = await fetchClipboardRecords(currentPage.value, pageSize.value);
    totalRecords.value = result.total;
    currentPage.value = result.page;
    pageSize.value = result.pageSize;
    records.value = result.records;
  } catch {
    records.value = [];
    totalRecords.value = 0;
  } finally {
    loading.value = false;
  }
}

function startAutoRefresh(): void {
  stopAutoRefresh();
  if (!monitoringEnabled.value) return;
  refreshTimer = setInterval(loadRecords, 3000);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function handleToggleMonitoring(): Promise<void> {
  toggling.value = true;
  const next = !monitoringEnabled.value;
  try {
    const data = await updateClipboardConfig({ clipboard_monitoring: next });
    monitoringEnabled.value = Boolean(data.clipboard_monitoring);
    showMessage(monitoringEnabled.value ? '已开始记录剪贴板' : '已停止记录剪贴板');
    startAutoRefresh();
  } catch (error) {
    showMessage(getErrorMessage(error, '更新配置失败'), 'error');
  } finally {
    toggling.value = false;
  }
}

async function handleView(id: number): Promise<void> {
  try {
    const record = await fetchClipboardRecord(id);
    if (record) {
      detailRecord.value = record;
      detailVisible.value = true;
    } else {
      showMessage('记录不存在', 'error');
    }
  } catch (error) {
    showMessage(getErrorMessage(error, '加载详情失败'), 'error');
  }
}

async function handleCopy(id: number): Promise<void> {
  try {
    const record = await fetchClipboardRecord(id);
    if (!record) {
      showMessage('记录不存在', 'error');
      return;
    }
    await copyToClipboard(record.content || '');
    showMessage('已复制到剪贴板');
  } catch (error) {
    showMessage(getErrorMessage(error, '复制失败'), 'error');
  }
}

async function handleCopyDetail(): Promise<void> {
  try {
    await copyToClipboard(detailRecord.value?.content || '');
    showMessage('已复制到剪贴板');
  } catch {
    showMessage('复制失败', 'error');
  }
}

async function handleDelete(id: number): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要删除这条剪贴板记录吗？', '确认删除', {
      type: 'warning',
    });
    await deleteClipboardRecord(id);
    showMessage('删除成功');
    if (totalRecords.value > 1 && (currentPage.value - 1) * pageSize.value >= totalRecords.value - 1) {
      currentPage.value = Math.max(1, currentPage.value - 1);
    }
    await loadRecords();
  } catch (error) {
    if (error !== 'cancel') {
      showMessage(getErrorMessage(error, '删除失败'), 'error');
    }
  }
}

async function handleClear(): Promise<void> {
  if (!totalRecords.value) {
    showMessage('暂无记录可清空', 'error');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '确定要清空所有剪贴板记录吗？此操作不可恢复。',
      '确认清空',
      { type: 'warning' },
    );
    await clearClipboardRecords();
    showMessage('已清空剪贴板记录');
    currentPage.value = 1;
    await loadRecords();
  } catch (error) {
    if (error !== 'cancel') {
      showMessage(getErrorMessage(error, '清空失败'), 'error');
    }
  }
}

function handlePageChange(page: number): void {
  currentPage.value = page;
  loadRecords();
}

function handleSizeChange(size: number): void {
  pageSize.value = size;
  currentPage.value = 1;
  loadRecords();
}

onMounted(async () => {
  await loadConfig();
  await loadRecords();
  startAutoRefresh();
});

onUnmounted(stopAutoRefresh);
</script>

<style scoped lang="scss">
// styles in global index.scss
</style>
