# 全景智能 OA 协同办公平台 - 架构文档

## 项目概述

全景智能 OA 协同办公平台是一个企业级 OA 系统，采用现代化的前端技术栈构建。

## 技术栈

- **框架**: Vue 3 + TypeScript + Composition API
- **构建工具**: Vite
- **UI 组件库**: Element Plus
- **状态管理**: Pinia (客户端) + TanStack Vue Query (服务端)
- **路由**: Vue Router
- **样式**: Tailwind CSS
- **Monorepo**: Turborepo
- **HTTP 客户端**: Axios (封装在 @oa/utils 中)
- **测试框架**: Vitest
- **Mock**: MSW

## 项目结构

```
OA/
├── apps/
│   └── web/                  # Web 应用
│       ├── src/
│       │   ├── assets/       # 静态资源
│       │   ├── components/   # 组件
│       │   ├── composables/  # 组合式函数
│       │   ├── mocks/        # Mock 数据
│       │   ├── router/       # 路由配置
│       │   ├── stores/       # Pinia 状态管理
│       │   ├── utils/        # 工具函数
│       │   ├── views/        # 页面视图
│       │   └── main.ts       # 入口文件
│       └── package.json
├── packages/
│   └── utils/                # 公共工具包
│       ├── src/
│       │   ├── constants.ts  # 常量定义
│       │   ├── formatters.ts # 格式化函数
│       │   ├── validators.ts # 验证函数
│       │   ├── helpers.ts    # 帮助函数
│       │   ├── http/         # HTTP 客户端封装
│       │   └── types/        # 类型定义
│       └── package.json
└── plan/                      # 项目计划文档
```

## 核心模块

### 1. 动态表单引擎
- JSON Schema 驱动的表单渲染
- VeeValidate 集成用于表单验证
- 支持条件渲染和联动逻辑

### 2. 工作流引擎
- 可视化流程设计器
- 基于 LogicFlow（原生 JS 驱动，避免响应式冲突）
- 支持审批节点、抄送节点、条件分支
- 拖拽式流程编排，支持节点配置和连线编辑

### 3. 权限管理
- RBAC 权限模型
- 路由守卫和组件级权限控制

### 4. API 层
- 统一的 HTTP 请求封装
- 请求/响应拦截器
- 错误处理机制

## 数据流

1. 用户交互 → 组件事件
2. 组件调用 composables 或 stores
3. 发起 API 请求 (通过 @oa/utils/http)
4. 响应拦截器处理数据
5. 更新状态 → 视图重新渲染

## 开发规范

### 组件开发
- 使用 Composition API + `<script setup>`
- 文件名使用 PascalCase
- Props 使用 TypeScript 接口定义

### Git 提交
- feat: 新功能
- fix: 修复
- refactor: 重构
- docs: 文档
- test: 测试
