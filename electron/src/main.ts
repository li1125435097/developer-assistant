import { app, BrowserWindow, shell } from 'electron';
import { fork, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from './types';

let serverProcess: ChildProcess | undefined;

function startServer(): void {
  const serverEntry = path.join(__dirname, 'server/index.js');

  serverProcess = fork(serverEntry, [], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });
}

startServer();

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

function createWindow(): void {
  const config = loadConfig();
  const { window: windowConfig, url } = config;

  const win = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    minWidth: windowConfig.minWidth,
    minHeight: windowConfig.minHeight,
    title: windowConfig.title,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  serverProcess?.kill();
});
