<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElAlert, ElButton, ElCard, ElCollapse, ElCollapseItem, ElDialog, ElInput, ElTag } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { useAiSuggestion } from '@/composables/useAiSuggestion'
import { useAiPolicy } from '@/composables/useAiPolicy'
import { useAcceptAiSuggestion, useOverrideAiSuggestion } from '@/composables/useAiAudit'
import ReasoningSegmentView from './ReasoningSegmentView.vue'

const props = defineProps<{
  approvalId: string
}>()

const {
  status,
  suggestion,
  streamedReasoning,
  reasoningSegments,
  uncertainties,
  errorMessage,
  isGenerating,
  generateSuggestion,
  retry,
  stop,
} = useAiSuggestion(() => props.approvalId)

const { showWarningBanner, policyDisclaimer } = useAiPolicy()
const { mutate: acceptMutate, isPending: isAccepting } = useAcceptAiSuggestion()
const { mutate: overrideMutate, isPending: isOverriding } = useOverrideAiSuggestion()

const feedbackState = ref<'none' | 'accepted' | 'overridden'>('none')
const showOverrideDialog = ref(false)
const overrideReason = ref('')

const isPolicyBlocked = computed(() => {
  return suggestion.value?.confidence === 0
    && suggestion.value?.reasoning?.includes('AI 策略已阻止')
})

const displayReasoning = computed(() => {
  if (streamedReasoning.value)
    return streamedReasoning.value
  return suggestion.value?.reasoning || ''
})

const confidence = computed(() => suggestion.value?.confidence ?? 0)

const cardState = computed<'success' | 'warning' | 'neutral' | 'blocked'>(() => {
  if (isPolicyBlocked.value)
    return 'blocked'
  if (confidence.value >= 0.8)
    return 'success'
  if (confidence.value > 0.5)
    return 'warning'
  return 'neutral'
})

const cardTitle = computed(() => {
  if (!suggestion.value)
    return 'AI 审批建议'

  if (isPolicyBlocked.value)
    return '策略已阻断'

  if (suggestion.value.suggestion === 'approve')
    return '建议通过'
  if (suggestion.value.suggestion === 'reject')
    return '建议驳回'
  return '建议人工判断'
})

const helperText = computed(() => {
  if (status.value === 'cancelled')
    return '本次 AI 审阅已取消，不会保存为成功建议，可按需重新生成。'

  if (isPolicyBlocked.value)
    return 'AI 策略已阻止此审批的 AI 建议生成，请人工处理。'

  if (!suggestion.value)
    return '点击按钮生成 Copilot 审查，AI 仅作为审批辅助信息。'

  if (confidence.value >= 0.8)
    return '高置信度建议，可作为审批参考。'
  if (confidence.value > 0.5)
    return '中等置信度建议，请结合实际情况人工确认。'
  return 'AI 无法给出明确建议，建议以人工判断为主。'
})

const tagType = computed<'success' | 'warning' | 'info' | 'danger'>(() => {
  if (isPolicyBlocked.value)
    return 'danger'
  if (cardState.value === 'success')
    return 'success'
  if (cardState.value === 'warning')
    return 'warning'
  return 'info'
})

const confidenceText = computed(() => `${Math.round(confidence.value * 100)}%`)
const reviewSummary = computed(() => suggestion.value?.reviewSummary)
const riskPoints = computed(() => suggestion.value?.riskPoints || [])
const evidenceItems = computed(() => suggestion.value?.evidenceItems || [])

function formatAmount(amount?: number): string {
  if (amount === undefined)
    return '-'
  return `￥${amount.toLocaleString('zh-CN')}`
}

function riskPointType(level: 'low' | 'medium' | 'high'): 'success' | 'warning' | 'danger' {
  if (level === 'high')
    return 'danger'
  if (level === 'medium')
    return 'warning'
  return 'success'
}

function riskLevelText(level: 'low' | 'medium' | 'high'): string {
  if (level === 'high')
    return '高风险'
  if (level === 'medium')
    return '中风险'
  return '低风险'
}

function riskSourceText(source: 'policy' | 'form' | 'workflow' | 'history' | 'model'): string {
  const map = {
    policy: '策略规则',
    form: '表单数据',
    workflow: '流程上下文',
    history: '历史轨迹',
    model: '模型判断',
  }
  return map[source]
}

function evidenceSourceText(source: 'knowledge_base' | 'historical_data' | 'form_data' | 'model_judgment'): string {
  const map = {
    knowledge_base: '制度知识库',
    historical_data: '历史数据',
    form_data: '表单数据',
    model_judgment: '模型判断',
  }
  return map[source]
}

function evidenceConfidenceText(confidence?: number): string {
  if (confidence === undefined)
    return '-'
  return `${Math.round(confidence * 100)}%`
}

function handleGenerate(): void {
  const task = generateSuggestion()
  if (task && typeof task.catch === 'function')
    void task.catch(() => {})
}

function handleRetry(): void {
  feedbackState.value = 'none'
  const task = retry()
  if (task && typeof task.catch === 'function')
    void task.catch(() => {})
}

function handleStop(): void {
  stop()
}

function handleAccept(): void {
  if (!suggestion.value?.auditEventId)
    return
  acceptMutate(
    {
      approvalId: props.approvalId,
      auditEventId: suggestion.value.auditEventId,
    },
    {
      onSuccess: () => {
        feedbackState.value = 'accepted'
      },
    },
  )
}

function handleOverride(): void {
  if (!suggestion.value?.auditEventId)
    return
  showOverrideDialog.value = true
}

function confirmOverride(): void {
  if (!suggestion.value?.auditEventId || !overrideReason.value.trim())
    return
  overrideMutate(
    {
      approvalId: props.approvalId,
      auditEventId: suggestion.value.auditEventId,
      reason: overrideReason.value.trim(),
    },
    {
      onSuccess: () => {
        feedbackState.value = 'overridden'
        showOverrideDialog.value = false
        overrideReason.value = ''
      },
    },
  )
}

function cancelOverride(): void {
  showOverrideDialog.value = false
  overrideReason.value = ''
}
</script>

<template>
  <ElCard class="ai-suggestion-card" :class="`ai-suggestion-card--${cardState}`">
    <template #header>
      <div class="ai-suggestion-card__header">
        <div>
          <div class="ai-suggestion-card__title">审批 Copilot</div>
          <div class="ai-suggestion-card__subtitle">{{ helperText }}</div>
        </div>
        <ElTag v-if="suggestion" :type="tagType" effect="light">
          {{ cardTitle }}
        </ElTag>
      </div>
    </template>

    <!-- 策略警告横幅 -->
    <ElAlert
      v-if="showWarningBanner && !isPolicyBlocked"
      type="warning"
      :closable="false"
      show-icon
      class="ai-policy-warning-banner"
    >
      <template #title>
        AI 策略警告：部分规则已触发，建议谨慎参考 AI 输出
      </template>
    </ElAlert>

    <div v-if="status === 'idle' && !isPolicyBlocked" class="ai-suggestion-card__empty">
      <p>AI 不会自动消耗 token，点击后再生成审批审查建议。</p>
      <ElButton type="primary" :loading="isGenerating" @click="handleGenerate">
        生成 Copilot 审查
      </ElButton>
    </div>

    <div v-else-if="isPolicyBlocked && status === 'success'" class="ai-suggestion-card__empty">
      <p class="ai-suggestion-card__blocked-reason">
        {{ displayReasoning }}
      </p>
      <ElButton type="info" disabled>AI 建议已禁用</ElButton>
    </div>

    <div v-else-if="status === 'loading' || status === 'streaming'" class="ai-suggestion-card__body">
      <div class="ai-suggestion-card__actions">
        <ElButton type="danger" plain @click="handleStop">停止审阅</ElButton>
        <ElButton type="primary" :loading="true">生成中...</ElButton>
      </div>
      <div class="ai-suggestion-card__reasoning ai-suggestion-card__reasoning--streaming">
        {{ displayReasoning || 'AI 正在分析审批上下文，请稍候...' }}
      </div>
    </div>

    <div v-else-if="status === 'cancelled'" class="ai-suggestion-card__body">
      <p class="ai-suggestion-card__cancelled">本次审阅已取消，已生成的片段不会作为建议保存。</p>
      <div class="ai-suggestion-card__actions">
        <ElButton type="primary" plain @click="handleRetry">
          重新生成
        </ElButton>
      </div>
    </div>

    <div v-else-if="status === 'error'" class="ai-suggestion-card__body">
      <p class="ai-suggestion-card__error">{{ errorMessage || 'AI 建议生成失败' }}</p>
      <div class="ai-suggestion-card__actions">
        <ElButton type="primary" plain @click="handleRetry">
          重新生成
        </ElButton>
      </div>
    </div>

    <div v-else-if="suggestion" class="ai-suggestion-card__body">
      <div class="ai-suggestion-card__meta">
        <div class="ai-suggestion-card__metric">
          <span class="label">建议</span>
          <span class="value">{{ cardTitle }}</span>
        </div>
        <div class="ai-suggestion-card__metric">
          <span class="label">置信度</span>
          <span class="value">{{ confidenceText }}</span>
        </div>
        <div class="ai-suggestion-card__metric">
          <span class="label">风险等级</span>
          <span class="value">{{ riskLevelText(suggestion.riskLevel) }}</span>
        </div>
      </div>

      <div v-if="reviewSummary" class="ai-copilot-section">
        <div class="ai-copilot-section__title">审查摘要</div>
        <div class="ai-copilot-summary">
          <div class="ai-copilot-summary__item">
            <span class="label">标题</span>
            <span class="value">{{ reviewSummary.title }}</span>
          </div>
          <div class="ai-copilot-summary__item">
            <span class="label">申请人</span>
            <span class="value">{{ reviewSummary.applicant }}</span>
          </div>
          <div class="ai-copilot-summary__item">
            <span class="label">类型</span>
            <span class="value">{{ reviewSummary.approvalType }}</span>
          </div>
          <div class="ai-copilot-summary__item">
            <span class="label">金额</span>
            <span class="value">{{ formatAmount(reviewSummary.amount) }}</span>
          </div>
          <div class="ai-copilot-summary__item">
            <span class="label">当前节点</span>
            <span class="value">{{ reviewSummary.currentNodeName || '-' }}</span>
          </div>
        </div>
        <ul v-if="reviewSummary.timeline.length" class="ai-copilot-timeline">
          <li v-for="(item, index) in reviewSummary.timeline" :key="index">{{ item }}</li>
        </ul>
      </div>

      <div v-if="riskPoints.length" class="ai-copilot-section">
        <div class="ai-copilot-section__title">风险点</div>
        <div class="ai-copilot-risk-list">
          <div
            v-for="(item, index) in riskPoints"
            :key="`${item.title}-${index}`"
            class="ai-copilot-risk"
          >
            <div class="ai-copilot-risk__header">
              <span class="ai-copilot-risk__title">{{ item.title }}</span>
              <ElTag :type="riskPointType(item.level)" size="small" effect="light">
                {{ riskLevelText(item.level) }}
              </ElTag>
            </div>
            <p class="ai-copilot-risk__detail">{{ item.detail }}</p>
            <span class="ai-copilot-risk__source">来源：{{ riskSourceText(item.source) }}</span>
          </div>
        </div>
      </div>

      <div v-if="evidenceItems.length" class="ai-copilot-section">
        <div class="ai-copilot-section__title">依据来源</div>
        <div class="ai-copilot-evidence-list">
          <div
            v-for="(item, index) in evidenceItems"
            :key="`${item.title}-${index}`"
            class="ai-copilot-evidence"
          >
            <div class="ai-copilot-evidence__header">
              <span class="ai-copilot-evidence__title">{{ item.title }}</span>
              <div class="ai-copilot-evidence__meta">
                <ElTag size="small" effect="plain">{{ evidenceSourceText(item.source) }}</ElTag>
                <span class="ai-copilot-evidence__confidence">{{ evidenceConfidenceText(item.confidence) }}</span>
              </div>
            </div>
            <p class="ai-copilot-evidence__detail">{{ item.detail }}</p>
          </div>
        </div>
      </div>

      <div class="ai-suggestion-card__reasoning">
        {{ displayReasoning }}
      </div>

      <!-- 推理溯源视图 -->
      <ReasoningSegmentView v-if="reasoningSegments.length" :segments="reasoningSegments" />

      <!-- 不确定性分析面板 -->
      <div v-if="uncertainties.length" class="uncertainty-panel">
        <ElCollapse>
          <ElCollapseItem name="uncertainties">
            <template #title>
              <div class="uncertainty-panel__header">
                <ElTag class="uncertainty-panel__tag" type="danger" size="small" effect="dark">
                  <WarningFilled class="uncertainty-panel__icon" aria-hidden="true" />
                  {{ uncertainties.length }} 个不确定性
                </ElTag>
                <span class="uncertainty-panel__hint">点击展开查看详情</span>
              </div>
            </template>
            <div
              v-for="(item, index) in uncertainties"
              :key="index"
              class="uncertainty-item"
            >
              <div class="uncertainty-item__header">
                <span class="uncertainty-item__topic">{{ item.topic }}</span>
                <ElTag
                  :type="item.level === 'high' ? 'danger' : item.level === 'medium' ? 'warning' : 'info'"
                  size="small"
                >
                  {{ item.level === 'high' ? '高' : item.level === 'medium' ? '中' : '低' }}不确定
                </ElTag>
              </div>
              <p class="uncertainty-item__desc">{{ item.description }}</p>
              <p class="uncertainty-item__action">
                <strong>建议：</strong>{{ item.suggestedAction }}
              </p>
            </div>
          </ElCollapseItem>
        </ElCollapse>
      </div>

      <!-- 反馈状态提示 -->
      <div v-if="feedbackState === 'accepted'" class="ai-feedback-badge ai-feedback-badge--accepted">
        ✅ 已采纳 AI 建议
      </div>
      <div v-else-if="feedbackState === 'overridden'" class="ai-feedback-badge ai-feedback-badge--overridden">
        ↩ 已覆盖 AI 建议
      </div>

      <div class="ai-suggestion-card__actions">
        <template v-if="feedbackState === 'none' && !isPolicyBlocked">
          <ElButton
            type="success"
            plain
            size="small"
            :loading="isAccepting"
            @click="handleAccept"
          >
            👍 采纳建议
          </ElButton>
          <ElButton
            type="warning"
            plain
            size="small"
            :loading="isOverriding"
            @click="handleOverride"
          >
            👎 忽略建议
          </ElButton>
        </template>
        <ElButton plain :loading="isGenerating" @click="handleRetry">
          重新生成
        </ElButton>
      </div>
    </div>

    <!-- 覆盖原因弹窗 -->
    <ElDialog
      v-model="showOverrideDialog"
      title="忽略 AI 建议"
      width="420px"
      :close-on-click-modal="false"
    >
      <p style="margin: 0 0 12px; color: #606266; font-size: 14px;">
        请填写忽略 AI 建议的原因，以完善审计记录：
      </p>
      <ElInput
        v-model="overrideReason"
        type="textarea"
        :rows="3"
        placeholder="例如：金额信息不完整、附件缺失..."
      />
      <template #footer>
        <ElButton @click="cancelOverride">取消</ElButton>
        <ElButton
          type="primary"
          :loading="isOverriding"
          :disabled="!overrideReason.trim()"
          @click="confirmOverride"
        >
          确认忽略
        </ElButton>
      </template>
    </ElDialog>

    <div class="ai-suggestion-card__footer">
      {{ suggestion?.disclaimer || 'AI 建议仅供参考，最终以人工审批为准' }}
      <template v-if="policyDisclaimer">
        <br>{{ policyDisclaimer }}
      </template>
    </div>
  </ElCard>
</template>

<style scoped>
.ai-suggestion-card {
  margin-top: 24px;
  border-width: 1px;
  border-style: solid;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ai-suggestion-card--success {
  border-color: #95d5b2;
  box-shadow: 0 8px 24px rgba(67, 160, 71, 0.08);
}

.ai-suggestion-card--warning {
  border-color: #f3d19e;
  box-shadow: 0 8px 24px rgba(230, 162, 60, 0.08);
}

.ai-suggestion-card--neutral {
  border-color: #dcdfe6;
}

.ai-suggestion-card--blocked {
  border-color: #dcdfe6;
  opacity: 0.7;
  background: #f5f7fa;
}

.ai-policy-warning-banner {
  margin-bottom: 16px;
}

.ai-suggestion-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ai-suggestion-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.ai-suggestion-card__subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.ai-suggestion-card__body,
.ai-suggestion-card__empty {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-suggestion-card__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.ai-suggestion-card__metric {
  padding: 12px 14px;
  border-radius: 10px;
  background: #f7f8fa;
}

.ai-suggestion-card__metric .label {
  display: block;
  font-size: 12px;
  color: #909399;
}

.ai-suggestion-card__metric .value {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.ai-copilot-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 2px;
}

.ai-copilot-section__title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.ai-copilot-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
}

.ai-copilot-summary__item {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fcfcfd;
}

.ai-copilot-summary__item .label {
  display: block;
  font-size: 12px;
  color: #909399;
}

.ai-copilot-summary__item .value {
  display: block;
  margin-top: 6px;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.ai-copilot-timeline {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.ai-copilot-risk-list,
.ai-copilot-evidence-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-copilot-risk,
.ai-copilot-evidence {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.ai-copilot-risk__header,
.ai-copilot-evidence__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.ai-copilot-risk__title,
.ai-copilot-evidence__title {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.ai-copilot-risk__detail,
.ai-copilot-evidence__detail {
  margin: 8px 0 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.ai-copilot-risk__source {
  display: inline-block;
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
}

.ai-copilot-evidence__meta {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

.ai-copilot-evidence__confidence {
  color: #909399;
  font-size: 12px;
}

.ai-suggestion-card__reasoning {
  min-height: 96px;
  padding: 14px 16px;
  line-height: 1.75;
  color: #606266;
  background: #fafafa;
  border-radius: 10px;
  white-space: pre-wrap;
}

.ai-suggestion-card__reasoning--streaming::after {
  content: '';
  display: inline-block;
  width: 1px;
  height: 1em;
  margin-left: 4px;
  background: currentColor;
  animation: cursor-blink 1s steps(1) infinite;
  vertical-align: text-bottom;
}

.ai-feedback-badge {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}

.ai-feedback-badge--accepted {
  background: #f0f9eb;
  color: #67c23a;
}

.ai-feedback-badge--overridden {
  background: #fef0f0;
  color: #f56c6c;
}

.ai-suggestion-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ai-suggestion-card__error {
  margin: 0;
  color: #f56c6c;
}

.ai-suggestion-card__blocked-reason {
  margin: 0 0 12px 0;
  color: #909399;
  line-height: 1.6;
}

.ai-suggestion-card__footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #ebeef5;
  font-size: 12px;
  color: #909399;
}

/* ====== 不确定性面板 ====== */

.uncertainty-panel {
  margin-top: 8px;
}

.uncertainty-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.uncertainty-panel__tag :deep(.el-tag__content) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
  white-space: nowrap;
}

.uncertainty-panel__icon {
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
}

.uncertainty-panel__hint {
  font-size: 12px;
  color: #909399;
}

.uncertainty-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.uncertainty-item:last-child {
  border-bottom: none;
}

.uncertainty-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.uncertainty-item__topic {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.uncertainty-item__desc {
  margin: 0 0 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.uncertainty-item__action {
  margin: 0;
  font-size: 13px;
  color: #e6a23c;
  line-height: 1.6;
}

.uncertainty-item__action strong {
  color: #303133;
}

@keyframes cursor-blink {
  0%, 49% {
    opacity: 1;
  }

  50%, 100% {
    opacity: 0;
  }
}
</style>
