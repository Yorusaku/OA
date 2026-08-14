# 审批 Copilot 审查卡 5-7 天落地计划
## Summary
将现有“AI 审批建议”升级为“审批 Copilot 审查卡”，目标是在现有审批详情页、BFF AI 建议链路和共享契约上做小而完整的 AI 业务增强。范围不包含通用聊天机器人、新数据库表、独立 RAG 平台或 AI 自动审批动作。
## Key Changes
- 扩展 `AiApprovalSuggestionResponse`，增加 `reviewSummary`、`riskPoints`、`evidenceItems` 三组可选字段。
- BFF 采用混合生成策略：审批摘要和规则风险点由服务端基于审批上下文确定性生成，AI 继续负责建议、理由、置信度、风险等级、溯源片段和不确定性标注。
- 确定性风险规则包括高金额、SLA 升级、多次催办、描述缺失和附件缺失。
- 依据来源优先由 `reasoningSegments` 映射生成；没有溯源片段时，使用表单摘要、流程摘要和模型判断兜底。
- 前端将“AI 审批建议”升级为“审批 Copilot”，展示审查摘要、风险点、依据来源，并保留原有建议、流式理由、溯源、不确定性和人工反馈闭环。
- Mock 模式同步补齐 Copilot 字段，保证无 Ark Key 或无 BFF 时也能演示。
- 面试稿同步补充“审批 Copilot 审查卡”讲法，并保持飞书复制要求：标题编号、无空行、不删除 QA 和权限设计内容。
## Implementation Notes
- 共享契约：在 `packages/contracts/src/index.ts` 增加 `AiApprovalReviewSummary`、`AiApprovalRiskPoint`、`AiApprovalEvidenceItem` 类型，并挂到 `AiApprovalSuggestionResponse`。
- BFF：在 `apps/bff/src/services/approval-ai-service.ts` 内新增纯函数 `buildReviewSummary`、`buildRiskPoints`、`buildEvidenceItems`、`enrichWithCopilotReview`，普通接口和 SSE 接口共用同一套增强逻辑。
- 前端：在 `apps/web/src/views/approval/components/AiSuggestion.vue` 中新增三个展示区域，避免影响已有生成、重试、采纳、忽略和策略阻断状态。
- Mock：在 `apps/web/src/api/ai.ts` 的 `buildMockResponse` 中补充可演示的摘要、风险点和依据来源。
- Mock 反馈：为 mock Copilot 响应补充 `auditEventId`，保证采纳/忽略反馈闭环在无 BFF 环境下也可演示。
- 视觉收尾：固定推理来源和不确定性标签中的图标尺寸，避免 Element Plus 图标撑开标签并与正文重叠。
## Test Plan
- `pnpm --filter @oa/contracts build`
- `pnpm --filter panorama-oa-bff test`
- `pnpm --filter panorama-oa-web test`
- `pnpm --filter panorama-oa-web typecheck`
- 手动验收：mock 模式下进入审批详情页，点击生成 AI 建议，应看到审查摘要、风险点、依据来源、原有推理、不确定性、采纳/忽略按钮。
- 手动验收：高金额、SLA 升级、多次催办、缺少描述、缺少附件场景应能出现对应风险点。
## Verification Result
- mock 服务已在 `http://127.0.0.1:5175` 完成真实浏览器验收。
- 已验证审批详情页可生成“审查摘要 / 风险点 / 依据来源 / 推理溯源 / 不确定性”。
- 已验证高金额、缺少附件和多次催办风险能在页面展示。
- 已验证“采纳建议”可切换为“已采纳 AI 建议”状态。
- 最终截图位于 `output/playwright/approval-copilot-final-verified.png`。
- Web 测试结果更新为 24 个测试文件、141 个测试通过。
## Resume Output
```text
将审批详情页 AI 建议升级为审批 Copilot 审查卡，聚合审批摘要、风险点、制度/表单/历史依据与人工反馈闭环，提升审批人复核效率与 AI 输出可解释性。
基于审批上下文和 Policy-as-Code 生成可解释风险点，模型异常或策略阻断时降级 manual_review，保证 AI 不越权、不影响审批主链路。
```
## Assumptions
- 项目定位使用“面向 OA 场景的数字化协同审批平台”或“OA 场景下的智能协同审批平台”。
- 本轮只做小而完整的 AI 增强，不做通用 Agent、通用 RAG 问答、智能填单写回和数据库迁移。
- 不回滚 `AGENTS.md`、`CLAUDE.md`、`README.md` 等已有无关改动。
