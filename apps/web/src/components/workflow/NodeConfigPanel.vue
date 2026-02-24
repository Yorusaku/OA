<script setup lang="ts">
/**
 * NodeConfigPanel - 节点属性配置面板
 * 用于配置选中节点的详细属性
 */
import type { WorkflowNode } from '@/types/workflow'
import {
  ElButton,
  ElCard,
  ElDivider,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
} from 'element-plus'
import { computed, ref } from 'vue'

// ==================== Props & Emits ====================
const props = defineProps<{
  /** 选中的节点 */
  node?: WorkflowNode
  /** 可用的表单 Schema 列表 */
  formSchemas?: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  /** 节点配置更新 */
  update: [node: WorkflowNode]
  /** 删除节点 */
  delete: [nodeId: string]
  /** 关闭面板 */
  close: []
}>()

// ==================== 本地状态 ====================
const localNode = ref<WorkflowNode>({
  id: '',
  type: 'approval',
  name: '',
  description: '',
  handler: {
    type: 'role',
    mode: 'or',
  },
  enabled: true,
})

// 同步 node prop 到本地状态
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = {
        ...newNode,
        handler: newNode.handler || { type: 'role', mode: 'or' },
      }
    }
  },
  { immediate: true, deep: true },
)

// ==================== 计算属性 ====================
const isStartOrEnd = computed(() => {
  return localNode.value.type === 'start' || localNode.value.type === 'end'
})

const isApproval = computed(() => {
  return localNode.value.type === 'approval'
})

const isCc = computed(() => {
  return localNode.value.type === 'cc'
})

// ==================== 选项数据 ====================
const nodeTypeOptions = [
  { label: '审批节点', value: 'approval' },
  { label: '抄送节点', value: 'cc' },
  { label: '条件分支', value: 'condition' },
]

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

// ==================== 事件处理 ====================
/**
 * 保存配置
 */
function handleSave() {
  emit('update', { ...localNode.value })
}

/**
 * 删除节点
 */
function handleDelete() {
  if (localNode.value.id) {
    emit('delete', localNode.value.id)
  }
}

/**
 * 关闭面板
 */
function handleClose() {
  emit('close')
}
</script>

<template>
  <ElCard v-if="node" class="node-config-panel" shadow="never">
    <template #header>
      <div class="panel-header">
        <span class="panel-title">节点配置</span>
        <ElButton v-if="!isStartOrEnd" link type="danger" size="small" @click="handleDelete">
          删除节点
        </ElButton>
      </div>
    </template>

    <ElForm :model="localNode" label-width="80px" label-position="top" size="small">
      <!-- 基本信息 -->
      <ElFormItem v-if="!isStartOrEnd" label="节点类型">
        <ElSelect v-model="localNode.type" style="width: 100%">
          <ElOption
            v-for="opt in nodeTypeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="节点名称">
        <ElInput v-model="localNode.name" placeholder="请输入节点名称" />
      </ElFormItem>

      <ElFormItem label="节点描述">
        <ElInput
          v-model="localNode.description"
          type="textarea"
          :rows="2"
          placeholder="请输入节点描述"
        />
      </ElFormItem>

      <ElDivider v-if="!isStartOrEnd" />

      <!-- 处理人配置（审批/抄送节点） -->
      <template v-if="isApproval || isCc">
        <ElFormItem label="处理人类型">
          <ElRadioGroup v-model="localNode.handler!.type">
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
          <ElRadioGroup v-model="localNode.handler!.mode">
            <ElRadio
              v-for="opt in approvalModeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </ElRadio>
          </ElRadioGroup>
        </ElFormItem>

        <!-- 角色选择（简化版，实际应该从后端加载） -->
        <ElFormItem v-if="localNode.handler?.type === 'role'" label="选择角色">
          <ElSelect v-model="localNode.handler.roleIds" multiple style="width: 100%">
            <ElOption label="部门经理" value="dept_manager" />
            <ElOption label="总监" value="director" />
            <ElOption label="HR" value="hr" />
            <ElOption label="财务" value="finance" />
          </ElSelect>
        </ElFormItem>

        <!-- 部门选择 -->
        <ElFormItem v-if="localNode.handler?.type === 'dept'" label="选择部门">
          <ElSelect v-model="localNode.handler.deptIds" multiple style="width: 100%">
            <ElOption label="技术部" value="tech" />
            <ElOption label="产品部" value="product" />
            <ElOption label="运营部" value="operation" />
            <ElOption label="人事部" value="hr" />
            <ElOption label="财务部" value="finance" />
          </ElSelect>
        </ElFormItem>

        <!-- 人员选择 -->
        <ElFormItem v-if="localNode.handler?.type === 'user'" label="选择人员">
          <ElSelect v-model="localNode.handler.userIds" multiple style="width: 100%">
            <ElOption label="张三" value="user1" />
            <ElOption label="李四" value="user2" />
            <ElOption label="王五" value="user3" />
          </ElSelect>
        </ElFormItem>
      </template>

      <ElDivider v-if="isApproval" />

      <!-- 审批节点特有配置 -->
      <template v-if="isApproval">
        <ElFormItem label="绑定表单">
          <ElSelect v-model="localNode.formSchemaId" placeholder="选择表单 Schema" style="width: 100%" clearable>
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
              v-model="localNode.timeout"
              :min="0"
              :max="720"
              placeholder="小时"
              style="width: 100px"
            />
            <span>小时</span>
          </div>
        </ElFormItem>

        <ElFormItem label="超时自动通过">
          <ElSwitch v-model="localNode.autoPassOnTimeout" />
        </ElFormItem>
      </template>

      <ElDivider />

      <!-- 启用状态 -->
      <ElFormItem label="节点启用">
        <ElSwitch v-model="localNode.enabled" />
      </ElFormItem>
    </ElForm>

    <!-- 操作按钮 -->
    <div class="panel-actions">
      <ElButton @click="handleClose">
        取消
      </ElButton>
      <ElButton type="primary" @click="handleSave">
        保存
      </ElButton>
    </div>
  </ElCard>

  <div v-else class="empty-state">
    <ElIcon :size="48" color="#909399">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    </ElIcon>
    <p>点击节点进行配置</p>
  </div>
</template>

<style scoped>
.node-config-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.panel-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  text-align: center;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
