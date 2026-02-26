<script setup lang="ts">
import type { WorkflowStatus } from '@/types/workflow'
import {
  ElButton,
  ElInput,
  ElOption,
  ElSelect,
} from 'element-plus'

defineProps<{
  workflowName: string
  workflowStatus: WorkflowStatus
  isSaving: boolean
}>()

defineEmits<{
  'update:workflowName': [value: string]
  'update:workflowStatus': [value: WorkflowStatus]
  save: []
  back: []
}>()
</script>

<template>
  <div class="h-14 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 px-6">
    <div class="flex items-center gap-4">
      <ElButton @click="$emit('back')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回
      </ElButton>
      <div class="flex items-center gap-3">
        <ElInput
          :model-value="workflowName"
          placeholder="请输入流程名称"
          class="w-72"
          @update:model-value="$emit('update:workflowName', $event)"
        />
        <ElSelect
          :model-value="workflowStatus"
          style="width: 120px"
          @update:model-value="$emit('update:workflowStatus', $event)"
        >
          <ElOption label="草稿" value="draft" />
          <ElOption label="启用" value="active" />
          <ElOption label="停用" value="inactive" />
        </ElSelect>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <ElButton :loading="isSaving" @click="$emit('save')">
        保存
      </ElButton>
    </div>
  </div>
</template>

<style scoped>
</style>
