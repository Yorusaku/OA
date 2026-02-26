<script setup lang="ts">
import {
  ElAvatar,
  ElCard,
  ElInput,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTree,
} from 'element-plus'
/**
 * 组织架构 - 部门树与成员列表
 */
import { computed, ref } from 'vue'
import { useDeptList, useDeptTree } from '@/composables/useDept'

// ==================== 搜索 ====================
const searchKeyword = ref('')

// ==================== Vue Query ====================
const { data: deptTree, isLoading: treeLoading } = useDeptTree()
const { data: deptList } = useDeptList()

// ==================== 选中的部门 ====================
const selectedDeptId = ref('')

const selectedDeptName = computed(() => {
  if (!selectedDeptId.value)
    return '全部部门'
  const dept = deptList.value?.find(d => d.id === selectedDeptId.value)
  return dept?.name || '全部部门'
})

// ==================== 模拟用户数据 ====================
const mockUsers = [
  { id: '1', name: '张三', avatar: '', dept: 'tech', position: '前端工程师', status: 'active' },
  { id: '2', name: '李四', avatar: '', dept: 'tech', position: '后端工程师', status: 'active' },
  { id: '3', name: '王五', avatar: '', dept: 'product', position: '产品经理', status: 'active' },
  { id: '4', name: '赵六', avatar: '', dept: 'hr', position: 'HRBP', status: 'active' },
  { id: '5', name: '钱七', avatar: '', dept: 'finance', position: '财务经理', status: 'active' },
]

const filteredUsers = computed(() => {
  let users = mockUsers
  if (selectedDeptId.value) {
    users = users.filter(u => u.dept === selectedDeptId.value)
  }
  if (searchKeyword.value) {
    users = users.filter(u => u.name.includes(searchKeyword.value))
  }
  return users
})

// ==================== Tree 配置 ====================
const treeProps = {
  children: 'children',
  label: 'name',
  value: 'id',
}

function handleNodeClick(data: any) {
  selectedDeptId.value = data.id
}
</script>

<template>
  <div class="p-6">
    <ElCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-800">组织架构</h2>
      </template>

      <div class="flex gap-5 min-h-[500px]">
        <!-- 左侧部门树 -->
        <div class="w-64 border-r border-gray-200 pr-5">
          <h4 class="text-sm font-semibold text-gray-700 mb-4">部门列表</h4>
          <ElTree
            v-loading="treeLoading"
            :data="deptTree || []"
            :props="treeProps"
            highlight-current
            @node-click="handleNodeClick"
          />
        </div>

        <!-- 右侧成员列表 -->
        <div class="flex-1 overflow-hidden">
          <div class="mb-4 flex justify-between items-center">
            <h4 class="text-base font-semibold text-gray-800">{{ selectedDeptName }}</h4>
            <ElInput
              v-model="searchKeyword"
              placeholder="搜索成员"
              clearable
              class="w-52"
            />
          </div>

          <ElTable
            :data="filteredUsers"
            style="width: 100%"
          >
            <ElTableColumn label="头像" width="80">
              <template #default="{ row }">
                <ElAvatar :size="40">
                  {{ row.name.charAt(0) }}
                </ElAvatar>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="name" label="姓名" width="120" />
            <ElTableColumn prop="position" label="职位" min-width="150" />
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
    </ElCard>
  </div>
</template>

<style scoped>
</style>
