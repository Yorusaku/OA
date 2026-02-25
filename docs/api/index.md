# API 文档

全景智能 OA 的 API 文档由 TypeDoc 自动生成。

## 模块分类

### 核心模块

| 模块 | 说明 |
|------|------|
| [Composables](/api-generated/modules/) | 组合式函数，封装业务逻辑 |
| [Components](/api-generated/modules/) | Vue 组件 |
| [Stores](/api-generated/modules/) | Pinia 状态管理 |

### API 模块

| 模块 | 说明 |
|------|------|
| HTTP | 统一的 HTTP 请求封装 |
| 审批 API | 审批相关业务接口 |
| 工作流 API | 工作流定义和实例接口 |

### 工具模块

| 模块 | 说明 |
|------|------|
| Utils | 通用工具函数 |
| Types | TypeScript 类型定义 |

## 生成 API 文档

```bash
# 生成 API 文档
pnpm docs:api

# 预览文档
pnpm docs:dev
```

## 文档结构

API 文档使用 TypeDoc + typedoc-plugin-markdown 生成，输出到 `docs/api-generated` 目录。
