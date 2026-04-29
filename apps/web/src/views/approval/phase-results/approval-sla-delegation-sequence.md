# 审批链路时序补充（SLA 自动升级 + 全局代理）

## 1. 自动治理统一入口
1. 审批域请求进入（列表/详情/统计/通知/处理）。
2. 执行 `ensureAllRecordsDefaults()`。
3. 执行 `runApprovalAutomation()`：
4. 先 `runAutoEscalation()`（超时升级）。
5. 再 `runDelegationSync()`（代理同步与回滚）。
6. 再返回业务查询或继续动作处理。

## 2. 超时升级链路
1. 扫描 pending 单据，命中 SLA 超时。
2. 当前节点 pending 任务按映射改派并更新 owner。
3. 写入升级轨迹（`action=escalate`）。
4. 发送升级通知。
5. 待办过滤即时反映新的处理人。

## 3. 代理接管链路
1. 用户在系统页保存全局代理规则（生效时间段 + 代理人）。
2. 自动治理扫描 pending 任务，匹配 owner 的有效规则。
3. 将 `handler` 切换为代理人并记录 delegated 字段。
4. 代理过期/关闭时自动回滚 `handler -> owner`。
5. 写入代理轨迹（`action=delegate`）并发送接管通知。

## 4. 动作处理链路联动
1. `create/transfer/addSign` 创建新 pending 任务时先按 owner 判定有效 handler。
2. `approve/reject/...` 仍基于 `handler` 匹配当前操作者。
3. 所有动作后保持列表/详情/统计/通知一致失效。
