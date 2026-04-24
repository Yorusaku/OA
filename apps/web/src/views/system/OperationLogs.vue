<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Search, View } from '@element-plus/icons-vue'
import { useOperationLogDetail, useOperationLogs, useExportOperationLogs } from '@/composables/useOperationLog'
import type { OperationLog, OperationModule, OperationType } from '@/api/types'

// 筛选表单
const filterForm = reactive({
  operatorName: '',
  operationType: '' as OperationType | '',
  module: '' as OperationModule | '',
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
  operationType: filterForm.operationType || undefined,
  module: filterForm.module || undefined,
  dateRange: filterForm.dateRange || undefined,
}))

// 获取操作日志列表
const { data: logsData, isLoading, refetch } = useOperationLogs(queryParams)

// 导出操作日志
const { mutateAsync: exportLogs, isPending: isExporting } = useExportOperationLogs()

// 详情对话框
const detailDialogVisible = ref(false)
const selectedLogId = ref('')
const { data: logDetail } = useOperationLogDetail(selectedLogId)

// 操作类型选项
const operationTypeOptions = [
  { label: '创建', value: 'create' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '审批', value: 'approve' },
  { label: '驳回', value: 'reject' },
  { label: '转交', value: 'transfer' },
  { label: '其他', value: 'other' },
]

// 模块选项
const moduleOptions = [
  { label: '审批', value: 'approval' },
  { label: '用户', value: 'user' },
  { label: '角色', value: 'role' },
  { label: '工作流', value: 'workflow' },
  { label: '系统', value: 'system' },
]

// 搜索
function handleSearch() {
  pagination.page = 1
  refetch()
}

// 重置
function handleReset() {
  filterForm.operatorName = ''
  filterForm.operationType = ''
  filterForm.module = ''
  filterForm.dateRange = null
  pagination.page = 1
  refetch()
}

// 查看详情
function handleViewDetail(log: OperationLog) {
  selectedLogId.value = log.id
  detailDialogVisible.value = true
}

// 导出
async function handleExport() {
  try {
    await exportLogs({
      operatorName: filterForm.operatorName || undefined,
      operationType: filterForm.operationType || undefined,
      module: filterForm.module || undefined,
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

// 格式化操作类型
function formatOperationType(type: OperationType): string {
  const map: Record<OperationType, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    approve: '审批',
    reject: '驳回',
    transfer: '转交',
    other: '其他',
  }
  return map[type] || type
}

// 格式化模块
function formatModule(module: OperationModule): string {
  const map: Record<OperationModule, string> = {
    approval: '审批',
    user: '用户',
    role: '角色',
    workflow: '工作流',
    system: '系统',
  }
  return map[module] || module
}

// 格式化状态
function formatStatus(status: 'success' | 'failed'): string {
  return status === 'success' ? '成功' : '失败'
}

// 状态标签类型
function getStatusType(status: 'success' | 'failed'): 'success' | 'danger' {
  return status === 'success' ? 'success' : 'danger'
}
</script>

<template>
  <div class="operation-logs-page">
    <!-- 筛选区域 -->
    <el-card class="mb-4">
      <el-form :model="filterForm" inline>
        <el-form-item label="操作人">
          <el-input
            v-model="filterForm.operatorName"
            placeholder="请输入操作人"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select
            v-model="filterForm.operationType"
            placeholder="请选择操作类型"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in operationTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作模块">
          <el-select
            v-model="filterForm.module"
            placeholder="请选择操作模块"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in moduleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作时间">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
          <el-button
            :icon="Download"
            :loading="isExporting"
            @click="handleExport"
          >
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区域 -->
    <el-card>
      <el-table
        v-loading="isLoading"
        :data="logsData?.list || []"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="operatorName" label="操作人" width="120" />
        <el-table-column label="操作类型" width="100">
          <template #default="{ row }">
            {{ formatOperationType(row.operationType) }}
          </template>
        </el-table-column>
        <el-table-column label="操作模块" width="100">
          <template #default="{ row }">
            {{ formatModule(row.module) }}
          </template>
        </el-table-column>
        <el-table-column prop="operationContent" label="操作内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="operatedAt" label="操作时间" width="180" />
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ row.duration ? `${row.duration}ms` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
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
          :total="logsData?.total || 0"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="操作日志详情"
      width="800px"
    >
      <div v-if="logDetail" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作人">
            {{ logDetail.operatorName }}
          </el-descriptions-item>
          <el-descriptions-item label="操作类型">
            {{ formatOperationType(logDetail.operationType) }}
          </el-descriptions-item>
          <el-descriptions-item label="操作模块">
            {{ formatModule(logDetail.module) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(logDetail.status)" size="small">
              {{ formatStatus(logDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作内容" :span="2">
            {{ logDetail.operationContent }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ logDetail.ipAddress || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">
            {{ logDetail.operatedAt }}
          </el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ logDetail.duration ? `${logDetail.duration}ms` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="目标类型">
            {{ logDetail.targetType || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="目标ID" :span="2">
            {{ logDetail.targetId || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 错误信息 -->
        <div v-if="logDetail.errorMessage" class="mt-4">
          <div class="text-sm font-medium mb-2">
            错误信息：
          </div>
          <el-alert type="error" :closable="false">
            {{ logDetail.errorMessage }}
          </el-alert>
        </div>

        <!-- 请求参数 -->
        <div v-if="logDetail.requestParams" class="mt-4">
          <div class="text-sm font-medium mb-2">
            请求参数：
          </div>
          <el-input
            :model-value="JSON.stringify(logDetail.requestParams, null, 2)"
            type="textarea"
            :rows="6"
            readonly
          />
        </div>

        <!-- 操作前数据 -->
        <div v-if="logDetail.beforeData" class="mt-4">
          <div class="text-sm font-medium mb-2">
            操作前数据：
          </div>
          <el-input
            :model-value="JSON.stringify(logDetail.beforeData, null, 2)"
            type="textarea"
            :rows="6"
            readonly
          />
        </div>

        <!-- 操作后数据 -->
        <div v-if="logDetail.afterData" class="mt-4">
          <div class="text-sm font-medium mb-2">
            操作后数据：
          </div>
          <el-input
            :model-value="JSON.stringify(logDetail.afterData, null, 2)"
            type="textarea"
            :rows="6"
            readonly
          />
        </div>

        <!-- User Agent -->
        <div v-if="logDetail.userAgent" class="mt-4">
          <div class="text-sm font-medium mb-2">
            User Agent：
          </div>
          <el-input
            :model-value="logDetail.userAgent"
            type="textarea"
            :rows="2"
            readonly
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.operation-logs-page {
  padding: 20px;
}

.log-detail {
  max-height: 600px;
  overflow-y: auto;
}
</style>
