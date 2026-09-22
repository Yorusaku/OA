# 部署说明

本文档说明如何使用 Docker Compose 启动 OA BFF、PostgreSQL 和 Qdrant。Web 前端仍可单独部署；它在真实联调模式下通过 `VITE_BFF_TARGET` 指向 BFF。

## 前置条件

- Docker Desktop 已启动，Linux 容器模式可用。
- 需要 AI 真实能力时，准备火山方舟 Ark 的 API Key；未配置时，审批与知识库元数据仍可运行，AI 调用会降级。

## 启动

在仓库根目录执行：

```powershell
$env:ARK_API_KEY='your-api-key'
docker compose up -d --build
docker compose ps
```

服务端口：

| 服务 | 宿主机端口 | 容器网络地址 |
| --- | --- | --- |
| BFF | `8088` | `http://bff:8088` |
| PostgreSQL | `5434` | `postgres:5432` |
| Qdrant HTTP | `6333` | `http://qdrant:6333` |
| Qdrant gRPC | `6334` | `qdrant:6334` |

Compose 会让 BFF 等待 PostgreSQL 健康检查通过，再以服务名连接 PostgreSQL 与 Qdrant。PostgreSQL 和 Qdrant 数据分别由 `panorama_oa_pg_data`、`qdrant_data` 命名卷持久化。

## 验证

```powershell
Invoke-WebRequest http://127.0.0.1:8088/health | Select-Object -ExpandProperty Content
docker compose logs bff --tail 100
```

健康接口返回成功后，可按真实联调模式启动 Web：

```powershell
$env:VITE_USE_MOCK='false'
$env:VITE_API_MODE='real'
$env:VITE_BFF_TARGET='http://127.0.0.1:8088'
$env:PORT='5174'
pnpm --filter panorama-oa-web dev
```

## 配置

Compose 通过宿主环境变量接收 Ark 配置，不会读取或写入 `apps/bff/.env`：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `ARK_API_KEY` | 空 | 火山方舟 API Key，可缺省 |
| `ARK_LLM_BASE_URL` | Ark v3 地址 | LLM 服务地址 |
| `ARK_LLM_MODEL` | `deepseek-v4-pro` | LLM 模型 |
| `ARK_EMBEDDING_MODEL` | `doubao-embedding-text-240715` | 向量模型 |
| `ARK_EMBEDDING_DIMENSIONS` | `1024` | 向量维度 |
| `QDRANT_COLLECTION_NAME` | `oa_knowledge_chunks` | Qdrant 集合名 |

不要将真实 Key 写入 Compose、Dockerfile 或版本控制文件。可在部署平台的密钥管理中注入，或仅在当前 PowerShell 会话设置环境变量。

## 运维操作

```powershell
docker compose stop
docker compose start
docker compose down
```

`docker compose down` 不会删除命名卷。若确需清空演示数据，执行 `docker compose down -v`；该命令会删除 PostgreSQL 与 Qdrant 的持久化数据。

## 镜像构建边界

根目录 `Dockerfile` 使用 Node 20 和 pnpm 多阶段构建，最终镜像仅保留 BFF 的生产依赖与编译产物。当前仓库的 `pnpm-lock.yaml` 未纳入版本控制，构建使用 `pnpm install --no-frozen-lockfile`；正式发布前应提交锁文件并改为 `--frozen-lockfile`，以获得严格可复现构建。
