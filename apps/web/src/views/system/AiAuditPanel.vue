<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElCard, ElCol, ElEmpty, ElProgress, ElRow, ElStatistic, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { useAiAuditStats, useAiAuditLogs } from '@/composables/useAiAudit'
import type { AiAuditStats } from '@oa/contracts'

// 统计数据
const { stats, isLoading: statsLoading } = useAiAuditStats()

// 审计日志列表
const logQuery = ref<Record<string, unknown>>({ page: 1, pageSize: 20 })
const { data: logsData, isLoading: logsLoading } = useAiAuditLogs(logQuery)

const acceptanceRatePercent = computed(() => {
  if (!stats.value)
    return 0
  return Math.round(stats.value.acceptedRate * 100)
})

const confidenceTags = computed(() => {
  if (!stats.value) return []
  return [
    { label: '低置信度', count: stats.value.confidenceDistribution.low, type: 'danger' as const },
    { label: '中置信度', count: stats.value.confidenceDistribution.medium, type: 'warning' as const },
    { label: '高置信度', count: stats.value.confidenceDistribution.high, type: 'success' as const },
  ]
})

const riskTags = computed(() => {
  if (!stats.value) return []
  return [
    { label: '低风险', count: stats.value.riskDistribution.low, type: 'success' as const },
    { label: '中风险', count: stats.value.riskDistribution.medium, type: 'warning' as const },
    { label: '高风险', count: stats.value.riskDistribution.high, type: 'danger' as const },
  ]
})

function formatAction(action: string): string {
  const map: Record<string, string> = {
    'ai.suggestion.generated': 'AI 建议生成',
    'ai.suggestion.accepted': '采纳建议',
    'ai.suggestion.overridden': '覆盖建议',
  }
  return map[action] || action
}

function getActionTagType(action: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  if (action === 'ai.suggestion.accepted') return 'success'
  if (action === 'ai.suggestion.overridden') return 'warning'
  if (action === 'ai.suggestion.generated') return 'primary'
  return 'info'
}
</script>

<template>
  <div class="ai-audit-page">
    <h2 class="page-title">AI 决策审计</h2>

    <!-- 统计卡片 -->
    <ElRow :gutter="16" class="stats-row">
      <ElCol :span="6">
        <ElCard shadow="hover">
          <ElStatistic title="AI 建议总数" :value="stats?.totalSuggestions ?? 0" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="hover">
          <ElStatistic title="采纳数" :value="stats?.acceptedCount ?? 0" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="hover">
          <ElStatistic title="覆盖数" :value="stats?.overriddenCount ?? 0" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="hover">
          <ElStatistic title="采纳率" :value="acceptanceRatePercent" />
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="stats-row">
      <ElCol :span="6">
        <ElCard shadow="hover">
          <ElStatistic title="平均延迟" :value="stats?.avgLatencyMs ?? 0" />
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- 置信度分布 -->
    <ElRow :gutter="16" class="stats-row">
      <ElCol :span="12">
        <ElCard shadow="hover">
          <template #header>
            <h3 class="card-title">置信度分布</h3>
          </template>
          <div v-if="statsLoading" class="loading-placeholder">加载中...</div>
          <div v-else-if="!stats || stats.totalSuggestions === 0" class="empty-placeholder">
            <ElEmpty description="暂无 AI 建议记录" />
          </div>
          <div v-else class="tag-row">
            <div v-for="tag in confidenceTags" :key="tag.label" class="tag-item">
              <ElTag :type="tag.type" size="large">{{ tag.label }}</ElTag>
              <span class="tag-count">{{ tag.count }}</span>
              <ElProgress
                :percentage="stats.totalSuggestions > 0 ? Math.round(tag.count / stats.totalSuggestions * 100) : 0"
                :color="tag.type === 'success' ? '#67c23a' : tag.type === 'warning' ? '#e6a23c' : '#f56c6c'"
                :show-text="false"
                style="width: 120px"
              />
            </div>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :span="12">
        <ElCard shadow="hover">
          <template #header>
            <h3 class="card-title">风险等级分布</h3>
          </template>
          <div v-if="statsLoading" class="loading-placeholder">加载中...</div>
          <div v-else-if="!stats || stats.totalSuggestions === 0" class="empty-placeholder">
            <ElEmpty description="暂无 AI 建议记录" />
          </div>
          <div v-else class="tag-row">
            <div v-for="tag in riskTags" :key="tag.label" class="tag-item">
              <ElTag :type="tag.type" size="large">{{ tag.label }}</ElTag>
              <span class="tag-count">{{ tag.count }}</span>
              <ElProgress
                :percentage="stats.totalSuggestions > 0 ? Math.round(tag.count / stats.totalSuggestions * 100) : 0"
                :color="tag.type === 'success' ? '#67c23a' : tag.type === 'warning' ? '#e6a23c' : '#f56c6c'"
                :show-text="false"
                style="width: 120px"
              />
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- 审计日志表格 -->
    <ElCard class="audit-table-card">
      <template #header>
        <h3 class="card-title">AI 审计日志</h3>
      </template>
      <ElTable
        v-loading="logsLoading"
        :data="(logsData?.list as any[]) || []"
        style="width: 100%"
        empty-text="暂无 AI 审计记录"
      >
        <ElTableColumn prop="operatorName" label="操作人" width="120" />
        <ElTableColumn prop="action" label="动作" width="140">
          <template #default="{ row }">
            <ElTag :type="getActionTagType(row.action)" size="small">
              {{ formatAction(row.action) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="summary" label="摘要" min-width="280" show-overflow-tooltip />
        <ElTableColumn prop="targetId" label="审批单号" width="160" />
        <ElTableColumn prop="durationMs" label="耗时" width="90">
          <template #default="{ row }">
            {{ row.durationMs ? `${row.durationMs}ms` : '-' }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="operatedAt" label="时间" width="180" />
      </ElTable>
    </ElCard>
  </div>
</template>

<style scoped>
.ai-audit-page {
  padding: 20px;
}

.page-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.stats-row {
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.loading-placeholder,
.empty-placeholder {
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.tag-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 80px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tag-count {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  min-width: 32px;
}

.audit-table-card {
  margin-top: 16px;
}
</style>
