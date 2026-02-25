# 文档生成说明

## VitePress 文档

### 启动文档服务器

```bash
pnpm docs:dev
```

### 构建文档

```bash
pnpm docs:build
```

### 预览构建结果

```bash
pnpm docs:preview
```

## API 文档生成

### 方式一：使用 TypeDoc（需要安装依赖）

```bash
# 安装依赖
pnpm add -Dw typedoc typedoc-plugin-markdown

# 生成 API 文档
pnpm docs:api
```

### 方式二：手动编写 API 文档

在 `docs/api/` 目录下创建 `.md` 文件，例如：

- `composables.md` - Composables API
- `components.md` - Components API
- `stores.md` - Stores API
- `api.md` - 业务 API

## 文档结构

```
docs/
├── .vitepress/
│   ├── config.ts       # VitePress 配置
│   └── theme/
│       └── index.js    # 主题定制
├── api/
│   ├── index.md        # API 首页
│   ├── composables.md  # Composables API
│   ├── components.md   # Components API
│   ├── stores.md       # Stores API
│   └── api.md          # 业务 API
├── guide/
│   ├── index.md        # 指南首页
│   ├── installation.md # 安装指南
│   └── quickstart.md   # 快速开始
├── api-generated/      # TypeDoc 自动生成的 API 文档
└── index.md            # 文档首页
```

## 配置说明

### VitePress 配置 (`docs/.vitepress/config.ts`)

- `title`: 网站标题
- `description`: 网站描述
- `themeConfig.nav`: 顶部导航
- `themeConfig.sidebar`: 侧边栏导航

### TypeDoc 配置 (`typedoc.json`)

- `entryPoints`: 入口文件
- `out`: 输出目录
- `excludePrivate`: 排除私有成员
- `includeVersion`: 包含版本号
