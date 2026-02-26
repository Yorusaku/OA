<script setup lang="ts">
/**
 * ConditionConfig - 条件分支节点配置组件
 * 包含条件表达式配置
 */
import type { ConditionExpression, WorkflowNode } from '@/types/workflow'
import {
  ElButton,
  ElDivider,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from 'element-plus'

// ==================== Props & Emits ====================
const props = defineProps<{
  /** 节点数据（双向绑定） */
  modelValue: WorkflowNode
}>()

const emit = defineEmits<{
  'update:modelValue': [node: WorkflowNode]
}>()

// ==================== 计算属性 ====================
const conditions = computed({
  get: () => props.modelValue.conditions || [],
  set: (val) => emit('update:modelValue', { ...props.modelValue, conditions: val }),
})

const fieldOptions = [
  { label: '请假天数', value: 'leave_days' },
  { label: '报销金额', value: 'amount' },
  { label: '请假类型', value: 'leave_type' },
]

const operatorOptions = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '包含', value: 'contains' },
]

// ==================== 事件处理 ====================
function addCondition() {
  const newCondition: ConditionExpression = {
    id: `cond-${Date.now()}`,
    name: '新条件',
    fieldKey: '',
    operator: 'eq',
    value: '',
  }
  conditions.value = [...conditions.value, newCondition]
}

function removeCondition(index: number) {
  conditions.value = conditions.value.filter((_, i) => i !== index)
}

function updateCondition(index: number, field: keyof ConditionExpression, value: any) {
  const updated = conditions.value.map((cond, i) =>
    i === index ? { ...cond, [field]: value } : cond
  )
  conditions.value = updated
}
</script>

<template>
  <div class="condition-config">
    <ElDivider />

    <ElForm label-width="80px" label-position="top" size="small">
      <ElFormItem label="条件分支">
        <div class="flex flex-col gap-3">
          <div
            v-for="(cond, index) in conditions"
            :key="cond.id"
            class="p-3 bg-gray-50 rounded"
          >
            <div class="flex justify-between items-center mb-2">
              <ElInput
                v-model="cond.name"
                placeholder="条件名称"
                size="small"
                class="w-36"
                @update:model-value="updateCondition(index, 'name', $event)"
              />
              <ElButton
                type="danger"
                size="small"
                link
                @click="removeCondition(index)"
              >
                删除
              </ElButton>
            </div>
            <div class="flex items-center gap-2">
              <ElSelect
                v-model="cond.fieldKey"
                placeholder="选择字段"
                size="small"
                class="w-30"
                @update:model-value="updateCondition(index, 'fieldKey', $event)"
              >
                <ElOption
                  v-for="opt in fieldOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </ElSelect>
              <ElSelect
                v-model="cond.operator"
                placeholder="操作符"
                size="small"
                class="w-24"
                @update:model-value="updateCondition(index, 'operator', $event)"
              >
                <ElOption
                  v-for="opt in operatorOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </ElSelect>
              <ElInput
                v-model="cond.value"
                placeholder="比较值"
                size="small"
                class="w-30"
                @update:model-value="updateCondition(index, 'value', $event)"
              />
            </div>
          </div>
          <ElButton type="primary" size="small" @click="addCondition">
            + 添加条件
          </ElButton>
        </div>
      </ElFormItem>
    </ElForm>
  </div>
</template>

<style scoped>
</style>
