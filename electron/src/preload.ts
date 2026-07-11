import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize') as Promise<boolean>,
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: unknown, maximized: boolean) => {
      callback(maximized);
    };
    ipcRenderer.on('window:maximize-changed', listener);
    return () => {
      ipcRenderer.removeListener('window:maximize-changed', listener);
    };
  },
  markCloseBehaviorRemembered: () => {
    ipcRenderer.send('window:mark-close-behavior-remembered');
  },
  setOpenAtStartup: (enabled: boolean) => {
    ipcRenderer.send('app:set-open-at-startup', enabled);
  },
  setShowWindowHotkey: (hotkey: string) =>
    ipcRenderer.invoke('app:set-show-window-hotkey', hotkey) as Promise<boolean>,
});
