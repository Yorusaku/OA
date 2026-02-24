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
  <div class="org-tree">
    <ElCard>
      <template #header>
        <div class="card-header">
          <h2>组织架构</h2>
        </div>
      </template>

      <div class="org-layout">
        <!-- 左侧部门树 -->
        <div class="dept-tree">
          <h4 class="tree-title">
            部门列表
          </h4>
          <ElTree
            v-loading="treeLoading"
            :data="deptTree || []"
            :props="treeProps"
            highlight-current
            @node-click="handleNodeClick"
          />
        </div>

        <!-- 右侧成员列表 -->
        <div class="member-list">
          <div class="list-header">
            <h4>{{ selectedDeptName }}</h4>
            <ElInput
              v-model="searchKeyword"
              placeholder="搜索成员"
              clearable
              style="width: 200px"
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
.org-tree {
  padding: 20px;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.org-layout {
  display: flex;
  gap: 20px;
  min-height: 500px;
}

.dept-tree {
  width: 250px;
  border-right: 1px solid #ebeef5;
  padding-right: 20px;
}

.tree-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.member-list {
  flex: 1;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.list-header h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}
</style>
