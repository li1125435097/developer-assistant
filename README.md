# developer-assistant

开发者脚本助手 — 通过 Web 界面管理和执行常用开发脚本。

## 功能

- **脚本管理**：列表展示所有脚本（名称、描述、操作）
- **添加脚本**：支持多个动作，每个动作包含名称和脚本内容
- **动态变量**：脚本中可使用 `{{变量名}}` 格式，执行前弹窗收集输入
- **执行脚本**：通过 `child_process.exec` 运行，成功 Toast 提示，失败弹窗显示日志
- **数据存储**：脚本及动作列表以 JSON 格式存入 LowDB 文件数据库

## 技术栈

- 后端：Node.js + Fastify
- 前端：Vue 3 + Vite + Element Plus（前后端分离）
- 数据库：LowDB（JSON 文件）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

```bash
cp .env.example .env
```

默认数据库文件为 `data/db.json`，首次启动自动创建。

### 3. 开发模式

前后端分离开发，需分别启动：

```bash
# 终端 1：启动后端 API（端口 3000）
npm run dev

# 终端 2：启动前端开发服务器（端口 5173，自动代理 /api）
npm run dev:frontend
```

访问 http://localhost:5173

### 4. 生产模式

```bash
npm run build:frontend
npm start
```

访问 http://localhost:3000

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scripts` | 获取所有脚本 |
| POST | `/api/scripts` | 添加脚本 |
| GET | `/api/scripts/:id/actions/:actionIndex/variables` | 获取动作中的动态变量 |
| POST | `/api/scripts/:id/execute` | 执行脚本 |

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
