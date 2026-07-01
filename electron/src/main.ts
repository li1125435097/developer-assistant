import { app, BrowserWindow, shell } from 'electron';
import { fork, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from './types';

let serverProcess: ChildProcess | undefined;

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

async function createWindow(): Promise<void> {
  const config = loadConfig();
  const { window: windowConfig, url } = config;
  const port = Number(new URL(url).port) || 3000;

  await waitForServer(port);

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
  startServer();
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
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
