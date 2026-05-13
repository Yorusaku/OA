# 前后对比表：功能、治理、可追溯性变化

## 概览

| 维度 | 实施前 | 实施后 |
|------|--------|--------|
| **流程管理** | 仅"编辑"和"删除" | + 发布、回滚、版本历史、影响分析 |
| **版本治理** | 无版本概念 | 全快照式版本记录（每次操作生成版本）|
| **发布前评估** | 无 | 影响分析：显示待处理审批数、涉及节点、风险等级、操作建议 |
| **回滚操作** | 不存在 | 版本可选 + 二次确认 + 风险提示 |
| **审计日志** | 纯 Mock 数据 | 真实 BFF 数据，覆盖 7 种审计动作 |
| **操作日志筛选** | 有限筛选 | 操作人/动作/模块/结果/日期 5 维筛选 |
| **审计详情** | 基础信息 | + before/after 快照、TraceId、IP、UA、耗时、关联对象跳转 |
| **审计导出** | 无 | CSV 导出（含完整审计字段）|
| **关联跳转** | 无 | 审计事件可跳转到审批单/流程编辑器 |

## 功能维度详细对比

### 流程管理
| 功能 | 实施前 | 实施后 |
|------|--------|--------|
| 新建流程 | ✅ | ✅ |
| 编辑流程 | ✅ | ✅ |
| 删除流程 | ✅ | ✅ |
| 发布流程 | ❌ | ✅（确认弹窗 + 状态变更 + 审计记录）|
| 回滚流程 | ❌ | ✅（版本选择 + 风险提示 + 二次确认 + 审计记录）|
| 版本历史 | ❌ | ✅（列表：版本号、操作人、时间、状态、备注）|
| 影响分析 | ❌ | ✅（待处理数、涉及节点、风险等级、操作建议）|

### 审计覆盖
| 审计动作 | 实施前 | 实施后 |
|----------|--------|--------|
| 登录 | ❌ | ✅ `auth.login` |
| 发起审批 | ❌ | ✅ `approval.submit` |
| 审批处理 | ❌ | ✅ `approval.process` |
| 代理启用 | ❌ | ✅ `approval.delegate.enable` |
| 代理关闭 | ❌ | ✅ `approval.delegate.disable` |
| 流程发布 | ❌ | ✅ `workflow.publish` |
| 流程回滚 | ❌ | ✅ `workflow.rollback` |

### 工程可信度
| 指标 | 实施前 | 实施后 |
|------|--------|--------|
| Lint 状态 | ❌ 配置解析失败 | ✅ 0 errors（13 warnings）|
| Build 状态 | ❌ terser 缺失 | ✅ 构建成功 |
| TypeCheck | ✅ | ✅ |
| 单测通过 | ✅ 129 tests | ✅ 129 tests |
| BFF 集成测试 | 5 tests | 9 tests（+版本/审计/发布/回滚/代理）|
| CI 门禁 | lint + typecheck + test + build | lint + typecheck + test + build（全绿）|

## 数据流变化

### 实施前：操作日志数据流
```
前端 (OperationLogs.vue)
  └─ api/log.ts (mockOperationLogs - 静态假数据)
```

### 实施后：审计日志数据流
```
前端 (OperationLogs.vue)
  └─ composables/useAuditLog.ts
       └─ api/audit.ts
            └─ HTTP GET /api/v1/audit/logs
                 └─ BFF app.ts → audit-service.ts → RuntimeState.auditLogs
                      ↑ 写入来源：
                      ├── auth.login（登录）
                      ├── approval.submit（发起审批）
                      ├── approval.process（审批处理）
                      ├── approval.delegate.enable/disable（代理）
                      ├── workflow.publish（流程发布）
                      └── workflow.rollback（流程回滚）
```