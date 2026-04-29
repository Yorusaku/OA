# 审批能力矩阵（动作×状态×结果）
## 1. 动作准入规则
- 当前详情页动作入口只在 `status === pending` 时显示，且 `submitProcess` 二次守卫非 `pending` 状态直接拦截。
- `transfer` 与 `addSign` 必须提供目标处理人（`targetUserId/targetUserName` 至少一个）。
- 重复提交被 `useApprovalSubmit` 的 `currentSubmitPromise` 合并，同一时刻仅执行一次提交链路。
## 2. 动作结果矩阵
| 动作 | 前置状态 | 前置校验 | 结果状态 | 关键副作用 |
| --- | --- | --- | --- | --- |
| approve | pending | 表单校验通过 | approved | 当前节点置为“审批完成”，写入轨迹 |
| reject | pending | 表单校验通过 | rejected | 当前节点置为“已驳回”，写入轨迹 |
| transfer | pending | 目标人必填 | transferred | 当前节点置为“已转交（目标人）”，创建新待处理任务 |
| addSign | pending | 目标人必填 | pending | 当前节点置为“加签中（目标人）”，创建加签待处理任务 |
| remind | pending | 无 | pending | 催办次数+1，更新最近催办时间，超时可触发升级 |
| withdraw | pending | 二次确认 | withdrawn | 当前节点置为“已撤回”，写入轨迹 |
| cancel | pending | 二次确认 | cancelled | 当前节点置为“已取消”，写入轨迹 |
## 3. 刷新一致性规则
- create 成功后统一失效：`approval.list`、`approval.stats`、`approval.notifications`。
- process 成功后统一失效：`approval.list`、`approval.stats`、`approval.detail(id)`、`approval.notifications`。
- 批量/移动端单条处理同样执行上述失效策略，确保列表、详情、统计、通知状态一致。
## 4. 失败分支与用户提示
- `submit-timeout`：提示“提交超时，请重试”。
- `approval-not-found`：提示“审批单不存在或已被删除”。
- `approval-target-user-required`：提示“请选择目标处理人后再提交”。
- 其他异常：提示“操作失败，请重试”。
