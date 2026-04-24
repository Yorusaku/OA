<script setup lang="ts">
/**
 * 我的申请 - 查看我发起的审批单
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDevice } from '@/composables/useDevice'
import { useApprovalList } from '@/composables/useApproval'

const router = useRouter()
const { isMobile } = useDevice()

const searchForm = ref({
  keyword: '',
  status: '',
  dateRange: null as [Date, Date] | null,
})

const pagination = ref({
  page: 1,
  pageSize: 10,
})

const queryParams = computed(() => ({
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  keyword: searchForm.value.keyword || undefined,
  status: searchForm.value.status || undefined,
  dateRange: searchForm.value.dateRange,
}))

const { data, isLoading } = useApprovalList(queryParams)

const statusMap: Record<string, { text: string, type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  pending: { text: '审批中', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
  withdrawn: { text: '已撤回', type: 'info' },
  transferred: { text: '已转交', type: 'primary' },
}

watch(
  () => [searchForm.value.keyword, searchForm.value.status, searchForm.value.dateRange],
  () => {
    pagination.value.page = 1
  },
)

function goDetail(row: { id: string }) {
  router.push(`/approval/detail/${row.id}`)
}

function clearFilters() {
  searchForm.value.keyword = ''
  searchForm.value.status = ''
  searchForm.value.dateRange = null
}
</script>

<template>
  <div :class="isMobile ? 'h-full' : 'p-6'">
    <ElCard v-if="!isMobile">
      <template #header>
        <h2 class="text-lg font-semibold text-gray-800">我的申请</h2>
      </template>

      <div class="mb-4 flex items-center gap-4 flex-wrap">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索申请标题"
          clearable
          class="w-60"
        />
        <ElSelect
          v-model="searchForm.status"
          placeholder="审批状态"
          clearable
          class="w-40"
        >
          <ElOption label="审批中" value="pending" />
          <ElOption label="已通过" value="approved" />
          <ElOption label="已驳回" value="rejected" />
          <ElOption label="已转交" value="transferred" />
          <ElOption label="已撤回" value="withdrawn" />
          <ElOption label="已取消" value="cancelled" />
        </ElSelect>
        <ElDatePicker
          v-model="searchForm.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="w-72"
        />
        <ElButton link type="primary" @click="clearFilters">清除筛选</ElButton>
      </div>

      <ElTable
        v-loading="isLoading"
        :data="data?.list || []"
        style="width: 100%"
      >
        <ElTableColumn prop="title" label="标题" min-width="220" />
        <ElTableColumn prop="type" label="类型" width="100">
          <template #default="{ row }">
            <ElTag v-if="row.type === 'leave'" type="success">请假</ElTag>
            <ElTag v-else-if="row.type === 'expense'" type="warning">报销</ElTag>
            <ElTag v-else-if="row.type === 'purchase'" type="primary">采购</ElTag>
            <ElTag v-else>其他</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="120">
          <template #default="{ row }">
            <ElTag :type="statusMap[row.status]?.type || 'info'">
              {{ statusMap[row.status]?.text || row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="applicant" label="申请人" width="100" />
        <ElTableColumn prop="applyTime" label="申请时间" width="180" />
        <ElTableColumn label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="goDetail(row)">查看详情</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <ElPagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="data?.total || 0"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="mt-4 flex justify-end"
      />
    </ElCard>

    <!-- 移动端布局 -->
    <div v-else class="h-full flex flex-col bg-gray-50">
      <!-- 顶部工具栏 -->
      <div class="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <h2 class="text-lg font-semibold text-gray-800 mb-2">
          我的申请
        </h2>
        <div class="text-sm text-gray-500">
          共 {{ data?.total || 0 }} 条申请
        </div>
      </div>

      <!-- 列表 -->
      <div class="flex-1 overflow-y-auto p-3">
        <div v-if="isLoading" class="space-y-3">
          <el-skeleton v-for="i in 5" :key="i" :rows="3" animated />
        </div>

        <div v-else-if="!data?.list?.length" class="text-center py-12">
          <el-empty description="暂无申请记录" />
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="record in data.list"
            :key="record.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            @click="goDetail(record)"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0 mr-3">
                <h3 class="text-base font-semibold text-gray-800 truncate mb-1">
                  {{ record.title }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <el-tag v-if="record.type === 'leave'" type="success" size="small">请假</el-tag>
                  <el-tag v-else-if="record.type === 'expense'" type="warning" size="small">报销</el-tag>
                  <el-tag v-else-if="record.type === 'purchase'" type="primary" size="small">采购</el-tag>
                  <el-tag v-else size="small">其他</el-tag>
                </div>
              </div>
              <el-tag :type="statusMap[record.status]?.type || 'info'" size="small">
                {{ statusMap[record.status]?.text || record.status }}
              </el-tag>
            </div>

            <div class="flex items-center justify-between text-sm text-gray-600">
              <span>{{ record.applicant }}</span>
              <span class="text-xs text-gray-500">{{ record.applyTime }}</span>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="data.total > pagination.pageSize" class="text-center py-4">
            <el-button
              v-if="pagination.page * pagination.pageSize < data.total"
              size="small"
              @click="pagination.page++"
            >
              加载更多
            </el-button>
            <div v-else class="text-sm text-gray-400">
              没有更多了
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
