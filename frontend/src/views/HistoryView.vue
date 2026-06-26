<template>
  <el-card shadow="never">
    <template #header>
      <div class="page-card-header">
        <div class="page-card-header-left">
          <span>执行记录</span>
          <el-tag type="info" size="small">{{ total }}</el-tag>
        </div>
        <el-button type="danger" plain :icon="Delete" @click="handleClear">清空历史</el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="pageRecords" stripe border>
      <template #empty>
        <el-empty description="暂无执行记录" />
      </template>

      <el-table-column label="时间" width="170">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>

      <el-table-column label="脚本" min-width="140" prop="script_name" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.script_name || '—' }}
        </template>
      </el-table-column>

      <el-table-column prop="action" label="动作" width="120" show-overflow-tooltip />

      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.success ? 'success' : 'danger'" size="small">
            {{ row.success ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="命令" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <el-text size="small" tag="code">{{ row.command || '—' }}</el-text>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" align="center">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" :icon="View" @click="handleView(row.id)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(row.id)" />
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 0" class="page-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="PAGE_SIZE_OPTIONS"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
      />
    </div>
  </el-card>

  <el-dialog
    v-model="detailVisible"
    :title="detailRecord?.success ? '执行成功' : '执行失败'"
    width="640px"
    destroy-on-close
  >
    <template v-if="detailRecord">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="时间">{{ formatDateTime(detailRecord.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="脚本">{{ detailRecord.script_name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="动作">{{ detailRecord.action || '—' }}</el-descriptions-item>
        <el-descriptions-item label="命令">{{ detailRecord.command || '—' }}</el-descriptions-item>
        <el-descriptions-item label="变量">{{ formatVariables(detailRecord.variables) }}</el-descriptions-item>
      </el-descriptions>
      <el-divider content-position="left">执行输出</el-divider>
      <el-input
        class="log-output"
        :model-value="formatExecutionLog(detailRecord.output)"
        type="textarea"
        :rows="12"
        readonly
      />
    </template>
    <template #footer>
      <el-button @click="detailVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Delete, View } from '@element-plus/icons-vue';
import {
  fetchHistory,
  fetchHistoryRecord,
  deleteHistoryRecord,
  clearHistory,
} from '@/api/history';
import { showMessage } from '@/utils/request';
import {
  formatDateTime,
  formatExecutionLog,
  formatVariables,
  PAGE_SIZE_OPTIONS,
} from '@/utils';
import type { HistoryRecord } from '@/types';

const loading = ref(false);
const allHistory = ref<HistoryRecord[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const detailVisible = ref(false);
const detailRecord = ref<HistoryRecord | null>(null);

const pageRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return allHistory.value.slice(start, start + pageSize.value);
});

const total = computed(() => allHistory.value.length);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function loadHistory(): Promise<void> {
  loading.value = true;
  try {
    allHistory.value = await fetchHistory();
    const maxPage = Math.max(1, Math.ceil(allHistory.value.length / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  } catch {
    allHistory.value = [];
    currentPage.value = 1;
  } finally {
    loading.value = false;
  }
}

function showDetail(record: HistoryRecord): void {
  detailRecord.value = record;
  detailVisible.value = true;
}

async function handleView(id: number): Promise<void> {
  const record = allHistory.value.find((item) => item.id === id);
  if (record) {
    showDetail(record);
    return;
  }
  try {
    const data = await fetchHistoryRecord(id);
    if (data) {
      showDetail(data);
    } else {
      showMessage('记录不存在', 'error');
    }
  } catch (error) {
    showMessage(getErrorMessage(error, '加载详情失败'), 'error');
  }
}

async function handleDelete(id: number): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要删除这条执行记录吗？', '确认删除', {
      type: 'warning',
    });
    await deleteHistoryRecord(id);
    showMessage('删除成功');
    await loadHistory();
  } catch (error) {
    if (error !== 'cancel') {
      showMessage(getErrorMessage(error, '删除失败'), 'error');
    }
  }
}

async function handleClear(): Promise<void> {
  if (!allHistory.value.length) {
    showMessage('暂无记录可清空', 'error');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '确定要清空所有执行历史吗？此操作不可恢复。',
      '确认清空',
      { type: 'warning' },
    );
    await clearHistory();
    showMessage('已清空执行历史');
    await loadHistory();
  } catch (error) {
    if (error !== 'cancel') {
      showMessage(getErrorMessage(error, '清空失败'), 'error');
    }
  }
}

onMounted(loadHistory);
</script>

<style scoped lang="scss">
// styles in global index.scss
</style>
