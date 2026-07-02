import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
} from 'electron';
import { fork, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from './types';

let serverProcess: ChildProcess | undefined;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

interface CloseBehaviorConfig {
  close_to_tray_on_close: boolean;
}

function getAppDataDir(): string {
  return path.join(app.getPath('userData'), 'data');
}

function getServerNodeModulesPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'node_modules');
  }

  return path.join(__dirname, '..', 'node_modules');
}

function startServer(): void {
  const serverEntry = path.join(__dirname, 'server/index.js');
  const serverEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_PATH: getServerNodeModulesPath(),
  };

  if (app.isPackaged) {
    const dataDir = getAppDataDir();
    serverEnv.DATABASE_DIR = path.join(dataDir, 'pglite');
    serverEnv.LEGACY_DATABASE_PATH = path.join(dataDir, 'db.json');
  }

  serverProcess = fork(serverEntry, [], {
    stdio: 'inherit',
    env: serverEnv,
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });
}

function waitForServer(port: number, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`本地服务在 ${timeoutMs}ms 内未在端口 ${port} 上就绪`));
          return;
        }
        setTimeout(probe, 200);
      });
    };

    probe();
  });
}

const DEFAULT_CONFIG: AppConfig = {
  url: 'http://localhost:3000',
  window: {
    title: '开发者脚本助手',
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  },
};

let appServerUrl = DEFAULT_CONFIG.url;

function getConfigPaths(): string[] {
  const paths = [path.join(app.getPath('userData'), 'config.json')];

  if (app.isPackaged) {
    paths.push(path.join(process.resourcesPath, 'config.json'));
  }

  paths.push(path.join(__dirname, '..', 'config.json'));
  return paths;
}

function loadConfig(): AppConfig {
  const config = structuredClone(DEFAULT_CONFIG);

  for (const configPath of getConfigPaths()) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<AppConfig>;
      Object.assign(config, fileConfig);
      if (fileConfig.window) {
        config.window = { ...config.window, ...fileConfig.window };
      }
      break;
    } catch (error) {
      console.warn(`Failed to read config: ${configPath}`, error);
    }
  }

  if (process.env.APP_URL) {
    config.url = process.env.APP_URL;
  }

  return config;
}

async function fetchCloseBehavior(): Promise<CloseBehaviorConfig> {
  try {
    const response = await fetch(`${appServerUrl}/api/settings/config`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { data?: CloseBehaviorConfig };
    return {
      close_to_tray_on_close: payload.data?.close_to_tray_on_close ?? true,
    };
  } catch (error) {
    console.warn('Failed to fetch close behavior config:', error);
    return { close_to_tray_on_close: true };
  }
}

async function saveCloseBehavior(closeToTray: boolean): Promise<void> {
  try {
    const response = await fetch(`${appServerUrl}/api/settings/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ close_to_tray_on_close: closeToTray }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to save close behavior config:', error);
  }
}

function applyCloseBehavior(win: BrowserWindow, closeToTray: boolean): void {
  if (closeToTray) {
    win.hide();
    return;
  }

  isQuitting = true;
  app.quit();
}

function getCloseBehaviorFlagPath(): string {
  return path.join(app.getPath('userData'), 'close-behavior-remembered');
}

function isCloseBehaviorRemembered(): boolean {
  return fs.existsSync(getCloseBehaviorFlagPath());
}

function markCloseBehaviorRemembered(): void {
  fs.writeFileSync(getCloseBehaviorFlagPath(), '1', 'utf8');
}

function getTrayIcon(): Electron.NativeImage {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const candidates = [
    path.join(__dirname, '..', 'build', iconName),
    path.join(process.resourcesPath, 'build', iconName),
    path.join(app.getAppPath(), 'build', iconName),
  ];

  for (const iconPath of candidates) {
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }
  }

  return nativeImage.createEmpty();
}

function showMainWindow(): void {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function createTray(title: string): void {
  if (tray) {
    return;
  }

  tray = new Tray(getTrayIcon());
  tray.setToolTip(title);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    showMainWindow();
  });
}

async function handleWindowClose(win: BrowserWindow): Promise<void> {
  if (isCloseBehaviorRemembered()) {
    const { close_to_tray_on_close: closeToTray } = await fetchCloseBehavior();
    applyCloseBehavior(win, closeToTray);
    return;
  }

  const { close_to_tray_on_close: defaultCloseToTray } = await fetchCloseBehavior();

  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    title: '关闭确认',
    message: '您要如何处理当前窗口？',
    detail: '可选择最小化到系统托盘继续运行，或直接退出程序。您的选择将被记住，之后可在系统设置中修改。',
    buttons: ['最小化到托盘', '退出程序', '取消'],
    defaultId: defaultCloseToTray ? 0 : 1,
    cancelId: 2,
    noLink: true,
  });

  if (response === 2) {
    return;
  }

  const minimizeToTray = response === 0;
  await saveCloseBehavior(minimizeToTray);
  markCloseBehaviorRemembered();
  applyCloseBehavior(win, minimizeToTray);
}

function registerWindowIpc(): void {
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) {
      return false;
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }

    return mainWindow.isMaximized();
  });

  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.on('window:mark-close-behavior-remembered', () => {
    markCloseBehaviorRemembered();
  });
}

async function createWindow(): Promise<void> {
  const config = loadConfig();
  const { window: windowConfig, url } = config;
  appServerUrl = url;
  const port = Number(new URL(url).port) || 3000;

  await waitForServer(port);

  const win = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    minWidth: windowConfig.minWidth,
    minHeight: windowConfig.minHeight,
    title: windowConfig.title,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadURL(url);

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, targetUrl) => {
    const currentOrigin = new URL(url).origin;
    const targetOrigin = new URL(targetUrl).origin;

    if (targetOrigin !== currentOrigin) {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });

  win.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    void handleWindowClose(win);
  });

  win.on('maximize', () => {
    win.webContents.send('window:maximize-changed', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('window:maximize-changed', false);
  });

  createTray(windowConfig.title);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerWindowIpc();
  startServer();
  void createWindow();

  app.on('activate', () => {
    if (mainWindow) {
      showMainWindow();
      return;
    }

    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 托盘模式下保持后台运行，不随窗口关闭而退出
});

app.on('before-quit', () => {
  isQuitting = true;
  serverProcess?.kill();
});
