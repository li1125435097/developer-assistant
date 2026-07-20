# developer-assistant

开发助手 — 本地脚本管理与执行工具，支持 Web 与 Electron 桌面端。

## 功能

- **脚本管理**：增删改查脚本与多动作；支持 `{{变量名}}`，执行前弹窗收集输入
- **执行历史**：记录每次脚本执行结果，可查看详情或清空
- **剪切板记录**：后台监听剪切板变化并持久化，可配置开关与保留策略
- **记事本**：富文本笔记，支持标签与置顶
- **系统设置**：应用配置、定时备份表选择、从备份恢复数据、显示/隐藏窗口快捷键（桌面端）
- **数据备份**：定时导出选中表到 `data/db-bak`，异常时可一键恢复

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Fastify + TypeScript |
| 前端 | Vue 3 + Vite + Element Plus + Vue Router |
| 数据库 | PGlite（默认嵌入式）/ PostgreSQL，Drizzle ORM |
| 桌面端 | Electron |

## 项目结构

```
├── backend/          # Fastify API、ORM、备份与业务服务
├── frontend/         # Vue 3 Web UI
├── electron/         # Electron 壳，内嵌后端
├── agent/            # 可选：基于 Ollama 的 LangChain Agent（实验）
├── data/             # 运行时数据（PGlite、备份等，不入库）
├── logs/             # 服务日志
└── release/          # 发布安装包
```

## 快速开始

### 1. 安装依赖

```bash
npm install
npm install --prefix frontend
npm install --prefix electron   # 需要桌面端时
```

### 2. 配置环境变量（可选）

```bash
cp .env.example .env
```

常用变量：

| 变量 | 说明 | 默认 |
|------|------|------|
| `PORT` | API 端口 | `3000` |
| `DATABASE_MODE` | `pglite` 或 `postgres` | `pglite` |
| `DATABASE_DIR` | PGlite 数据目录 | `./data/pglite` |
| `DATABASE_URL` | 远程 PostgreSQL 连接串（`postgres` 模式必填） | — |
| `LEGACY_DATABASE_PATH` | 旧版 LowDB JSON，首次启动自动导入 | `./data/db.json` |
| `BACKUP_DIR` | SQL 备份目录 | `./data/db-bak` |
| `LOGS_DIR` | 日志目录 | `./logs` |

### 3. 开发模式

```bash
# 终端 1：后端 API（端口 3000，tsx watch）
npm run dev

# 终端 2：前端（端口 5173，代理 /api）
npm run dev:frontend

# 可选：Electron 壳（需前端已启动）
npm run dev:electron
```

访问 http://localhost:5173

### 4. Web 生产模式

```bash
npm run build:backend
npm run build:frontend
npm start
```

访问 http://localhost:3000（后端同时提供静态前端）

### 5. 打包桌面端

```bash
# 先构建并同步前端/后端到 electron 运行时
npm run move

# Windows / macOS / Linux
npm run build:electron:win
npm run build:electron:mac
npm run build:electron:linux
```

产物在 `electron/release/`；对外发布包也可放在根目录 `release/`。

### 数据库相关

```bash
npm run db:generate   # 根据 schema 生成迁移
npm run db:push       # 推送 schema 到当前库
```

## API 概览

| 模块 | 前缀 | 说明 |
|------|------|------|
| 脚本 | `/api/scripts` | CRUD、解析动作变量、执行 |
| 历史 | `/api/history` | 列表、详情、删除、清空 |
| 剪切板 | `/api/clipboard` | 配置、列表、详情、删除、清空 |
| 记事本 | `/api/notebooks` | CRUD、标签、置顶 |
| 设置 | `/api/settings` | 应用配置、表列表、备份恢复 |

### 添加脚本示例

```json
{
  "name": "项目构建",
  "description": "构建前端项目",
  "actions": [
    { "action": "构建", "script": "npm run build" },
    { "action": "部署", "script": "scp -r dist {{host}}:/var/www" }
  ]
}
```

### 执行脚本示例

```json
{
  "actionIndex": 1,
  "variables": { "host": "user@example.com" }
}
```

## 下载

可直接下载桌面版安装包（Windows）：

| 版本 | 平台 | 下载 |
|------|------|------|
| 1.1.1（最新） | Windows (x64) | [开发助手1.1.1.exe](release/开发助手1.1.1.exe) |
| 1.1.0 | Windows (x64) | [开发助手1.1.0.exe](release/开发助手1.1.0.exe) |
| 1.0.0 | Windows (x64) | [开发助手1.0.0.exe](release/开发助手1.0.0.exe) |

## 更新记录

### 1.1.1（2026-07-20）

- 升级数据库（迁移至 PGlite）
- 修复数据库相关报错

### 1.1.0（2026-07-11）

- 新增记事本页面
- 新增数据备份与报错恢复功能
- 新增服务器日志输出管理
- 新增程序显示/隐藏快捷键
- 桌面端窗口圆角效果
- 更换软件图标
- 优化页面显示

### 1.0.0（2026-07-02）

- 首次发布桌面版
- 脚本管理与执行
- 剪切板功能
- Electron 打包安装
