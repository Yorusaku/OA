<script setup lang="ts">
/**
 * BaseConfig - 节点基础配置组件
 * 包含节点名称、描述、启用状态等通用表单项
 */
import type { WorkflowNode } from '@/types/workflow'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElSwitch,
} from 'element-plus'

// ==================== Props & Emits ====================
const props = defineProps<{
  /** 节点数据（双向绑定） */
  modelValue: WorkflowNode
  /** 是否显示节点类型选择器 */
  showTypeSelect?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [node: WorkflowNode]
}>()

// ==================== 计算属性 ====================
const nodeTypeOptions = [
  { label: '审批节点', value: 'approval' },
  { label: '抄送节点', value: 'cc' },
  { label: '条件分支', value: 'condition' },
]

// ==================== 本地状态（用于 v-model 绑定） ====================
const name = computed({
  get: () => props.modelValue.name,
  set: (val) => emit('update:modelValue', { ...props.modelValue, name: val }),
})

const description = computed({
  get: () => props.modelValue.description || '',
  set: (val) => emit('update:modelValue', { ...props.modelValue, description: val }),
})

const type = computed({
  get: () => props.modelValue.type,
  set: (val) => emit('update:modelValue', { ...props.modelValue, type: val }),
})

const enabled = computed({
  get: () => props.modelValue.enabled ?? true,
  set: (val) => emit('update:modelValue', { ...props.modelValue, enabled: val }),
})
</script>

<template>
  <ElForm label-width="80px" label-position="top" size="small">
    <!-- 节点类型 -->
    <ElFormItem v-if="showTypeSelect" label="节点类型">
      <ElSelect v-model="type" style="width: 100%">
        <ElOption
          v-for="opt in nodeTypeOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </ElSelect>
    </ElFormItem>

    <!-- 节点名称 -->
    <ElFormItem label="节点名称">
      <ElInput v-model="name" placeholder="请输入节点名称" />
    </ElFormItem>

    <!-- 节点描述 -->
    <ElFormItem label="节点描述">
      <ElInput
        v-model="description"
        type="textarea"
        :rows="2"
        placeholder="请输入节点描述"
      />
    </ElFormItem>

    <!-- 启用状态 -->
    <ElFormItem label="节点启用">
      <ElSwitch v-model="enabled" />
    </ElFormItem>
  </ElForm>
</template>
