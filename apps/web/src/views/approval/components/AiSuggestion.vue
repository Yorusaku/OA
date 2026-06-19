<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElCard, ElTag } from 'element-plus'
import { useAiSuggestion } from '@/composables/useAiSuggestion'

const props = defineProps<{
  approvalId: string
}>()

const {
  status,
  suggestion,
  streamedReasoning,
  errorMessage,
  isGenerating,
  generateSuggestion,
  retry,
} = useAiSuggestion(() => props.approvalId)

const displayReasoning = computed(() => {
  if (streamedReasoning.value)
    return streamedReasoning.value
  return suggestion.value?.reasoning || ''
})

const confidence = computed(() => suggestion.value?.confidence ?? 0)

const cardState = computed<'success' | 'warning' | 'neutral'>(() => {
  if (confidence.value >= 0.8)
    return 'success'
  if (confidence.value > 0.5)
    return 'warning'
  return 'neutral'
})

const cardTitle = computed(() => {
  if (!suggestion.value)
    return 'AI 审批建议'

  if (suggestion.value.suggestion === 'approve')
    return '建议通过'
  if (suggestion.value.suggestion === 'reject')
    return '建议驳回'
  return '建议人工判断'
})

const helperText = computed(() => {
  if (!suggestion.value)
    return '点击按钮生成 AI 建议，AI 仅作为审批辅助信息。'

  if (confidence.value >= 0.8)
    return '高置信度建议，可作为审批参考。'
  if (confidence.value > 0.5)
    return '中等置信度建议，请结合实际情况人工确认。'
  return 'AI 无法给出明确建议，建议以人工判断为主。'
})

const tagType = computed<'success' | 'warning' | 'info'>(() => {
  if (cardState.value === 'success')
    return 'success'
  if (cardState.value === 'warning')
    return 'warning'
  return 'info'
})

const confidenceText = computed(() => `${Math.round(confidence.value * 100)}%`)

function handleGenerate(): void {
  const task = generateSuggestion()
  if (task && typeof task.catch === 'function')
    void task.catch(() => {})
}

function handleRetry(): void {
  const task = retry()
  if (task && typeof task.catch === 'function')
    void task.catch(() => {})
}
</script>

<template>
  <ElCard class="ai-suggestion-card" :class="`ai-suggestion-card--${cardState}`">
    <template #header>
      <div class="ai-suggestion-card__header">
        <div>
          <div class="ai-suggestion-card__title">AI 审批建议</div>
          <div class="ai-suggestion-card__subtitle">{{ helperText }}</div>
        </div>
        <ElTag v-if="suggestion" :type="tagType" effect="light">
          {{ cardTitle }}
        </ElTag>
      </div>
    </template>

    <div v-if="status === 'idle'" class="ai-suggestion-card__empty">
      <p>AI 不会自动消耗 token，点击后再生成审批建议。</p>
      <ElButton type="primary" :loading="isGenerating" @click="handleGenerate">
        生成 AI 建议
      </ElButton>
    </div>

    <div v-else-if="status === 'loading' || status === 'streaming'" class="ai-suggestion-card__body">
      <div class="ai-suggestion-card__actions">
        <ElButton type="primary" :loading="true">生成中...</ElButton>
      </div>
      <div class="ai-suggestion-card__reasoning ai-suggestion-card__reasoning--streaming">
        {{ displayReasoning || 'AI 正在分析审批上下文，请稍候...' }}
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
          <span class="value">{{ suggestion.riskLevel }}</span>
        </div>
      </div>

      <div class="ai-suggestion-card__reasoning">
        {{ displayReasoning }}
      </div>

      <div class="ai-suggestion-card__actions">
        <ElButton plain :loading="isGenerating" @click="handleRetry">
          重新生成
        </ElButton>
      </div>
    </div>

    <div class="ai-suggestion-card__footer">
      {{ suggestion?.disclaimer || 'AI 建议仅供参考，最终以人工审批为准' }}
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

.ai-suggestion-card__actions {
  display: flex;
  justify-content: flex-end;
}

.ai-suggestion-card__error {
  margin: 0;
  color: #f56c6c;
}

.ai-suggestion-card__footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #ebeef5;
  font-size: 12px;
  color: #909399;
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
