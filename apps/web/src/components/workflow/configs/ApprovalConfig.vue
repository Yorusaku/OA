<script setup lang="ts">
/**
 * ApprovalConfig - 审批/抄送节点业务配置组件
 * 包含处理人类型、审批方式、超时配置等
 */
import type { HandlerType, WorkflowNode } from '@/types/workflow'
import {
  ElDivider,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
} from 'element-plus'

// ==================== Props & Emits ====================
const props = defineProps<{
  /** 节点数据（双向绑定） */
  modelValue: WorkflowNode
  /** 表单 Schema 列表 */
  formSchemas?: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [node: WorkflowNode]
}>()

// ==================== 计算属性 ====================
const isApproval = computed(() => props.modelValue.type === 'approval')
const isCc = computed(() => props.modelValue.type === 'cc')

// 处理人配置（确保存在）
const handler = computed({
  get: () => props.modelValue.handler || { type: 'role', mode: 'or' },
  set: (val) => emit('update:modelValue', { ...props.modelValue, handler: val }),
})

const handlerTypeOptions = [
  { label: '角色', value: 'role' },
  { label: '部门', value: 'dept' },
  { label: '指定人员', value: 'user' },
  { label: '部门负责人', value: 'deptManager' },
  { label: '发起人自己', value: 'initiator' },
]

const approvalModeOptions = [
  { label: '或签（一人审批即可）', value: 'or' },
  { label: '会签（所有人审批）', value: 'and' },
  { label: '依次审批', value: 'sequential' },
]

// 角色选项
const roleOptions = [
  { label: '部门经理', value: 'dept_manager' },
  { label: '总监', value: 'director' },
  { label: 'HR', value: 'hr' },
  { label: '财务', value: 'finance' },
]

// 部门选项
const deptOptions = [
  { label: '技术部', value: 'tech' },
  { label: '产品部', value: 'product' },
  { label: '运营部', value: 'operation' },
  { label: '人事部', value: 'hr' },
  { label: '财务部', value: 'finance' },
]

// 人员选项
const userOptions = [
  { label: '张三', value: 'user1' },
  { label: '李四', value: 'user2' },
  { label: '王五', value: 'user3' },
]
</script>

<template>
  <div class="approval-config">
    <ElDivider v-if="isApproval || isCc" />

    <!-- 处理人配置（审批/抄送节点） -->
    <template v-if="isApproval || isCc">
      <ElForm label-width="80px" label-position="top" size="small">
        <ElFormItem label="处理人类型">
          <ElRadioGroup v-model="handler.type">
            <ElRadio
              v-for="opt in handlerTypeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </ElRadio>
          </ElRadioGroup>
        </ElFormItem>

        <ElFormItem v-if="isApproval" label="审批方式">
          <ElRadioGroup v-model="handler.mode">
            <ElRadio
              v-for="opt in approvalModeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </ElRadio>
          </ElRadioGroup>
        </ElFormItem>

        <!-- 角色选择 -->
        <ElFormItem v-if="handler.type === 'role'" label="选择角色">
          <ElSelect v-model="handler.roleIds" multiple style="width: 100%">
            <ElOption
              v-for="opt in roleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </ElSelect>
        </ElFormItem>

        <!-- 部门选择 -->
        <ElFormItem v-if="handler.type === 'dept'" label="选择部门">
          <ElSelect v-model="handler.deptIds" multiple style="width: 100%">
            <ElOption
              v-for="opt in deptOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </ElSelect>
        </ElFormItem>

        <!-- 人员选择 -->
        <ElFormItem v-if="handler.type === 'user'" label="选择人员">
          <ElSelect v-model="handler.userIds" multiple style="width: 100%">
            <ElOption
              v-for="opt in userOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
    </template>

    <ElDivider v-if="isApproval" />

    <!-- 审批节点特有配置 -->
    <template v-if="isApproval">
      <ElForm label-width="80px" label-position="top" size="small">
        <ElFormItem label="绑定表单">
          <ElSelect
            v-model="modelValue.formSchemaId"
            placeholder="选择表单 Schema"
            style="width: 100%"
            clearable
          >
            <ElOption
              v-for="schema in formSchemas"
              :key="schema.id"
              :label="schema.name"
              :value="schema.id"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="超时配置">
          <div style="display: flex; gap: 8px; align-items: center">
            <ElInputNumber
              v-model="modelValue.timeout"
              :min="0"
              :max="720"
              placeholder="小时"
              style="width: 100px"
            />
            <span>小时</span>
          </div>
        </ElFormItem>

        <ElFormItem label="超时自动通过">
          <ElSwitch v-model="modelValue.autoPassOnTimeout" />
        </ElFormItem>
      </ElForm>
    </template>
  </div>
</template>
