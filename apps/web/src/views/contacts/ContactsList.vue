<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'
import {
  ElAvatar,
  ElCard,
  ElInput,
  ElOption,
  ElSelect,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
/**
 * 通讯录 - 人员列表
 * 使用 VueUse useVirtualList 优化长列表渲染
 */
import { computed, ref } from 'vue'
import { useDeptList } from '@/composables/useDept'

// ==================== 搜索条件 ====================
const searchForm = ref({
  keyword: '',
  dept: '',
  status: '',
})

// ==================== 模拟用户数据（生成大量数据用于测试虚拟列表） ====================
function generateMockUsers() {
  const users = []
  const depts = ['tech', 'product', 'operation', 'hr', 'finance']
  const positions = ['工程师', '产品经理', '运营专员', 'HRBP', '财务专员']
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十']

  for (let i = 1; i <= 100; i++) {
    users.push({
      id: String(i),
      name: names[i % names.length] + (i > 8 ? `-${i}` : ''),
      dept: depts[i % depts.length],
      deptName: ['技术部', '产品部', '运营部', '人事部', '财务部'][i % 5],
      position: positions[i % positions.length],
      phone: `138${String(i).padStart(8, '0')}`,
      email: `user${i}@company.com`,
      status: i % 10 === 0 ? 'inactive' : 'active',
    })
  }
  return users
}

const allUsers = ref(generateMockUsers())

// ==================== 筛选后的数据 ====================
const filteredUsers = computed(() => {
  let users = allUsers.value
  if (searchForm.value.keyword) {
    users = users.filter(u =>
      u.name.includes(searchForm.value.keyword)
      || u.phone.includes(searchForm.value.keyword)
      || u.email.includes(searchForm.value.keyword),
    )
  }
  if (searchForm.value.dept) {
    users = users.filter(u => u.dept === searchForm.value.dept)
  }
  if (searchForm.value.status) {
    users = users.filter(u => u.status === searchForm.value.status)
  }
  return users
})

// ==================== 虚拟列表 ====================
// 使用 VueUse 的 useVirtualList 优化长列表渲染
const { list: virtualList, containerProps, wrapperProps, scrollTo } = useVirtualList(
  filteredUsers,
  {
    itemHeight: 80, // 每行高度
    overscan: 10, // 预加载 10 行
  },
)

// ==================== 部门数据 ====================
const { data: deptList } = useDeptList()

// ==================== 视图模式 ====================
const viewMode = ref('list') // 'list' or 'tree'
</script>

<template>
  <div class="p-6">
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">通讯录</h2>
          <ElSpace>
            <ElSelect
              v-model="viewMode"
              class="w-32"
            >
              <ElOption label="列表视图" value="list" />
              <ElOption label="树形视图" value="tree" />
            </ElSelect>
          </ElSpace>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="mb-4 flex items-center gap-4 flex-wrap">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="搜索姓名/手机号/邮箱"
          clearable
          class="w-60"
        />
        <ElSelect
          v-model="searchForm.dept"
          placeholder="选择部门"
          clearable
          class="w-40"
        >
          <ElOption
            v-for="dept in deptList"
            :key="dept.id"
            :label="dept.name"
            :value="dept.id"
          />
        </ElSelect>
        <ElSelect
          v-model="searchForm.status"
          placeholder="状态"
          clearable
          class="w-32"
        >
          <ElOption label="在职" value="active" />
          <ElOption label="离职" value="inactive" />
        </ElSelect>
      </div>

      <!-- 统计信息 -->
      <div class="mb-4 text-sm text-gray-500">
        共 {{ filteredUsers.length }} 人
        <span v-if="searchForm.keyword || searchForm.dept || searchForm.status" class="ml-2 text-gray-400">
          （已筛选）
        </span>
      </div>

      <!-- 列表视图 -->
      <div v-show="viewMode === 'list'" v-bind="containerProps" class="border border-gray-200 rounded overflow-hidden" style="height: 500px; overflow: auto">
        <div v-bind="wrapperProps">
          <ElTable
            :data="virtualList"
            style="width: 100%"
            :row-class-name="() => 'virtual-table-row'"
          >
            <ElTableColumn label="头像" width="100">
              <template #default="{ row }">
                <ElAvatar :size="40">
                  {{ row.name.charAt(0) }}
                </ElAvatar>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="name" label="姓名" width="120" />
            <ElTableColumn prop="deptName" label="部门" width="120" />
            <ElTableColumn prop="position" label="职位" min-width="150" />
            <ElTableColumn prop="phone" label="手机号" width="130" />
            <ElTableColumn prop="email" label="邮箱" min-width="180" />
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="row.status === 'active' ? 'success' : 'info'">
                  {{ row.status === 'active' ? '在职' : '离职' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </div>

      <!-- 树形视图 -->
      <div v-show="viewMode === 'tree'" class="min-h-[400px] p-4">
        <ElTree
          :data="deptList || []"
          :props="{ children: 'children', label: 'name' }"
        >
          <template #default="{ node, data }">
            <span class="flex items-center">
              <span>{{ node.label }}</span>
              <span v-if="data.userCount" class="text-sm text-gray-400 ml-2">
                ({{ data.userCount }}人)
              </span>
            </span>
          </template>
        </ElTree>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
:deep(.virtual-table-row) {
  height: 80px;
}
</style>
