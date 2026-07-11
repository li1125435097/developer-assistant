const KEY_MAP: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Esc',
};

function normalizeKey(event: KeyboardEvent): string | null {
  if (event.key === 'Process' || event.key === 'Unidentified') {
    return null;
  }

  if (KEY_MAP[event.key]) {
    return KEY_MAP[event.key];
  }

  if (/^F\d{1,2}$/.test(event.key)) {
    return event.key;
  }

  if (event.key.length === 1) {
    return event.key.toUpperCase();
  }

  return null;
}

export function buildAccelerator(event: KeyboardEvent): string | null {
  const key = normalizeKey(event);
  if (!key) {
    return null;
  }

  if (['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(event.key)) {
    return null;
  }

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }

  if (!parts.length) {
    return null;
  }

  parts.push(key);
  return parts.join('+');
}

export function formatAccelerator(accelerator: string): string {
  if (!accelerator) {
    return '';
  }

  const isMac = window.electronAPI?.platform === 'darwin';
  return accelerator
    .split('+')
    .map((part) => {
      if (part === 'CommandOrControl') {
        return isMac ? '⌘' : 'Ctrl';
      }
      if (part === 'Alt') {
        return isMac ? '⌥' : 'Alt';
      }
      if (part === 'Shift') {
        return isMac ? '⇧' : 'Shift';
      }
      return part;
    })
    .join(' + ');
}
