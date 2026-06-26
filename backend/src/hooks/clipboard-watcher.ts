import * as clipboardService from '../services/clipboard.service.js';
import { getConfig } from '../services/config.service.js';

const POLL_INTERVAL_MS = 1000;

let timer: ReturnType<typeof setInterval> | null = null;
let lastContent: string | null = null;
let clipboardModule: { default: { read: () => Promise<string> } } | null = null;

async function getClipboardy() {
  if (!clipboardModule) {
    clipboardModule = await import('clipboardy');
  }
  return clipboardModule.default;
}

async function pollClipboard(): Promise<void> {
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
    await clipboardService.createClipboardRecord(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[clipboard-watcher] 读取剪贴板失败:', message);
  }
}

export function startClipboardWatcher(): void {
  stopClipboardWatcher();
  timer = setInterval(() => {
    pollClipboard().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[clipboard-watcher] 轮询异常:', message);
    });
  }, POLL_INTERVAL_MS);
}

export function stopClipboardWatcher(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export async function syncClipboardWatcher(): Promise<void> {
  const config = getConfig();
  if (config.clipboard_monitoring) {
    startClipboardWatcher();
  } else {
    stopClipboardWatcher();
    lastContent = null;
  }
}
