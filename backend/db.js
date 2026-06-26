const fs = require('fs');
const path = require('path');

const DB_DIR = process.env.DATABASE_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'db.json');

const defaultData = {
  scripts: [],
  executions: [],
  config: { clipboard_monitoring: false, clipboard_max_length: 1000 },
  clipboard_records: [],
};

let db;

async function initDb() {
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');

  fs.mkdirSync(DB_DIR, { recursive: true });

  const adapter = new JSONFile(DB_PATH);
  db = new Low(adapter, defaultData);
  await db.read();

  if (!db.data) {
    db.data = { ...defaultData };
    await db.write();
  }

  if (!Array.isArray(db.data.scripts)) {
    db.data.scripts = [];
    await db.write();
  }

  if (!Array.isArray(db.data.executions)) {
    db.data.executions = [];
    await db.write();
  }

  if (!db.data.config || typeof db.data.config !== 'object') {
    db.data.config = { ...defaultData.config };
    await db.write();
  }

  if (typeof db.data.config.clipboard_monitoring !== 'boolean') {
    db.data.config.clipboard_monitoring = false;
    await db.write();
  }

  if (
    typeof db.data.config.clipboard_max_length !== 'number' ||
    !Number.isInteger(db.data.config.clipboard_max_length) ||
    db.data.config.clipboard_max_length < 1
  ) {
    db.data.config.clipboard_max_length = defaultData.config.clipboard_max_length;
    await db.write();
  }

  if (!Array.isArray(db.data.clipboard_records)) {
    db.data.clipboard_records = [];
    await db.write();
  }
}

async function getAllScripts() {
  return [...db.data.scripts].sort((a, b) => b.id - a.id);
}

async function createScript({ name, description, platform, actions }) {
  const nextId =
    db.data.scripts.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  const now = new Date().toISOString();

  const script = {
    id: nextId,
    name,
    description: description || '',
    platform: platform || 'window-cmd',
    actions,
    created_at: now,
    updated_at: now,
  };

  db.data.scripts.push(script);
  await db.write();
  return script;
}

async function getScriptById(id) {
  return db.data.scripts.find((s) => s.id === id) ?? null;
}

async function updateScript(id, { name, description, platform, actions }) {
  const index = db.data.scripts.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const script = {
    ...db.data.scripts[index],
    name,
    description: description || '',
    platform: platform || 'window-cmd',
    actions,
    updated_at: now,
  };

  db.data.scripts[index] = script;
  await db.write();
  return script;
}

async function deleteScript(id) {
  const index = db.data.scripts.findIndex((s) => s.id === id);
  if (index === -1) return false;

  db.data.scripts.splice(index, 1);
  await db.write();
  return true;
}

async function getAllExecutions() {
  return [...db.data.executions].sort((a, b) => b.id - a.id);
}

async function createExecution(record) {
  const nextId =
    db.data.executions.reduce((max, e) => Math.max(max, e.id), 0) + 1;
  const now = new Date().toISOString();

  const execution = {
    id: nextId,
    ...record,
    created_at: now,
  };

  db.data.executions.push(execution);
  await db.write();
  return execution;
}

async function getExecutionById(id) {
  return db.data.executions.find((e) => e.id === id) ?? null;
}

async function deleteExecution(id) {
  const index = db.data.executions.findIndex((e) => e.id === id);
  if (index === -1) return false;

  db.data.executions.splice(index, 1);
  await db.write();
  return true;
}

async function clearExecutions() {
  db.data.executions = [];
  await db.write();
}

async function loadConfig() {
  return { ...db.data.config };
}

async function saveConfig(config) {
  db.data.config = { ...config };
  await db.write();
}

async function getClipboardRecordsPaginated(page = 1, pageSize = 10) {
  const sorted = [...db.data.clipboard_records].sort((a, b) => b.id - a.id);
  const total = sorted.length;
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const start = (safePage - 1) * safePageSize;
  const records = sorted.slice(start, start + safePageSize);

  return {
    records,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

async function createClipboardRecord({ content }) {
  const nextId =
    db.data.clipboard_records.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  const now = new Date().toISOString();

  const record = {
    id: nextId,
    content,
    created_at: now,
  };

  db.data.clipboard_records.push(record);
  await db.write();
  return record;
}

async function getClipboardRecordById(id) {
  return db.data.clipboard_records.find((r) => r.id === id) ?? null;
}

async function deleteClipboardRecord(id) {
  const index = db.data.clipboard_records.findIndex((r) => r.id === id);
  if (index === -1) return false;

  db.data.clipboard_records.splice(index, 1);
  await db.write();
  return true;
}

async function clearClipboardRecords() {
  db.data.clipboard_records = [];
  await db.write();
}

module.exports = {
  initDb,
  getAllScripts,
  createScript,
  getScriptById,
  updateScript,
  deleteScript,
  getAllExecutions,
  createExecution,
  getExecutionById,
  deleteExecution,
  clearExecutions,
  loadConfig,
  saveConfig,
  getClipboardRecordsPaginated,
  createClipboardRecord,
  getClipboardRecordById,
  deleteClipboardRecord,
  clearClipboardRecords,
};
