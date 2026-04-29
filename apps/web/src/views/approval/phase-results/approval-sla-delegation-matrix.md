# 审批能力矩阵补充（SLA 自动升级 + 全局代理）

## 1. SLA 自动升级规则
- 触发条件：`status === pending` 且 `deadlineAt < now` 且 `escalatedAt` 为空。
- 执行时机：每次审批域 API 访问时统一执行自动治理（列表/详情/统计/通知/处理）。
- 升级策略：按内置映射改派处理人（`user-001 -> user-002`，`user-002 -> user-001`）。
- 审计输出：写入 `operatorTrail(action=escalate)` + 通知“审批已超时升级”。

## 2. 全局代理规则
- 配置模型：`ownerId/ownerName/delegateId/delegateName/startAt/endAt/enabled`。
- 生效语义：仅代理人可见并可处理，原处理人待办隐藏。
- 作用范围：存量 pending + 新增 pending（create/transfer/addSign）。
- 回滚规则：代理过期或关闭后，未处理任务自动回归 owner。
- 审计输出：写入 `operatorTrail(action=delegate)` + 通知“代理审批已接管”。

## 3. 任务字段语义
- `ownerId/ownerName`：任务原始归属人（长期不变，除升级重分派外）。
- `handlerId/handlerName`：当前有效处理人（可被代理规则覆盖）。
- `delegatedFromId/delegatedFromName/delegatedAt`：代理接管痕迹（仅代理生效时存在）。

## 4. 升级与代理叠加顺序
- 固定顺序：先 `runAutoEscalation`，后 `runDelegationSync`。
- 结果语义：升级决定 owner，代理决定 handler，避免状态抖动与覆盖冲突。
