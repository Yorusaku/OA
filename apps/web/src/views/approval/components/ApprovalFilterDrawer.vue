<script setup lang="ts">
import type { ApprovalTodoFilters } from '../composables/useApprovalTodo'
import { computed, reactive } from 'vue'
import { useAppStore } from '@/stores/app'

interface Props {
  filters: ApprovalTodoFilters
}

interface Emits {
  (e: 'update:filters', filters: ApprovalTodoFilters): void
  (e: 'search'): void
  (e: 'reset'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const appStore = useAppStore()

// 本地筛选状态
const localFilters = reactive<ApprovalTodoFilters>({
  keyword: props.filters.keyword,
  status: props.filters.status,
  type: props.filters.type,
  dateRange: props.filters.dateRange,
})

// 抽屉打开状态
const drawerOpen = computed({
  get: () => appStore.mobileFilterOpen,
  set: (value) => {
    if (!value)
      appStore.closeMobileFilter()
  },
})

// 状态选项
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已转交', value: 'transferred' },
  { label: '已撤回', value: 'withdrawn' },
  { label: '已取消', value: 'cancelled' },
]

// 类型选项
const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '请假', value: 'leave' },
  { label: '报销', value: 'expense' },
  { label: '采购', value: 'purchase' },
]

// 确定筛选
function handleConfirm() {
  emit('update:filters', { ...localFilters })
  emit('search')
  appStore.closeMobileFilter()
}

// 重置筛选
function handleReset() {
  localFilters.keyword = ''
  localFilters.status = ''
  localFilters.type = ''
  localFilters.dateRange = null
  emit('reset')
  appStore.closeMobileFilter()
}

// 快捷日期选择
function selectDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  localFilters.dateRange = [start, end]
}
</script>

<template>
  <el-drawer
    v-model="drawerOpen"
    direction="rtl"
    :size="320"
    title="筛选条件"
  >
    <div class="flex flex-col h-full">
      <!-- 筛选表单 -->
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        <!-- 关键词搜索 -->
        <div class="mb-6">
          <div class="text-sm font-medium text-gray-700 mb-2">
            关键词
          </div>
          <el-input
            v-model="localFilters.keyword"
            placeholder="搜索标题、申请人"
            clearable
          />
        </div>

        <!-- 状态筛选 -->
        <div class="mb-6">
          <div class="text-sm font-medium text-gray-700 mb-2">
            审批状态
          </div>
          <el-radio-group v-model="localFilters.status" class="flex flex-col gap-2">
            <el-radio
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.value"
              class="mr-0"
            >
              {{ option.label }}
            </el-radio>
          </el-radio-group>
        </div>

        <!-- 类型筛选 -->
        <div class="mb-6">
          <div class="text-sm font-medium text-gray-700 mb-2">
            审批类型
          </div>
          <el-radio-group v-model="localFilters.type" class="flex flex-col gap-2">
            <el-radio
              v-for="option in typeOptions"
              :key="option.value"
              :label="option.value"
              class="mr-0"
            >
              {{ option.label }}
            </el-radio>
          </el-radio-group>
        </div>

        <!-- 日期范围 -->
        <div class="mb-6">
          <div class="text-sm font-medium text-gray-700 mb-2">
            申请时间
          </div>
          <el-date-picker
            v-model="localFilters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="w-full"
            size="default"
          />
          <div class="flex gap-2 mt-2">
            <el-button size="small" @click="selectDateRange(7)">
              最近7天
            </el-button>
            <el-button size="small" @click="selectDateRange(30)">
              最近30天
            </el-button>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="border-t border-gray-200 p-4 flex gap-3">
        <el-button class="flex-1" @click="handleReset">
          重置
        </el-button>
        <el-button type="primary" class="flex-1" @click="handleConfirm">
          确定
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
:deep(.el-radio) {
  height: auto;
  white-space: normal;
}

:deep(.el-radio__label) {
  padding-left: 8px;
}
</style>
