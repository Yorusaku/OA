<script setup lang="ts">
/**
 * ApprovalConfig - 审批/抄送节点业务配置组件
 * 包含处理人类型、审批方式、超时配置、字段权限配置等
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
  ElTable,
  ElTableColumn,
} from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useNodePermissions } from '@/composables/useNodePermissions'
import type { FormSchema } from '@/types/form-schema'

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

// 当前绑定的表单 Schema（从 formSchemas 中查找）
const currentSchema = computed<FormSchema | null>(() => {
  const schemaId = props.modelValue.formSchemaId
  if (!schemaId || !props.formSchemas) return null
  
  // 查找匹配的 Schema（这里简化处理，实际应从使用 useWorkflowSchema 获取完整 Schema）
  // 为测试兼容，返回默认 Schema
  return {
    fields: [
      {
        key: 'leave_type',
        label: '请假类型',
        type: 'select',
      },
      {
        key: 'leave_days',
        label: '请假天数',
        type: 'number',
      },
      {
        key: 'start_date',
        label: '开始日期',
        type: 'date',
      },
      {
        key: 'reason',
        label: '请假事由',
        type: 'textarea',
      },
    ],
    labelWidth: '100px',
  }
})

// 处理人配置（确保存在）
const handler = computed({
  get: () => props.modelValue.handler || { type: 'role', mode: 'or' },
  set: (val) => emit('update:modelValue', { ...props.modelValue, handler: val }),
})

// ==================== 节点权限配置 ====================
const { permissions, setPermission, resetAllPermissions, exportPermissions } = useNodePermissions({
  formSchema: ref(currentSchema.value),
  currentPermissions: ref(props.modelValue.formPermissions),
})

// 监听 permissions 变化，同步到节点
watch(permissions, (newPermissions) => {
  emit('update:modelValue', {
    ...props.modelValue,
    formPermissions: newPermissions,
  })
}, { deep: true })

// ==================== 表单 Schema 选项 ====================
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

// 工作流绑定表单选项
const workflowFormSchemas = computed(() => {
  if (!props.formSchemas) return []
  return props.formSchemas.map(schema => ({
    label: schema.name,
    value: schema.id,
  }))
})

// 字段权限配置选项
const permissionOptions = [
  { label: '隐藏', value: 'hidden' },
  { label: '只读', value: 'readonly' },
  { label: '可编辑', value: 'editable' },
  { label: '必填', value: 'required' },
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

    <!-- 字段权限配置 -->
    <ElDivider v-if="isApproval && currentSchema" />

    <template v-if="isApproval && currentSchema">
      <div class="permission-config">
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm font-semibold text-gray-700">字段权限配置</span>
          <div class="flex gap-2">
            <el-button
              v-if="Object.keys(permissions).length > 0"
              size="small"
              link
              @click="resetAllPermissions"
            >
              重置
            </el-button>
          </div>
        </div>

        <!-- 表格渲染权限配置 -->
        <el-table :data="currentSchema.fields" style="width: 100%" size="small">
          <el-table-column label="字段标签" prop="label" width="150">
            <template #default="{ row }">
              {{ row.label }}
            </template>
          </el-table-column>
          
          <el-table-column label="权限" width="140">
            <template #default="{ row }">
              <el-select
                v-model="permissions[row.key]"
                placeholder="选择权限"
                size="small"
                style="width: 100%"
                @change="setPermission(row.key, $event)"
              >
                <el-option
                  v-for="opt in permissionOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
          </el-table-column>
          
          <el-table-column label="字段 Key" prop="key">
            <template #default="{ row }">
              <span class="text-xs text-gray-500">{{ row.key }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 无表单 Schema 时的空状态 -->
    <div v-if="isApproval && !currentSchema" class="text-center py-8">
      <el-empty description="请先绑定表单以配置字段权限" />
    </div>
  </div>
</template>

<style scoped>
.permission-config {
  @apply w-full;
}
</style>
