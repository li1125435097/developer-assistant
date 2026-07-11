export interface ElectronAPI {
  isElectron: true;
  platform: NodeJS.Platform;
  minimize: () => void;
  maximize: () => Promise<boolean>;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (maximized: boolean) => void) => () => void;
  markCloseBehaviorRemembered: () => void;
  setOpenAtStartup: (enabled: boolean) => void;
  setShowWindowHotkey: (hotkey: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
