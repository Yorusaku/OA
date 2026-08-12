<script setup lang="ts">
import type { AiReasoningSegment } from '@oa/contracts'
import { computed, ref } from 'vue'
import { ElPopover, ElTag } from 'element-plus'
import { Document, Files, DataAnalysis, Cpu as CpuIcon } from '@element-plus/icons-vue'

const props = defineProps<{
  segments: AiReasoningSegment[]
}>()

const activeSegment = ref<string | null>(null)

const SOURCE_CONFIG = {
  knowledge_base: { label: '知识库', color: '#67c23a', bg: '#f0f9eb', icon: Document },
  historical_data: { label: '历史数据', color: '#409eff', bg: '#ecf5ff', icon: Files },
  form_data: { label: '表单数据', color: '#9b59b6', bg: '#f4f0f7', icon: DataAnalysis },
  model_judgment: { label: '模型判断', color: '#e6a23c', bg: '#fdf6ec', icon: CpuIcon },
} as const

function sourceConfig(source: string) {
  return SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG.model_judgment
}

function confidenceText(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

const sourceLegend = computed(() => {
  const sources = new Set(props.segments.map(s => s.source))
  return Array.from(sources).map(source => sourceConfig(source))
})

function toggleCitation(id: string) {
  activeSegment.value = activeSegment.value === id ? null : id
}
</script>

<template>
  <div class="reasoning-segment-view" v-if="segments.length">
    <!-- 来源图例 -->
    <div class="source-legend">
      <span
        v-for="legend in sourceLegend"
        :key="legend.label"
        class="legend-item"
        :style="{ color: legend.color, borderColor: legend.color }"
      >
        <ElTag :color="legend.color" size="small" effect="plain">
          {{ legend.label }}
        </ElTag>
      </span>
    </div>

    <!-- Segment 列表 -->
    <div class="segments-list">
      <div
        v-for="(segment, index) in segments"
        :key="index"
        class="reasoning-segment"
        :class="[`source-${segment.source}`, { clickable: !!segment.citation }]"
        :style="{
          borderLeftColor: sourceConfig(segment.source).color,
          background: sourceConfig(segment.source).bg,
        }"
        @click="segment.citation ? toggleCitation(`seg-${index}`) : undefined"
      >
        <div class="segment-header">
          <ElTag :type="segment.source === 'knowledge_base' ? 'success' : segment.source === 'form_data' ? 'info' : segment.source === 'historical_data' ? 'primary' : 'warning'" size="small" effect="light">
            <component :is="sourceConfig(segment.source).icon" style="margin-right: 4px;" />
            {{ sourceConfig(segment.source).label }}
          </ElTag>
          <span
            class="segment-confidence"
            :style="{ color: segment.confidence >= 0.8 ? '#67c23a' : segment.confidence >= 0.6 ? '#e6a23c' : '#f56c6c' }"
          >
            {{ confidenceText(segment.confidence) }}
          </span>
        </div>
        <div class="segment-content">{{ segment.content }}</div>

        <!-- 引用弹窗 -->
        <ElPopover
          v-if="segment.citation"
          :visible="activeSegment === `seg-${index}`"
          placement="bottom"
          :width="320"
          trigger="click"
          teleported
        >
          <template #reference>
            <span class="citation-trigger" @click.stop="toggleCitation(`seg-${index}`)">
              查看溯源 →
            </span>
          </template>
          <div class="citation-detail">
            <div class="citation-header">
              <ElTag size="small" :type="segment.source === 'knowledge_base' ? 'success' : segment.source === 'form_data' ? 'info' : segment.source === 'historical_data' ? 'primary' : 'warning'">
                {{ sourceConfig(segment.source).label }} 来源
              </ElTag>
            </div>
            <div class="citation-body">
              <template v-if="segment.source === 'knowledge_base' && segment.citation.documentId">
                <div class="citation-row">
                  <span class="label">文档ID</span>
                  <code>{{ segment.citation.documentId }}</code>
                </div>
              </template>
              <template v-if="segment.source === 'form_data' && segment.citation.fieldName">
                <div class="citation-row">
                  <span class="label">表单字段</span>
                  <code>{{ segment.citation.fieldName }}</code>
                </div>
              </template>
              <template v-if="segment.source === 'historical_data' && segment.citation.approvalId">
                <div class="citation-row">
                  <span class="label">关联审批</span>
                  <code>{{ segment.citation.approvalId }}</code>
                </div>
              </template>
              <div class="citation-row">
                <span class="label">详情</span>
                <span class="value">{{ segment.citation.detail }}</span>
              </div>
              <div class="citation-row">
                <span class="label">置信度</span>
                <span class="value" :style="{ color: segment.confidence >= 0.8 ? '#67c23a' : segment.confidence >= 0.6 ? '#e6a23c' : '#f56c6c' }">
                  {{ confidenceText(segment.confidence) }}
                </span>
              </div>
            </div>
          </div>
        </ElPopover>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reasoning-segment-view {
  margin: 8px 0;
}

.source-legend {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.legend-item {
  font-size: 12px;
}

.segments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reasoning-segment {
  padding: 10px 14px;
  border-left: 3px solid;
  border-radius: 6px;
  transition: box-shadow 0.15s ease;
}

.reasoning-segment.clickable {
  cursor: pointer;
}

.reasoning-segment.clickable:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.segment-confidence {
  font-size: 12px;
  font-weight: 600;
}

.segment-content {
  font-size: 13px;
  line-height: 1.7;
  color: #303133;
}

.citation-trigger {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
  user-select: none;
}

.citation-trigger:hover {
  text-decoration: underline;
}

.citation-detail {
  font-size: 13px;
}

.citation-header {
  margin-bottom: 10px;
}

.citation-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.citation-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.citation-row .label {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.citation-row code {
  font-size: 12px;
  background: #f5f7fa;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.citation-row .value {
  text-align: right;
  color: #303133;
}
</style>
