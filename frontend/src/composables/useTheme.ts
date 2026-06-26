import { ref, onMounted, onUnmounted } from 'vue';
import type { ThemeMode } from '@/types';

const STORAGE_KEY = 'app-theme';

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkClass(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark);
}

export function useTheme() {
  const themeMode = ref<ThemeMode>('auto');
  let mediaQuery: MediaQueryList | null = null;

  function resolveDark(mode: ThemeMode): boolean {
    if (mode === 'auto') return getSystemDark();
    return mode === 'dark';
  }

  function applyTheme(mode: ThemeMode): void {
    themeMode.value = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    applyDarkClass(resolveDark(mode));
  }

  function handleSystemChange(): void {
    if (themeMode.value === 'auto') {
      applyDarkClass(getSystemDark());
    }
  }

  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    applyTheme(saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto');

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);
  });

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', handleSystemChange);
  });

  return { themeMode, applyTheme };
}
