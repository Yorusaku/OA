# 审批核心链路时序说明
## 1. 发起审批（create）
1. 页面点击提交，`useApprovalLaunch.handleSubmit` 完成表单校验与二次确认。
2. 调用 `useApprovalSubmit.submitApproval({ action: 'create' })`。
3. `useApprovalSubmit` 进入并发保护区，设置 `isLoading=true`，避免重复提交。
4. 执行模拟延迟与 `createApproval` 请求，并加统一超时保护（10s）。
5. 请求成功后统一失效 `list/stats/notifications`，触发缓存回填。
6. 统一成功提示“审批提交成功”，`useApprovalLaunch` 仅负责跳转到“我发起的审批”。
## 2. 审批处理（process）
1. 详情页触发动作（approve/reject/transfer/addSign/remind/withdraw/cancel）。
2. `submitProcess` 先校验审批状态必须为 `pending`，并校验转交/加签目标人。
3. 调用 `useApprovalSubmit.submitApproval({ action: 'process' })`。
4. `useApprovalSubmit` 根据动作映射构建 payload（含默认文案和目标人归一化）。
5. 请求成功后统一失效 `list/stats/detail(id)/notifications`，确保多视图一致。
6. 反馈动作级成功提示，详情页执行 `refetch` 拉取最新状态。
## 3. 移动端处理链路
1. 列表卡片左滑触发单条 `approve/reject`。
2. `ApprovalListMobile` 调用 `useApprovalTodo.processRecord(id, action)`。
3. `processRecord` 调用 `processApproval` 后统一失效 `list/stats/detail(id)/notifications`。
4. 移动列表即时刷新，避免“操作成功但列表不更新”。
## 4. 异常链路
1. 任意请求超过 10s 进入 `submit-timeout` 分支并提示重试。
2. 目标单据不存在进入 `approval-not-found` 分支并提示单据已删除。
3. 参数不完整（转交/加签缺目标人）在提交前即拦截，不发送请求。
