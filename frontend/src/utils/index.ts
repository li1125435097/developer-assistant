import type { Platform } from '@/types';

export const PLATFORM_LABELS: Record<string, string> = {
  'window-cmd': 'Win-CMD',
  'window-powershell': 'Win-PowerShell',
  linux: 'Linux',
  mac: 'Mac',
  all: 'All',
  window: 'Win-CMD',
};

export const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'window-cmd', label: 'Win-CMD' },
  { value: 'window-powershell', label: 'Win-PowerShell' },
  { value: 'linux', label: 'Linux' },
  { value: 'mac', label: 'Mac' },
  { value: 'all', label: 'All' },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const CONFIG_LABELS: Record<string, string> = {
  clipboard_monitoring: '剪贴板监控',
  clipboard_max_length: '剪贴板内容最大长度',
  close_to_tray_on_close: '关闭时最小化到托盘',
};

export function formatPlatformLabel(platform?: string): string {
  return PLATFORM_LABELS[platform ?? ''] || platform || 'Win-CMD';
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatExecutionLog(output?: string | { stdout?: string; stderr?: string }): string {
  if (typeof output === 'string') {
    return output || '(无输出)';
  }
  const parts: string[] = [];
  if (output?.stdout) parts.push(output.stdout);
  if (output?.stderr) parts.push(output.stderr);
  return parts.join('\n').trim() || '(无输出)';
}

export function formatVariables(variables?: Record<string, string>): string {
  const keys = Object.keys(variables || {});
  if (!keys.length) return '—';
  return keys.map((key) => `${key}=${variables![key]}`).join(', ');
}

export function truncateContent(content?: string, maxLen = 120): string {
  if (!content) return '—';
  const text = String(content);
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
