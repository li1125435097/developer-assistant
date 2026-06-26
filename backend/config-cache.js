const { loadConfig, saveConfig } = require('./db');

let cache = null;

async function initConfigCache() {
  cache = await loadConfig();
}

function getConfig() {
  if (!cache) {
    throw new Error('Config cache 尚未初始化');
  }
  return { ...cache };
}

function validateUpdates(updates) {
  const errors = [];

  if (updates.clipboard_monitoring !== undefined) {
    if (typeof updates.clipboard_monitoring !== 'boolean') {
      errors.push('clipboard_monitoring 必须为布尔值');
    }
  }

  if (updates.clipboard_max_length !== undefined) {
    const value = updates.clipboard_max_length;
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 1
    ) {
      errors.push('clipboard_max_length 必须为大于 0 的整数');
    }
  }

  for (const key of Object.keys(updates)) {
    if (!(key in cache)) {
      errors.push(`未知配置项: ${key}`);
    }
  }

  return errors;
}

async function setConfig(updates) {
  if (!cache) {
    throw new Error('Config cache 尚未初始化');
  }

  const errors = validateUpdates(updates);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    throw err;
  }

  cache = { ...cache, ...updates };
  await saveConfig(cache);
  return { ...cache };
}

module.exports = {
  initConfigCache,
  getConfig,
  setConfig,
};
