# 责任边界说明

## 我的角色
全栈开发（BFF 后端 + 前端），负责本次 MVP 的核心模块设计与实现。

## 我负责的模块

### BFF 后端（`apps/bff`）
| 文件 | 内容 |
|------|------|
| `src/domain.ts` | 审计事件模型（AuditEvent）、运行时状态定义 |
| `src/services/audit-service.ts` | 审计日志写入、查询、详情、CSV 导出 |
| `src/services/workflow-service.ts` | 流程版本列表、发布、回滚、影响分析 |
| `src/app.ts` | BFF 路由：流程版本查询、审计日志 CRUD、审计写入（登录/审批/代理/发布/回滚）|

### 前端（`apps/web`）
| 文件 | 内容 |
|------|------|
| `src/api/audit.ts` | 审计日志 API 封装 |
| `src/api/workflow.ts` | 流程版本、发布、回滚、影响分析 API（支持 remote + mock 双模式）|
| `src/api/workflow.remote.ts` | BFF 远程调用封装 |
| `src/api/queryKeys.ts` | Vue Query 缓存键（含 workflow.versions、auditLog）|
| `src/api/types.ts` | 审计相关类型定义 |
| `src/composables/useAuditLog.ts` | 审计日志 Vue Query Hooks |
| `src/views/workflow/WorkflowList.vue` | 流程管理页（新增：发布、回滚、版本历史、影响分析）|
| `src/views/system/OperationLogs.vue` | 审计日志页（从 mock 切换到 BFF 真实数据）|

### 工程基线
| 文件 | 内容 |
|------|------|
| `package.json` | 根 devDependencies 补全 `@oa/config` |
| `eslint.config.js` | （保持不变，依赖根级 workspace 链接修复）|

### 测试
| 文件 | 内容 |
|------|------|
| `apps/bff/test/app.test.ts` | 新增 5 个集成测试：流程版本、审计列表、发布审计、回滚审计、代理审计 |

## 验收口径

### 功能验收
1. 流程管理页可见"发布""回滚""版本历史""影响分析"按钮
2. 点击"发布"→ 确认后流程状态变为"启用"
3. 点击"版本历史"→ 展示所有版本（含操作人、时间、状态）
4. 点击"回滚"→ 选择版本→风险提示→确认→回滚成功
5. 点击"影响分析"→ 展示风险等级和建议
6. 审计日志页展示真实数据（非 mock）
7. 审计日志支持按操作人/动作/模块/结果/日期筛选
8. 审计详情展示关联对象跳转
9. 审计日志支持 CSV 导出

### 工程验收
1. `pnpm lint` 无错误（仅 warnings）
2. `pnpm typecheck` 无错误
3. `pnpm test --run` 全部通过（web: 129 tests + bff: 9 tests）
4. `pnpm build` 构建成功
5. CI 门禁：lint + typecheck + test + build 全绿

## 我不负责的模块
- 审批协同核心逻辑（approval-service.ts 原有功能）
- 表单设计器（Form Designer）
- 机构/部门管理
- 消息/通知系统
- 模板市场
- 外部集成（企业微信/钉钉/LDAP）
- PWA/Service Worker