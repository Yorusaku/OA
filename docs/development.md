# 开发指南

## 环境准备

```bash
# 安装依赖
pnpm install

# 启动开发服务器
cd apps/web
pnpm dev
```

## 代码规范

### ESLint
```bash
pnpm lint
pnpm lint:fix
```

### Prettier
```bash
pnpm format
```

### TypeScript 类型检查
```bash
pnpm typecheck
```

## 测试

### 运行单元测试
```bash
pnpm test
```

### 运行测试覆盖率
```bash
pnpm test:coverage
```

## 添加新功能

### 1. 创建页面
在 `apps/web/src/views/` 下创建新页面组件。

### 2. 配置路由
在 `apps/web/src/router/index.ts` 中添加路由配置。

### 3. 添加 API
使用 `@oa/utils` 中的 HTTP 方法进行 API 调用。

### 4. 使用 Mock 数据
在 `apps/web/src/mocks/` 中添加相应的 mock 数据。

## 新增组件

### 公共组件
放置在 `apps/web/src/components/common/` 目录。

### 业务组件
放置在 `apps/web/src/components/` 下的对应业务模块目录。

## 状态管理

### Pinia Store
用于客户端状态管理，放置在 `apps/web/src/stores/`。

### TanStack Vue Query
用于服务端状态管理，处理 API 数据缓存和同步。

## 注意事项

1. 始终使用 TypeScript 类型定义
2. 遵循 Composition API 最佳实践
3. 复用 @oa/utils 中的工具函数
4. 编写必要的单元测试
