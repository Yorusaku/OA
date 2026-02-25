# 安装指南

## 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-org/oa.git
cd oa
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5173/ 查看应用。

## 项目结构

```
OA/
├── apps/
│   └── web/              # Web 应用
├── packages/
│   ├── config/           # 共享配置
│   └── utils/            # 共享工具
├── docs/                 # 文档
└── package.json          # 项目配置
```

## 命令说明

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm lint` | 代码检查 |
| `pnpm format` | 代码格式化 |
| `pnpm docs:dev` | 启动文档服务器 |
| `pnpm docs:build` | 构建文档 |
