<script setup lang="ts">
import type { ApprovalDelegationRule } from '@/api/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { disableApprovalDelegation, getApprovalDelegation, upsertApprovalDelegation } from '@/api/approval'
import { useUserStore } from '@/stores/user'

interface DelegationForm {
  delegateId: string
  delegateName: string
  startAt: string
  endAt: string
  enabled: boolean
}

const userStore = useUserStore()
const loading = ref(false)
const saving = ref(false)
const currentRule = ref<ApprovalDelegationRule | null>(null)

const mockApprovers = [
  { id: 'user-001', name: 'admin' },
  { id: 'user-002', name: 'manager' },
]

const currentUserId = computed(() => userStore.userInfo?.id || '')
const currentUserName = computed(() => userStore.userInfo?.name || '当前用户')
const delegateOptions = computed(() =>
  mockApprovers.filter(item => item.id !== currentUserId.value),
)

const form = reactive<DelegationForm>({
  delegateId: '',
  delegateName: '',
  startAt: '',
  endAt: '',
  enabled: true,
})

function parseDateTime(value?: string): Date | null {
  if (!value)
    return null
  const parsed = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime()))
    return null
  return parsed
}

function normalizeDateTimeText(value: string): string {
  return value.trim().replace('T', ' ')
}

async function loadRule(): Promise<void> {
  const ownerId = currentUserId.value
  if (!ownerId)
    return

  loading.value = true
  try {
    const rule = await getApprovalDelegation(ownerId)
    currentRule.value = rule

    if (!rule) {
      form.delegateId = ''
      form.delegateName = ''
      form.startAt = ''
      form.endAt = ''
      form.enabled = true
      return
    }

    form.delegateId = rule.delegateId
    form.delegateName = rule.delegateName
    form.enabled = rule.enabled
    form.startAt = rule.startAt
    form.endAt = rule.endAt
  }
  finally {
    loading.value = false
  }
}

async function saveRule(): Promise<void> {
  if (!currentUserId.value) {
    ElMessage.warning('请先登录后再配置代理')
    return
  }
  if (!form.delegateId) {
    ElMessage.warning('请选择代理人')
    return
  }
  if (!form.startAt || !form.endAt) {
    ElMessage.warning('请输入代理生效时间')
    return
  }

  const normalizedStartAt = normalizeDateTimeText(form.startAt)
  const normalizedEndAt = normalizeDateTimeText(form.endAt)
  const start = parseDateTime(normalizedStartAt)
  const end = parseDateTime(normalizedEndAt)
  if (!start || !end) {
    ElMessage.warning('时间格式无效，请使用 YYYY-MM-DD HH:mm:ss')
    return
  }
  if (start.getTime() >= end.getTime()) {
    ElMessage.warning('代理结束时间必须晚于开始时间')
    return
  }

  const delegate = delegateOptions.value.find(item => item.id === form.delegateId)
  if (!delegate) {
    ElMessage.warning('代理人无效，请重新选择')
    return
  }

  saving.value = true
  try {
    await upsertApprovalDelegation({
      ownerId: currentUserId.value,
      ownerName: currentUserName.value,
      delegateId: delegate.id,
      delegateName: delegate.name,
      startAt: normalizedStartAt,
      endAt: normalizedEndAt,
      enabled: form.enabled,
    })
    ElMessage.success('代理审批规则已保存')
    await loadRule()
  }
  finally {
    saving.value = false
  }
}

async function disableRule(): Promise<void> {
  if (!currentUserId.value)
    return
  saving.value = true
  try {
    await disableApprovalDelegation(currentUserId.value)
    ElMessage.success('代理审批规则已关闭')
    await loadRule()
  }
  finally {
    saving.value = false
  }
}

onMounted(loadRule)
</script>

<template>
  <div class="p-6">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold">代理审批设置</div>
          <el-tag type="info">{{ currentUserName }}</el-tag>
        </div>
      </template>

      <el-skeleton :loading="loading" animated>
        <template #default>
          <el-form label-width="120px" class="max-w-2xl">
            <el-form-item label="代理状态">
              <el-switch v-model="form.enabled" active-text="启用" inactive-text="关闭" />
            </el-form-item>

            <el-form-item label="代理人">
              <el-select v-model="form.delegateId" placeholder="请选择代理人" class="w-72" data-testid="delegation-delegate-select">
                <el-option
                  v-for="option in delegateOptions"
                  :key="option.id"
                  :label="`${option.name} (${option.id})`"
                  :value="option.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="生效时间">
              <div class="grid grid-cols-1 gap-3 w-full max-w-xl">
                <el-input
                  v-model="form.startAt"
                  placeholder="开始时间：YYYY-MM-DD HH:mm:ss"
                  data-testid="delegation-start-at"
                />
                <el-input
                  v-model="form.endAt"
                  placeholder="结束时间：YYYY-MM-DD HH:mm:ss"
                  data-testid="delegation-end-at"
                />
              </div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="saving" data-testid="delegation-save-btn" @click="saveRule">
                保存规则
              </el-button>
              <el-button :loading="saving" data-testid="delegation-disable-btn" @click="disableRule">
                关闭代理
              </el-button>
            </el-form-item>
          </el-form>

          <el-alert
            v-if="currentRule"
            type="success"
            show-icon
            :closable="false"
            class="mt-6"
            :title="`当前规则：${currentRule.ownerName} -> ${currentRule.delegateName}`"
            :description="`生效时间：${currentRule.startAt} 至 ${currentRule.endAt}；状态：${currentRule.enabled ? '启用' : '关闭'}`"
          />
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>
