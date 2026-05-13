# ADR-002: 审计日志模型设计取舍

## 状态
已采纳（2026-05-13）

## 背景
OA 系统需要从"功能可用"升级为"可演示企业级治理能力"，其中审计闭环是面试演示的核心环节。需要设计统一的审计日志模型，覆盖所有关键业务动作。

## 决策

### 1. 统一审计事件模型（而非分散日志表）
**选择：** 采用单一 `AuditEvent` 接口统一记录所有审计事件

**理由：**
- 面试演示场景需要串联不同模块（登录→审批→流程），统一模型使"`谁在何时对什么做了什么`"一目了然
- 避免了为每个业务模块单独建日志表的复杂性和查询跨表 JOIN 的痛点
- 字段设计（`operatorId/Name`、`action`、`module`、`before/after`、`traceId`、`ip`、`ua`、`durationMs`）覆盖企业审计核心要素

**放弃的方案：** 按模块分表（`login_logs`、`approval_logs`、`workflow_logs`），会削弱跨模块关联追踪能力。

### 2. before/after 快照策略
**选择：** 关键动作记录变更前后的结构化摘要，而非完整对象深拷贝

**理由：**
- 完整深拷贝在内存存储模式下会导致状态膨胀
- 结构化摘要（如代理规则变更时记录 `delegateId`、`enabled`、`startAt/endAt`）足以支持变更追溯

**放弃的方案：** `JSON.stringify` 完整快照，对大型审批单据不友好。

### 3. 审计采集点选择
**选择：** 在审批/流程/代理等关键写操作中硬编码写入审计事件

**覆盖范围：**
| 动作 | 模块 | 采集点 |
|------|------|--------|
| `auth.login` | auth | 登录成功时 |
| `approval.submit` | approval | 审批发起时 |
| `approval.process` | approval | 审批动作（同意/驳回/转交等）|  
| `approval.delegate.enable` | approval | 代理启用时 |
| `approval.delegate.disable` | approval | 代理关闭时 |
| `workflow.publish` | workflow | 流程发布时 |
| `workflow.rollback` | workflow | 流程回滚时 |

**放弃的方案：** AOP/中间件方式统一拦截所有请求 —— 语义不够精确，无法携带业务摘要和 before/after。

### 4. links 关联跳转设计
**选择：** 审计事件携带 `links` 字段，记录目标类型、ID、标题和前端路径

**理由：** 面试演示时可以从审计日志直接跳转到关联的审批单或流程编辑器，实现"可解释的业务上下文串联"。

## 影响
- 新增 `apps/bff/src/services/audit-service.ts` 提供审计写/查/导出
- 前端审计日志页直接从 BFF 获取数据（不再使用 mock）
- 每个需要审计的 BFF 路由增加 `writeAuditLog` 调用（约5-8行代码）