<template>
  <div class="login-logs-container">
    <!-- 头部 -->
    <div class="logs-header">
      <h2>登录日志</h2>
    </div>

    <!-- 筛选栏 -->
    <div class="logs-filters">
      <el-form :inline="true" :model="filters">
        <el-form-item label="用户名">
          <el-input
            v-model="filters.username"
            placeholder="请输入用户名"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择状态"
            clearable
            @change="handleSearch"
          >
            <el-option label="全部" value="" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>

        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleSearch"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            查询
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
          <el-button @click="handleExport">
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 日志列表 -->
    <div v-loading="isLoading" class="logs-table">
      <el-table :data="logs" stripe border>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="location" label="登录地点" width="120" />
        <el-table-column prop="device" label="设备" width="100" />
        <el-table-column prop="os" label="操作系统" width="100" />
        <el-table-column prop="browser" label="浏览器" width="100" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failReason" label="失败原因" width="120">
          <template #default="{ row }">
            {{ row.failReason || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="loginTime" label="登录时间" width="160" />
        <el-table-column prop="logoutTime" label="登出时间" width="160">
          <template #default="{ row }">
            {{ row.logoutTime || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="在线时长" width="120">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="logs-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="登录日志详情"
      width="600px"
    >
      <div v-if="currentLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户名">
            {{ currentLog.username }}
          </el-descriptions-item>
          <el-descriptions-item label="用户ID">
            {{ currentLog.userId }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ currentLog.ipAddress }}
          </el-descriptions-item>
          <el-descriptions-item label="登录地点">
            {{ currentLog.location || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="设备类型">
            {{ currentLog.device }}
          </el-descriptions-item>
          <el-descriptions-item label="操作系统">
            {{ currentLog.os }}
          </el-descriptions-item>
          <el-descriptions-item label="浏览器">
            {{ currentLog.browser }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentLog.status === 'success' ? 'success' : 'danger'">
              {{ currentLog.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentLog.failReason" label="失败原因" :span="2">
            {{ currentLog.failReason }}
          </el-descriptions-item>
          <el-descriptions-item label="登录时间" :span="2">
            {{ currentLog.loginTime }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentLog.logoutTime" label="登出时间" :span="2">
            {{ currentLog.logoutTime }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentLog.duration" label="在线时长" :span="2">
            {{ formatDuration(currentLog.duration) }}
          </el-descriptions-item>
          <el-descriptions-item label="User Agent" :span="2">
            <div class="user-agent">
              {{ currentLog.userAgent }}
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { LoginLog, LoginStatus } from '@/api/types'
import { useExportLoginLogs, useLoginLogs } from '@/composables/useLoginLog'

// 状态
const currentPage = ref(1)
const pageSize = ref(20)
const dialogVisible = ref(false)
const currentLog = ref<LoginLog | null>(null)

// 筛选条件
const filters = reactive<{
  username: string
  status: LoginStatus | ''
  dateRange: [Date, Date] | null
}>({
  username: '',
  status: '',
  dateRange: null,
})

// 查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  username: filters.username || undefined,
  status: filters.status || undefined,
  dateRange: filters.dateRange || undefined,
}))

// 数据查询
const { data, isLoading } = useLoginLogs(queryParams)
const logs = computed(() => data.value?.list || [])
const total = computed(() => data.value?.total || 0)

// 导出
const { mutateAsync: exportLogs, isPending: isExporting } = useExportLoginLogs()

// 查询
function handleSearch() {
  currentPage.value = 1
}

// 重置
function handleReset() {
  filters.username = ''
  filters.status = ''
  filters.dateRange = null
  currentPage.value = 1
}

// 分页变化
function handlePageChange() {
  // 页码变化时自动刷新
}

function handleSizeChange() {
  currentPage.value = 1
}

// 查看详情
function handleViewDetail(log: LoginLog) {
  currentLog.value = log
  dialogVisible.value = true
}

// 导出
async function handleExport() {
  try {
    const blob = await exportLogs({
      username: filters.username || undefined,
      status: filters.status || undefined,
      dateRange: filters.dateRange || undefined,
    })

    // 下载文件
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `登录日志_${new Date().getTime()}.csv`
    link.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  }
  catch (error) {
    ElMessage.error('导出失败')
  }
}

// 格式化时长
function formatDuration(seconds?: number): string {
  if (!seconds)
    return '-'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0)
    return `${hours}小时${minutes}分钟`
  if (minutes > 0)
    return `${minutes}分钟${secs}秒`
  return `${secs}秒`
}
</script>

<style scoped>
.login-logs-container {
  padding: 20px;
  background: #fff;
  min-height: calc(100vh - 120px);
}

.logs-header {
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 20px;
    color: #303133;
  }
}

.logs-filters {
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.logs-table {
  margin-bottom: 20px;
}

.logs-pagination {
  display: flex;
  justify-content: center;
}

.log-detail {
  .user-agent {
    word-break: break-all;
    font-size: 12px;
    color: #606266;
  }
}
</style>
