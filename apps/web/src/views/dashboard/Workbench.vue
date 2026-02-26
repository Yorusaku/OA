<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useApprovalList, useWorkbenchStats } from '@/composables/useApproval'

const router = useRouter()

const { data: stats, isLoading: statsLoading, error: statsError } = useWorkbenchStats()
const {
  data: approvalList,
  isLoading: listLoading,
  error: listError,
} = useApprovalList({ page: 1, pageSize: 10, status: 'pending' })

// 跳转到待办审批页面
function goToApprovalTodo() {
  router.push('/approval/todo')
}

// 跳转到审批详情页（而不是弹窗）
function goToApprovalDetail(item: any) {
  router.push(`/approval/detail/${item.id}`)
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold">
      工作台
    </h2>

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card class="h-full">
          <div class="text-sm text-slate-500 mb-2">
            待办数量
          </div>
          <div v-if="statsLoading" class="text-2xl font-semibold text-slate-400">
            加载中...
          </div>
          <div v-else-if="statsError" class="text-2xl font-semibold text-red-500">
            加载失败
          </div>
          <div v-else class="text-2xl font-semibold text-blue-600">
            {{ stats?.pendingCount || 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="h-full">
          <div class="text-sm text-slate-500 mb-2">
            我的申请
          </div>
          <div v-if="statsLoading" class="text-2xl font-semibold text-slate-400">
            加载中...
          </div>
          <div v-else-if="statsError" class="text-2xl font-semibold text-red-500">
            加载失败
          </div>
          <div v-else class="text-2xl font-semibold text-green-600">
            {{ stats?.myApplicationCount || 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="h-full">
          <div class="text-sm text-slate-500 mb-2">
            已通过
          </div>
          <div v-if="statsLoading" class="text-2xl font-semibold text-slate-400">
            加载中...
          </div>
          <div v-else-if="statsError" class="text-2xl font-semibold text-red-500">
            加载失败
          </div>
          <div v-else class="text-2xl font-semibold text-emerald-600">
            {{ stats?.approvedCount || 0 }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="h-full">
          <div class="text-sm text-slate-500 mb-2">
            已拒绝
          </div>
          <div v-if="statsLoading" class="text-2xl font-semibold text-slate-400">
            加载中...
          </div>
          <div v-else-if="statsError" class="text-2xl font-semibold text-red-500">
            加载失败
          </div>
          <div v-else class="text-2xl font-semibold text-red-600">
            {{ stats?.rejectedCount || 0 }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="flex justify-between items-center">
              <span>待办审批</span>
              <el-button type="primary" size="small" @click="goToApprovalTodo">
                查看更多
              </el-button>
            </div>
          </template>
          <div v-if="listLoading" class="text-center py-8 text-slate-500">
            加载中...
          </div>
          <div v-else-if="listError" class="text-center py-8 text-red-500">
            加载失败
          </div>
          <div v-else-if="!approvalList?.list?.length" class="text-center py-8 text-slate-500">
            暂无数据
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="item in approvalList.list"
              :key="item.id"
              class="border rounded-lg p-3 hover:bg-slate-50 cursor-pointer"
              @click="goToApprovalDetail(item)"
            >
              <div class="flex justify-between items-start">
                <div class="font-medium">
                  {{ item.title }}
                </div>
                <el-tag
                  :type="
                    item.status === 'pending'
                      ? 'warning'
                      : item.status === 'approved'
                        ? 'success'
                        : 'danger'
                  "
                  size="small"
                >
                  {{
                    item.status === 'pending'
                      ? '待审批'
                      : item.status === 'approved'
                        ? '已通过'
                        : '已拒绝'
                  }}
                </el-tag>
              </div>
              <div class="text-sm text-slate-500 mt-1">
                <span>申请人: {{ item.applicant }}</span>
                <span class="ml-4">时间: {{ item.applyTime }}</span>
                <span v-if="item.amount" class="ml-4">金额: ¥{{ item.amount }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
