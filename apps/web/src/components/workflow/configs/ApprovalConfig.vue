<script setup lang="ts">
/**
 * ApprovalConfig - 审批/抄送节点业务配置组件
 * 包含处理人类型、审批方式、超时配置、字段权限配置等
 * 
 * Phase 17 改造：工作流与本地表单库联动
 * - 数据源切换：使用 useLocalStorageFormStorage 的 formList
 * - Schema 联动：根据 formSchemaId 从 formList 查找真实 Schema
 * - 脏数据兜底：找不到表单时优雅降级为 ElEmpty
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
import { computed, ref, watch, onMounted } from 'vue'
import { useNodePermissions } from '@/composables/useNodePermissions'
import type { FormSchema } from '@/types/form-schema'
import { useLocalStorageFormStorage, type FormDTO } from '@/composables/useLocalStorageFormStorage'

// ==================== Props & Emits ====================
const props = defineProps<{
  /** 节点数据（双向绑定） */
  modelValue: WorkflowNode
  /** 表单 Schema 列表（兼容旧 prop，Phase 17 后废弃） */
  formSchemas?: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [node: WorkflowNode]
}>()

// ==================== 实例化本地表单存储 ====================
const { formList, getFormById, checkBindingCount } = useLocalStorageFormStorage()

// ==================== 计算属性 ====================
const isApproval = computed(() => props.modelValue.type === 'approval')
const isCc = computed(() => props.modelValue.type === 'cc')

// 【核心】当前绑定的表单 Schema（从本地 formList 中查找）
const currentSchema = computed<FormSchema | null>(() => {
  const schemaId = props.modelValue.formSchemaId
  if (!schemaId) return null

  // 从本地表单列表中查找对应的表单
  const found = formList.value.find((f: FormDTO) => f.id === schemaId)
  
  // 【防御核心】找不到表单或表单缺少 schema 时返回 null，触发 ElEmpty 渲染
  if (!found?.schema) return null
  
  return found.schema
})

// 处理人配置（确保存在）
const handler = computed({
  get: () => props.modelValue.handler || { type: 'role', mode: 'or' },
  set: (val) => emit('update:modelValue', { ...props.modelValue, handler: val }),
})

// ==================== 节点权限配置 ====================
const { permissions, setPermission, resetAllPermissions } = useNodePermissions({
  formSchema: computed(() => currentSchema.value),
  currentPermissions: computed(() => props.modelValue.formPermissions),
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

// 【Phase 17 改造】工作流绑定表单选项（直接从 formList 读取）
const workflowFormSchemas = computed(() => {
  // 优先使用 formList（Phase 17 新数据源）
  if (formList.value && formList.value.length > 0) {
    return formList.value.map((schema: FormDTO) => ({
      label: schema.name,
      value: schema.id,
    }))
  }
  
  // 兼容：如果 formList 为空，使用旧的 formSchemas prop（Phase 17 后废弃）
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

// ==================== 脏数据清理逻辑 ====================

/**
 * 处理脏数据并清空 formSchemaId（高内聚内部函数）
 * 调用场景：onMounted、watch(formSchemaId)、@change
 * 
 * @param schemaId 待检查的表单 ID
 * @returns 是否发现脏数据并已清理
 */
const handleDirtyData = (schemaId: string): boolean => {
  const found = getFormById(schemaId)
  
  if (!found) {
    // 【脏数据兜底】表单不存在，清理 formSchemaId
    emit('update:modelValue', {
      ...props.modelValue,
      formSchemaId: undefined,
    })
    return true // 发现并清理了脏数据
  }
  
  return false // 无脏数据
}

/**
 * 监听 formSchemaId 变化，自动清理脏数据
 */
watch(() => props.modelValue.formSchemaId, (newId, oldId) => {
  if (!newId) return // 清空时不处理

  handleDirtyData(newId)
}, { immediate: true })

/**
 * 组件挂载时初始化，清理可能的脏数据
 */
onMounted(() => {
  const schemaId = props.modelValue.formSchemaId
  if (schemaId) {
    handleDirtyData(schemaId)
  }
})

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
            <!-- 【Phase 17 改造】下拉框选项直接从 formList 读取 -->
            <ElOption
              v-for="schema in workflowFormSchemas"
              :key="schema.value"
              :label="schema.label"
              :value="schema.value"
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

    <!-- 【Phase 17 改造】有有效 Schema 时渲染权限配置表格 -->
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

    <!-- 【Phase 17 改造】无表单 Schema 时的空状态 -->
    <!-- 当 isApproval 且 currentSchema 为空时显示 -->
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
