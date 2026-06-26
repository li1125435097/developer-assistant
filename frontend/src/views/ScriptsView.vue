<template>
  <el-card shadow="never">
    <template #header>
      <div class="page-card-header">
        <div class="page-card-header-left">
          <span>脚本列表</span>
          <el-tag type="info" size="small">{{ total }}</el-tag>
        </div>
        <el-button type="primary" :icon="Plus" @click="openAddDialog">添加脚本</el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="pageScripts" stripe border>
      <template #empty>
        <el-empty description="暂无脚本">
          <el-button type="primary" :icon="Plus" @click="openAddDialog">添加第一个脚本</el-button>
        </el-empty>
      </template>

      <el-table-column label="名称" min-width="140" prop="name" show-overflow-tooltip />

      <el-table-column label="适用终端" width="130">
        <template #default="{ row }">
          <el-tag size="small">{{ formatPlatformLabel(row.platform) }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="描述" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.description || '—' }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="140" align="center">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" :icon="Edit" @click="openEditDialog(row.id)" />
            <el-button size="small" :icon="CopyDocument" @click="handleClone(row.id)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(row)" />
          </el-button-group>
        </template>
      </el-table-column>

      <el-table-column label="动作" min-width="200">
        <template #default="{ row }">
          <el-space v-if="row.actions?.length" wrap>
            <el-button
              v-for="(a, idx) in row.actions"
              :key="idx"
              size="small"
              :loading="executingKey === `${row.id}-${idx}`"
              @click="handleActionClick(row.id, idx)"
            >
              {{ a.action }}
            </el-button>
          </el-space>
          <el-text v-else type="info" size="small">无动作</el-text>
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
    v-model="scriptDialogVisible"
    :title="scriptDialogTitle"
    width="640px"
    destroy-on-close
  >
    <el-form label-position="top">
      <el-form-item label="名称" required>
        <el-input v-model="scriptForm.name" placeholder="脚本名称" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="scriptForm.description" type="textarea" :rows="2" placeholder="脚本描述" />
      </el-form-item>
      <el-form-item label="适用终端">
        <el-radio-group v-model="scriptForm.platform">
          <el-radio v-for="opt in PLATFORM_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="动作列表" required>
        <el-space direction="vertical" fill class="action-list">
          <el-card
            v-for="(item, index) in scriptForm.actions"
            :key="index"
            shadow="never"
            class="action-card"
          >
            <el-form-item label="动作名称">
              <el-input v-model="item.action" placeholder="如：构建" />
            </el-form-item>
            <el-form-item label="脚本内容">
              <el-input
                v-model="item.script"
                type="textarea"
                :rows="2"
                placeholder="如：npm run build"
              />
            </el-form-item>
            <el-button type="danger" plain size="small" :icon="Delete" @click="removeActionItem(index)">
              删除
            </el-button>
          </el-card>
          <el-button type="primary" plain :icon="Plus" @click="addActionItem">添加动作</el-button>
          <el-text type="info" size="small">
            脚本支持动态变量，格式为 <code v-pre>{{变量名}}</code>
          </el-text>
        </el-space>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="scriptDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveScript">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="variablesDialogVisible" title="填写变量" width="480px" destroy-on-close>
    <el-form label-position="top">
      <el-form-item v-for="name in variableNames" :key="name" :label="name" required>
        <el-input v-model="variableValues[name]" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="variablesDialogVisible = false">取消</el-button>
      <el-button type="primary" :icon="VideoPlay" @click="runWithVariables">运行</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="resultDialogVisible"
    :title="resultSuccess ? '执行成功' : '执行失败'"
    width="640px"
  >
    <el-input
      class="log-output"
      :model-value="resultLog"
      type="textarea"
      :rows="16"
      readonly
    />
    <template #footer>
      <el-button @click="resultDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Edit, CopyDocument, Delete, Plus, VideoPlay } from '@element-plus/icons-vue';
import {
  fetchScripts,
  fetchScript,
  createScript,
  updateScript,
  deleteScript,
  fetchActionVariables,
  executeScript,
} from '@/api/scripts';
import { showMessage } from '@/utils/request';
import {
  formatPlatformLabel,
  formatExecutionLog,
  PLATFORM_OPTIONS,
  PAGE_SIZE_OPTIONS,
} from '@/utils';
import type { Platform, Script, ScriptAction, ScriptPayload } from '@/types';

interface ScriptForm {
  name: string;
  description: string;
  platform: Platform;
  actions: ScriptAction[];
}

interface PendingExecution {
  scriptId: number;
  actionIndex: number;
}

const loading = ref(false);
const allScripts = ref<Script[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const scriptDialogVisible = ref(false);
const scriptDialogTitle = ref('添加脚本');
const editingId = ref<number | null>(null);
const saving = ref(false);

const scriptForm = ref<ScriptForm>({
  name: '',
  description: '',
  platform: 'window-cmd',
  actions: [{ action: '', script: '' }],
});

const variablesDialogVisible = ref(false);
const variableNames = ref<string[]>([]);
const variableValues = ref<Record<string, string>>({});
const pendingExecution = ref<PendingExecution | null>(null);

const resultDialogVisible = ref(false);
const resultSuccess = ref(true);
const resultLog = ref('');
const executingKey = ref('');

const pageScripts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return allScripts.value.slice(start, start + pageSize.value);
});

const total = computed(() => allScripts.value.length);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function loadScripts(): Promise<void> {
  loading.value = true;
  try {
    allScripts.value = await fetchScripts();
    const maxPage = Math.max(1, Math.ceil(allScripts.value.length / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  } catch {
    allScripts.value = [];
    currentPage.value = 1;
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  editingId.value = null;
  scriptDialogTitle.value = '添加脚本';
  scriptForm.value = {
    name: '',
    description: '',
    platform: 'window-cmd',
    actions: [{ action: '', script: '' }],
  };
}

function openAddDialog(): void {
  resetForm();
  scriptDialogVisible.value = true;
}

async function openEditDialog(id: number): Promise<void> {
  try {
    const script = await fetchScript(id);
    if (!script) {
      showMessage('脚本不存在', 'error');
      return;
    }
    editingId.value = script.id;
    scriptDialogTitle.value = '编辑脚本';
    let platform: Platform = script.platform || 'window-cmd';
    if (platform === 'window') platform = 'window-cmd';
    scriptForm.value = {
      name: script.name,
      description: script.description || '',
      platform,
      actions: script.actions?.length
        ? script.actions.map((a) => ({ action: a.action, script: a.script }))
        : [{ action: '', script: '' }],
    };
    scriptDialogVisible.value = true;
  } catch (error) {
    showMessage(getErrorMessage(error, '加载脚本失败'), 'error');
  }
}

function addActionItem(): void {
  scriptForm.value.actions.push({ action: '', script: '' });
}

function removeActionItem(index: number): void {
  if (scriptForm.value.actions.length <= 1) {
    showMessage('至少保留一个动作', 'error');
    return;
  }
  scriptForm.value.actions.splice(index, 1);
}

async function saveScript(): Promise<void> {
  const { name, description, platform, actions } = scriptForm.value;
  const validActions = actions.filter((a) => a.action.trim() && a.script.trim());

  if (!name.trim()) {
    showMessage('请填写名称', 'error');
    return;
  }
  if (validActions.length !== actions.length) {
    showMessage('请填写完整的动作名称和脚本', 'error');
    return;
  }

  saving.value = true;
  const payload: ScriptPayload = {
    name: name.trim(),
    description: description.trim(),
    platform,
    actions: validActions.map((a) => ({
      action: a.action.trim(),
      script: a.script.trim(),
    })),
  };

  try {
    if (editingId.value) {
      await updateScript(editingId.value, payload);
      showMessage('更新成功');
    } else {
      await createScript(payload);
      showMessage('添加成功');
    }
    scriptDialogVisible.value = false;
    await loadScripts();
  } catch (error) {
    showMessage(getErrorMessage(error, '保存失败'), 'error');
  } finally {
    saving.value = false;
  }
}

async function handleClone(id: number): Promise<void> {
  try {
    const script = await fetchScript(id);
    if (!script) {
      showMessage('脚本不存在', 'error');
      return;
    }
    await createScript({
      name: script.name + '克隆',
      description: script.description || '',
      platform: script.platform || 'window-cmd',
      actions: (script.actions || []).map((a) => ({
        action: a.action,
        script: a.script,
      })),
    });
    showMessage('克隆成功');
    await loadScripts();
  } catch (error) {
    showMessage(getErrorMessage(error, '克隆失败'), 'error');
  }
}

async function handleDelete(script: Script): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定要删除脚本「${script.name}」吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' },
    );
    await deleteScript(script.id);
    showMessage('删除成功');
    await loadScripts();
  } catch (error) {
    if (error !== 'cancel') {
      showMessage(getErrorMessage(error, '删除失败'), 'error');
    }
  }
}

async function handleActionClick(scriptId: number, actionIndex: number): Promise<void> {
  try {
    const variables = await fetchActionVariables(scriptId, actionIndex);
    if (!variables.length) {
      await runScript(scriptId, actionIndex, {});
    } else {
      pendingExecution.value = { scriptId, actionIndex };
      variableNames.value = variables;
      variableValues.value = Object.fromEntries(variables.map((v) => [v, '']));
      variablesDialogVisible.value = true;
    }
  } catch (error) {
    showMessage(getErrorMessage(error, '获取变量失败'), 'error');
  }
}

async function runWithVariables(): Promise<void> {
  for (const name of variableNames.value) {
    if (!variableValues.value[name]?.trim()) {
      showMessage(`请填写 ${name}`, 'error');
      return;
    }
  }
  const execution = pendingExecution.value;
  if (!execution) return;

  variablesDialogVisible.value = false;
  const variables = { ...variableValues.value };
  pendingExecution.value = null;
  await runScript(execution.scriptId, execution.actionIndex, variables);
}

async function runScript(
  scriptId: number,
  actionIndex: number,
  variables: Record<string, string>,
): Promise<void> {
  executingKey.value = `${scriptId}-${actionIndex}`;
  try {
    const res = await executeScript(scriptId, actionIndex, variables);
    if (res.success) {
      resultSuccess.value = true;
      resultLog.value = formatExecutionLog(res.data);
    } else {
      resultSuccess.value = false;
      resultLog.value = res.error || '未知错误';
    }
    resultDialogVisible.value = true;
  } catch (error) {
    resultSuccess.value = false;
    resultLog.value = getErrorMessage(error, '请求失败');
    resultDialogVisible.value = true;
  } finally {
    executingKey.value = '';
  }
}

onMounted(loadScripts);
</script>

<style scoped lang="scss">
.action-list {
  width: 100%;
}
</style>
