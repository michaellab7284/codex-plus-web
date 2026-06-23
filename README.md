# Codex++ Web

将 CodexPlusPlus (https://github.com/BigPizzaV3/CodexPlusPlus) 从 Tauri 桌面 GUI 改造为 **Web 界面 + Docker Compose** 部署的 LLM 管理平台。

## 快速启动

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 启动所有服务
docker compose up -d

# 3. 打开浏览器访问
open http://localhost
```

## 开发模式

```bash
# 启动 API 服务 (终端 1)
cd web-api && cargo run

# 启动前端开发服务器 (终端 2)
cd web-ui && npm run dev
```

## 项目结构

```
codex-plus-web/
├── web-api/          # Rust Axum API 服务
│   ├── src/          # API 路由和状态管理
│   └── Dockerfile    # 多阶段构建
├── web-ui/           # React + Vite 前端
│   ├── src/          # 组件和页面
│   │   ├── api/      # API 客户端 (替代 Tauri invoke)
│   │   └── components/  # UI 组件
│   └── Dockerfile
├── nginx/            # Nginx 反向代理配置
├── docker-compose.yml
├── .env.example
└── CodexPlusPlus/    # 原始项目 (作为 Rust 依赖引用)
```

## 架构

- **API**: Rust + Axum，复用 `codex-plus-core` 核心逻辑
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Deployment**: Docker Compose (Nginx → API + Frontend)

## API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/status` | 后端状态 |
| GET/PUT | `/api/settings` | 设置读写 |
| CRUD | `/api/relay/profiles` | 中转配置管理 |
| POST | `/api/relay/apply` | 应用中转注入 |
| POST | `/api/relay/clear` | 清除中转注入 |
| POST | `/api/relay/test` | 测试连接 |
| POST | `/api/relay/switch` | 切换供应商 |
| GET | `/api/sessions` | 会话列表 |
| DELETE | `/api/sessions/{id}` | 删除会话 |
| GET/PUT | `/api/enhancements` | 增强功能配置 |
| GET | `/api/providers/presets` | 供应商预设 |
| GET | `/api/logs` | 日志查看 |
| WS | `/ws` | WebSocket 事件推送 |

## License

MIT
