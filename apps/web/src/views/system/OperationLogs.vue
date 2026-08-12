<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Search, View } from '@element-plus/icons-vue'
import { useAuditLogDetail, useAuditLogs, useExportAuditLogs } from '@/composables/useAuditLog'
import type { AuditAction, AuditEvent, AuditResult } from '@/api/types'
import { useRouter } from 'vue-router'

const router = useRouter()

// 筛选表单
const filterForm = reactive({
  operatorName: '',
  action: '' as AuditAction | '',
  module: '' as AuditEvent['module'] | '',
  result: '' as AuditResult | '',
  dateRange: null as [Date, Date] | null,
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
})

// 查询参数
const queryParams = computed(() => ({
  ...pagination,
  operatorName: filterForm.operatorName || undefined,
  action: filterForm.action || undefined,
  module: filterForm.module || undefined,
  result: filterForm.result || undefined,
  dateRange: filterForm.dateRange || undefined,
}))

// 获取审计日志列表
const { data: auditData, isLoading, refetch } = useAuditLogs(queryParams)

// 导出审计日志
const { mutateAsync: exportLogs, isPending: isExporting } = useExportAuditLogs()

// 详情对话框
const detailDialogVisible = ref(false)
const selectedLogId = ref('')
const { data: logDetail } = useAuditLogDetail(selectedLogId)

// 操作动作选项
const actionOptions = [
  { label: '登录', value: 'auth.login' },
  { label: '发起审批', value: 'approval.submit' },
  { label: '处理审批', value: 'approval.process' },
  { label: '代理启用', value: 'approval.delegate.enable' },
  { label: '代理关闭', value: 'approval.delegate.disable' },
  { label: '流程发布', value: 'workflow.publish' },
  { label: '流程回滚', value: 'workflow.rollback' },
  { label: 'AI 建议生成', value: 'ai.suggestion.generated' },
  { label: 'AI 建议采纳', value: 'ai.suggestion.accepted' },
  { label: 'AI 建议覆盖', value: 'ai.suggestion.overridden' },
]

// 模块选项
const moduleOptions = [
  { label: '审批', value: 'approval' },
  { label: '工作流', value: 'workflow' },
  { label: '认证', value: 'auth' },
  { label: '系统', value: 'system' },
  { label: 'AI', value: 'ai' },
]

// 结果选项
const resultOptions = [
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
]

// 搜索
function handleSearch() {
  pagination.page = 1
  refetch()
}

// 重置
function handleReset() {
  filterForm.operatorName = ''
  filterForm.action = ''
  filterForm.module = ''
  filterForm.result = ''
  filterForm.dateRange = null
  pagination.page = 1
  refetch()
}

// 查看详情
function handleViewDetail(log: AuditEvent) {
  selectedLogId.value = log.id
  detailDialogVisible.value = true
}

// 导出
async function handleExport() {
  try {
    await exportLogs({
      operatorName: filterForm.operatorName || undefined,
      action: filterForm.action || undefined,
      module: filterForm.module || undefined,
      result: filterForm.result || undefined,
      dateRange: filterForm.dateRange || undefined,
    })
    ElMessage.success('导出成功')
  }
  catch (error) {
    ElMessage.error('导出失败')
  }
}

// 分页变化
function handlePageChange(page: number) {
  pagination.page = page
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
}

// 格式化
function formatAction(action: AuditAction): string {
  const map: Record<string, string> = {
    'auth.login': '登录',
    'approval.submit': '发起审批',
    'approval.process': '处理审批',
    'approval.delegate.enable': '代理启用',
    'approval.delegate.disable': '代理关闭',
    'workflow.publish': '流程发布',
    'workflow.rollback': '流程回滚',
    'ai.suggestion.generated': 'AI 建议生成',
    'ai.suggestion.accepted': '采纳 AI 建议',
    'ai.suggestion.overridden': '覆盖 AI 建议',
  }
  return map[action] || action
}

function formatModule(module: string): string {
  const map: Record<string, string> = {
    approval: '审批',
    workflow: '工作流',
    auth: '认证',
    system: '系统',
    ai: 'AI',
  }
  return map[module] || module
}

function getActionTagType(action: AuditAction): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  if (action === 'auth.login') return 'info'
  if (action.startsWith('approval')) return 'primary'
  if (action.startsWith('workflow')) return 'success'
  if (action === 'ai.suggestion.generated') return 'primary'
  if (action === 'ai.suggestion.accepted') return 'success'
  if (action === 'ai.suggestion.overridden') return 'warning'
  return 'info'
}

// 跳转关联对象
function navigateToTarget(link: { targetType: string, targetId: string, path?: string }) {
  if (link.path) {
    router.push(link.path)
  }
  else if (link.targetType === 'approval') {
    router.push(`/approval/detail/${link.targetId}`)
  }
  else if (link.targetType === 'workflow') {
    router.push(`/workflow/editor/${link.targetId}`)
  }
  else if (link.targetType === 'ai') {
    router.push('/system/ai-audit')
  }
}
</script>

<template>
  <div class="audit-logs-page">
    <!-- 筛选区域 -->
    <el-card class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">审计日志</h2>
          <el-button type="primary" :loading="isExporting" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出 CSV
          </el-button>
        </div>
      </template>

      <el-form :model="filterForm" inline>
        <el-form-item label="操作人">
          <el-input
            v-model="filterForm.operatorName"
            placeholder="输入操作人"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="操作动作">
          <el-select
            v-model="filterForm.action"
            placeholder="选择动作"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="item in actionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模块">
          <el-select
            v-model="filterForm.module"
            placeholder="选择模块"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="item in moduleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="结果">
          <el-select
            v-model="filterForm.result"
            placeholder="选择结果"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="item in resultOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 340px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card>
      <el-table
        v-loading="isLoading"
        :data="auditData?.list || []"
        style="width: 100%"
      >
        <el-table-column prop="operatorName" label="操作人" width="120" />
        <el-table-column prop="module" label="模块" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ formatModule(row.module) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作" width="110">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" size="small">
              {{ formatAction(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" min-width="200" show-overflow-tooltip />
        <el-table-column prop="result" label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="traceId" label="TraceId" width="120" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column prop="durationMs" label="耗时" width="80">
          <template #default="{ row }">
            {{ row.durationMs ? `${row.durationMs}ms` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="operatedAt" label="时间" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="View"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="auditData?.total || 0"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="审计日志详情"
      width="850px"
    >
      <div v-if="logDetail" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="审计ID">
            {{ logDetail.id }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ logDetail.operatorName }}
          </el-descriptions-item>
          <el-descriptions-item label="模块">
            {{ formatModule(logDetail.module) }}
          </el-descriptions-item>
          <el-descriptions-item label="动作">
            <el-tag :type="getActionTagType(logDetail.action)" size="small">
              {{ formatAction(logDetail.action) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="结果">
            <el-tag :type="logDetail.result === 'success' ? 'success' : 'danger'" size="small">
              {{ logDetail.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ logDetail.durationMs ? `${logDetail.durationMs}ms` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="操作时间" :span="2">
            {{ logDetail.operatedAt }}
          </el-descriptions-item>
          <el-descriptions-item label="摘要" :span="2">
            {{ logDetail.summary }}
          </el-descriptions-item>
          <el-descriptions-item label="TraceId" :span="2">
            {{ logDetail.traceId }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ logDetail.ip }}
          </el-descriptions-item>
          <el-descriptions-item label="User Agent">
            <span class="text-xs">{{ logDetail.userAgent }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="目标类型">
            {{ logDetail.targetType }}
          </el-descriptions-item>
          <el-descriptions-item label="目标ID">
            {{ logDetail.targetId }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 关联对象 -->
        <div v-if="logDetail.links?.length" class="mt-4">
          <div class="text-sm font-medium mb-2">关联对象：</div>
          <div class="flex flex-wrap gap-2">
            <el-button
              v-for="link in logDetail.links"
              :key="link.targetId"
              size="small"
              type="primary"
              link
              @click="navigateToTarget(link)"
            >
              {{ link.title || link.targetId }}
            </el-button>
          </div>
        </div>

        <!-- 操作前数据 -->
        <div v-if="logDetail.before" class="mt-4">
          <div class="text-sm font-medium mb-2">操作前数据：</div>
          <el-input
            :model-value="JSON.stringify(logDetail.before, null, 2)"
            type="textarea"
            :rows="5"
            readonly
          />
        </div>

        <!-- 操作后数据 -->
        <div v-if="logDetail.after" class="mt-4">
          <div class="text-sm font-medium mb-2">操作后数据：</div>
          <el-input
            :model-value="JSON.stringify(logDetail.after, null, 2)"
            type="textarea"
            :rows="5"
            readonly
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.audit-logs-page {
  padding: 20px;
}

.log-detail {
  max-height: 600px;
  overflow-y: auto;
}
</style>