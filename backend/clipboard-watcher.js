const { createClipboardRecord } = require('./db');
const { getConfig } = require('./config-cache');

const POLL_INTERVAL_MS = 1000;

let timer = null;
let lastContent = null;
let clipboardModule = null;

async function getClipboardy() {
  if (!clipboardModule) {
    clipboardModule = await import('clipboardy');
  }
  return clipboardModule.default;
}

async function pollClipboard() {
  const config = getConfig();
  if (!config.clipboard_monitoring) {
    return;
  }

  try {
    const clipboardy = await getClipboardy();
    const text = await clipboardy.read();

    if (!text || text === lastContent) {
      return;
    }

    const maxLength = config.clipboard_max_length ?? 1000;
    if (text.length > maxLength) {
      lastContent = text;
      return;
    }

    lastContent = text;
    await createClipboardRecord({ content: text });
  } catch (err) {
    console.error('[clipboard-watcher] 读取剪贴板失败:', err.message);
  }
}

function startClipboardWatcher() {
  stopClipboardWatcher();
  timer = setInterval(() => {
    pollClipboard().catch((err) => {
      console.error('[clipboard-watcher] 轮询异常:', err.message);
    });
  }, POLL_INTERVAL_MS);
}

function stopClipboardWatcher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function syncClipboardWatcher() {
  const config = getConfig();
  if (config.clipboard_monitoring) {
    startClipboardWatcher();
  } else {
    stopClipboardWatcher();
    lastContent = null;
  }
}

module.exports = {
  startClipboardWatcher,
  stopClipboardWatcher,
  syncClipboardWatcher,
};
