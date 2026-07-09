<template>
  <el-card shadow="never">
    <template #header>
      <div class="page-card-header">
        <div class="page-card-header-left">
          <span>记事本</span>
          <el-tag type="info" size="small">{{ totalRecords }}</el-tag>
          <div class="note-search-group">
            <div class="note-search-field">
              <span class="note-search-label">内容</span>
              <el-input
                v-model="searchKeyword"
                placeholder="搜索内容"
                clearable
                style="width: 220px"
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              />
            </div>
            <div class="note-search-field">
              <span class="note-search-label">标签</span>
              <el-input
                v-model="searchTagKeyword"
                placeholder="搜索标签"
                clearable
                style="width: 220px"
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              />
            </div>
          </div>
          <el-button :icon="Search" @click="handleSearch">搜索</el-button>
        </div>
        <el-space wrap>
          
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建</el-button>
        </el-space>
      </div>
    </template>

    <el-table v-loading="loading" :data="records" stripe border>
      <template #empty>
        <el-empty description="暂无记事本">
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建第一条记事</el-button>
        </el-empty>
      </template>

      <el-table-column label="内容" min-width="280">
        <template #default="{ row }">
          <div class="note-content-cell">
            <el-icon v-if="row.pinned" class="note-pin-icon" color="var(--el-color-warning)">
              <Top />
            </el-icon>
            <div class="note-content-preview" v-html="row.content || '—'" />
          </div>
        </template>
      </el-table-column>

      <el-table-column label="标签" min-width="160">
        <template #default="{ row }">
          <el-space v-if="row.tags?.length" wrap>
            <el-tag v-for="tag in row.tags" :key="tag.id" size="small" type="info">
              {{ tag.name }}
            </el-tag>
          </el-space>
          <el-text v-else type="info" size="small">—</el-text>
        </template>
      </el-table-column>

      <el-table-column label="时间" width="170">
        <template #default="{ row }">
          {{ formatDateTime(row.updated_at || row.created_at) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" :icon="Edit" @click="openEditDialog(row.id)" />
            <el-button
              size="small"
              :type="row.pinned ? 'warning' : 'default'"
              :icon="Top"
              @click="handleTogglePin(row)"
            />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(row)" />
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
        @current-change="loadNotes"
        @size-change="handleSizeChange"
      />
    </div>
  </el-card>

  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="720px"
    destroy-on-close
    @closed="resetForm"
  >
    <div class="notebook-dialog-body">
      <el-form label-position="top">
        <el-form-item label="内容">
          <RichTextEditor v-model="noteForm.content" />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="noteForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            collapse-tags
            collapse-tags-tooltip
            :reserve-keyword="false"
            placeholder="选择或输入标签"
            style="width: 100%"
            @visible-change="handleTagSelectVisible"
          >
            <el-option
              v-for="tag in tagOptions"
              :key="tag.id"
              :label="tag.name"
              :value="tag.name"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveNote">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Edit, Delete, Plus, Search, Top } from '@element-plus/icons-vue';
import RichTextEditor from '@/components/RichTextEditor.vue';
import {
  fetchNotebookNotes,
  fetchNotebookNote,
  createNotebookNote,
  updateNotebookNote,
  deleteNotebookNote,
  toggleNotebookPin,
  fetchNotebookTags,
} from '@/api/notebooks';
import { showMessage } from '@/utils/request';
import { formatDateTime, PAGE_SIZE_OPTIONS } from '@/utils';
import type { NotebookNote, NotebookTag } from '@/types';

interface NoteForm {
  content: string;
  tags: string[];
}

const loading = ref(false);
const saving = ref(false);
const records = ref<NotebookNote[]>([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const activeSearch = ref('');
const activeTagSearch = ref('');

const searchKeyword = ref('');
const searchTagKeyword = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('新建记事本');
const editingId = ref<number | null>(null);

const noteForm = ref<NoteForm>({
  content: '',
  tags: [],
});

const tagOptions = ref<NotebookTag[]>([]);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function loadTagOptions(): Promise<void> {
  try {
    tagOptions.value = await fetchNotebookTags();
  } catch {
    tagOptions.value = [];
  }
}

async function loadNotes(): Promise<void> {
  loading.value = true;
  try {
    const result = await fetchNotebookNotes(
      currentPage.value,
      pageSize.value,
      activeSearch.value,
      activeTagSearch.value,
    );
    records.value = result.records;
    totalRecords.value = result.total;
  } catch {
    records.value = [];
    totalRecords.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch(): void {
  activeSearch.value = searchKeyword.value.trim();
  activeTagSearch.value = searchTagKeyword.value.trim();
  currentPage.value = 1;
  loadNotes();
}

function handleSizeChange(): void {
  currentPage.value = 1;
  loadNotes();
}

function resetForm(): void {
  editingId.value = null;
  dialogTitle.value = '新建记事本';
  noteForm.value = { content: '', tags: [] };
}

function openCreateDialog(): void {
  resetForm();
  dialogVisible.value = true;
  loadTagOptions();
}

async function openEditDialog(id: number): Promise<void> {
  try {
    const note = await fetchNotebookNote(id);
    editingId.value = note.id;
    dialogTitle.value = '编辑记事本';
    noteForm.value = {
      content: note.content,
      tags: note.tags.map((tag) => tag.name),
    };
    dialogVisible.value = true;
    await loadTagOptions();
  } catch (error) {
    showMessage(getErrorMessage(error, '加载记事本失败'), 'error');
  }
}

function handleTagSelectVisible(visible: boolean): void {
  if (visible) {
    loadTagOptions();
  }
}

async function saveNote(): Promise<void> {
  const content = noteForm.value.content.trim();
  const tags = noteForm.value.tags.map((tag) => tag.trim()).filter(Boolean);

  if (!content || content === '<p><br></p>') {
    showMessage('请填写内容', 'error');
    return;
  }

  saving.value = true;
  const payload = { content, tags };

  try {
    if (editingId.value) {
      await updateNotebookNote(editingId.value, payload);
      showMessage('更新成功');
    } else {
      await createNotebookNote(payload);
      showMessage('创建成功');
    }
    dialogVisible.value = false;
    await loadNotes();
    await loadTagOptions();
  } catch (error) {
    showMessage(getErrorMessage(error, '保存失败'), 'error');
  } finally {
    saving.value = false;
  }
}

async function handleTogglePin(note: NotebookNote): Promise<void> {
  try {
    await toggleNotebookPin(note.id);
    showMessage(note.pinned ? '已取消置顶' : '已置顶');
    await loadNotes();
  } catch (error) {
    showMessage(getErrorMessage(error, '操作失败'), 'error');
  }
}

async function handleDelete(note: NotebookNote): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要删除这条记事吗？此操作不可恢复。', '确认删除', {
      type: 'warning',
    });
    await deleteNotebookNote(note.id);
    showMessage('删除成功');
    await loadNotes();
  } catch (error) {
    if (error !== 'cancel') {
      showMessage(getErrorMessage(error, '删除失败'), 'error');
    }
  }
}

onMounted(async () => {
  await Promise.all([loadNotes(), loadTagOptions()]);
});
</script>

<style scoped lang="scss">
.note-search-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-search-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.note-search-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: normal;
  color: var(--el-text-color-regular);
}

.note-content-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.note-pin-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.note-content-preview {
  flex: 1;
  min-width: 0;
  max-height: 60px;
  overflow: hidden;
  line-height: 1.5;
  word-break: break-word;

  :deep(p) {
    margin: 0;
  }

  :deep(img) {
    max-width: 100%;
    max-height: 48px;
  }
}

.notebook-dialog-body {
  max-height: min(70vh, calc(100vh - 220px));
  overflow-y: auto;
  padding: 4px 0;
  scrollbar-width: thin;
}
</style>
