<template>
  <div class="message-list-container">
    <!-- 头部操作栏 -->
    <div class="message-header">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="审批通知" name="approval" />
        <el-tab-pane label="系统通知" name="system" />
        <el-tab-pane label="抄送通知" name="cc" />
      </el-tabs>

      <div class="header-actions">
        <el-button
          :disabled="!hasUnread"
          @click="handleMarkAllAsRead"
        >
          全部已读
        </el-button>
        <el-button
          :disabled="selectedIds.length === 0"
          @click="handleBatchDelete"
        >
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="message-filters">
      <el-radio-group v-model="readFilter" @change="handleFilterChange">
        <el-radio-button label="all">
          全部
        </el-radio-button>
        <el-radio-button label="unread">
          未读
        </el-radio-button>
        <el-radio-button label="read">
          已读
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 消息列表 -->
    <div v-loading="isLoading" class="message-list">
      <el-empty v-if="!isLoading && messages.length === 0" description="暂无消息" />

      <div v-else class="message-items">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="{ 'is-unread': !message.read }"
          @click="handleMessageClick(message)"
        >
          <el-checkbox
            v-model="selectedIds"
            :value="message.id"
            class="message-checkbox"
            @click.stop
          />

          <div class="message-icon">
            <el-icon :size="24" :color="getIconColor(message.type)">
              <component :is="getIconComponent(message.type)" />
            </el-icon>
          </div>

          <div class="message-content">
            <div class="message-title">
              <span class="title-text">{{ message.title }}</span>
              <el-tag
                v-if="message.priority === 'high'"
                type="danger"
                size="small"
                effect="plain"
              >
                重要
              </el-tag>
            </div>
            <div class="message-text">
              {{ message.content }}
            </div>
            <div class="message-time">
              {{ message.createdAt }}
            </div>
          </div>

          <div class="message-actions">
            <el-button
              v-if="!message.read"
              link
              type="primary"
              @click.stop="handleMarkAsRead(message.id)"
            >
              标记已读
            </el-button>
            <el-button
              link
              type="danger"
              @click.stop="handleDelete(message.id)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="message-pagination">
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

    <!-- 消息详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="消息详情"
      size="500px"
      :before-close="handleDrawerClose"
    >
      <div v-if="currentMessage" class="message-detail">
        <div class="detail-header">
          <h3>{{ currentMessage.title }}</h3>
          <el-tag :type="getTypeTagType(currentMessage.type)">
            {{ getTypeLabel(currentMessage.type) }}
          </el-tag>
        </div>

        <div class="detail-content">
          <p>{{ currentMessage.content }}</p>
        </div>

        <div class="detail-meta">
          <div class="meta-item">
            <span class="meta-label">创建时间：</span>
            <span class="meta-value">{{ currentMessage.createdAt }}</span>
          </div>
          <div v-if="currentMessage.readTime" class="meta-item">
            <span class="meta-label">阅读时间：</span>
            <span class="meta-value">{{ currentMessage.readTime }}</span>
          </div>
          <div v-if="currentMessage.relatedId" class="meta-item">
            <span class="meta-label">关联ID：</span>
            <span class="meta-value">{{ currentMessage.relatedId }}</span>
          </div>
        </div>

        <div class="detail-actions">
          <el-button
            v-if="currentMessage.relatedId"
            type="primary"
            @click="handleViewRelated"
          >
            查看详情
          </el-button>
          <el-button @click="drawerVisible = false">
            关闭
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Document, InfoFilled, Notification } from '@element-plus/icons-vue'
import type { MessageRecord, MessageType } from '@/api/types'
import {
  useBatchDeleteMessages,
  useBatchMarkAsRead,
  useDeleteMessage,
  useMarkAllAsRead,
  useMarkMessageAsRead,
  useMessageList,
} from '@/composables/useMessage'

const router = useRouter()

// 状态
const activeTab = ref<MessageType | 'all'>('all')
const readFilter = ref<'all' | 'unread' | 'read'>('all')
const currentPage = ref(1)
const pageSize = ref(20)
const selectedIds = ref<string[]>([])
const drawerVisible = ref(false)
const currentMessage = ref<MessageRecord | null>(null)

// 查询参数
const queryParams = computed(() => ({
  page: currentPage.value,
  pageSize: pageSize.value,
  type: activeTab.value,
  read: readFilter.value === 'all' ? undefined : readFilter.value === 'read',
}))

// 数据查询
const { data, isLoading, refetch } = useMessageList(queryParams)
const messages = computed(() => data.value?.list || [])
const total = computed(() => data.value?.total || 0)
const hasUnread = computed(() => messages.value.some(m => !m.read))

// Mutations
const { mutateAsync: markAsRead } = useMarkMessageAsRead()
const { mutateAsync: batchMarkAsRead } = useBatchMarkAsRead()
const { mutateAsync: markAllAsRead } = useMarkAllAsRead()
const { mutateAsync: deleteMessage } = useDeleteMessage()
const { mutateAsync: batchDeleteMessages } = useBatchDeleteMessages()

// 标签页切换
function handleTabChange() {
  currentPage.value = 1
  selectedIds.value = []
}

// 筛选变化
function handleFilterChange() {
  currentPage.value = 1
  selectedIds.value = []
}

// 分页变化
function handlePageChange() {
  selectedIds.value = []
}

function handleSizeChange() {
  currentPage.value = 1
  selectedIds.value = []
}

// 标记已读
async function handleMarkAsRead(id: string) {
  try {
    await markAsRead(id)
    ElMessage.success('已标记为已读')
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

// 批量标记已读
async function handleBatchMarkAsRead() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要标记的消息')
    return
  }

  try {
    await batchMarkAsRead(selectedIds.value)
    ElMessage.success('批量标记成功')
    selectedIds.value = []
  }
  catch (error) {
    ElMessage.error('操作失败')
  }
}

// 全部标记已读
async function handleMarkAllAsRead() {
  try {
    await ElMessageBox.confirm('确定将所有未读消息标记为已读吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await markAllAsRead()
    ElMessage.success('全部标记成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 删除消息
async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm('确定删除这条消息吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteMessage(id)
    ElMessage.success('删除成功')
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除
async function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的消息')
    return
  }

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条消息吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await batchDeleteMessages(selectedIds.value)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
  }
  catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 点击消息
async function handleMessageClick(message: MessageRecord) {
  currentMessage.value = message
  drawerVisible.value = true

  // 如果未读，自动标记为已读
  if (!message.read) {
    await markAsRead(message.id)
  }
}

// 关闭抽屉
function handleDrawerClose() {
  drawerVisible.value = false
  currentMessage.value = null
}

// 查看关联详情
function handleViewRelated() {
  if (!currentMessage.value?.relatedId)
    return

  // 跳转到审批详情页
  router.push({
    name: 'ApprovalDetail',
    params: { id: currentMessage.value.relatedId },
  })
  drawerVisible.value = false
}

// 获取图标组件
function getIconComponent(type: MessageType) {
  const iconMap = {
    approval: Bell,
    system: Notification,
    cc: Document,
    other: InfoFilled,
  }
  return iconMap[type] || InfoFilled
}

// 获取图标颜色
function getIconColor(type: MessageType) {
  const colorMap = {
    approval: '#409eff',
    system: '#67c23a',
    cc: '#e6a23c',
    other: '#909399',
  }
  return colorMap[type] || '#909399'
}

// 获取类型标签类型
function getTypeTagType(type: MessageType) {
  const typeMap = {
    approval: 'primary',
    system: 'success',
    cc: 'warning',
    other: 'info',
  }
  return typeMap[type] || 'info'
}

// 获取类型标签文本
function getTypeLabel(type: MessageType) {
  const labelMap = {
    approval: '审批通知',
    system: '系统通知',
    cc: '抄送通知',
    other: '其他',
  }
  return labelMap[type] || '其他'
}
</script>

<style scoped >
.message-list-container {
  padding: 20px;
  background: #fff;
  min-height: calc(100vh - 120px);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .header-actions {
    display: flex;
    gap: 10px;
  }
}

.message-filters {
  margin-bottom: 20px;
}

.message-list {
  min-height: 400px;
}

.message-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #f5f7fa;
    border-color: #409eff;
  }

  &.is-unread {
    background: #ecf5ff;
    border-color: #b3d8ff;

    .message-title {
      font-weight: 600;
    }
  }

  .message-checkbox {
    margin-right: 12px;
  }

  .message-icon {
    margin-right: 16px;
  }

  .message-content {
    flex: 1;
    min-width: 0;

    .message-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      .title-text {
        font-size: 16px;
        color: #303133;
      }
    }

    .message-text {
      font-size: 14px;
      color: #606266;
      margin-bottom: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .message-time {
      font-size: 12px;
      color: #909399;
    }
  }

  .message-actions {
    display: flex;
    gap: 8px;
    margin-left: 16px;
  }
}

.message-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.message-detail {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;

    h3 {
      margin: 0;
      font-size: 18px;
      color: #303133;
    }
  }

  .detail-content {
    margin-bottom: 24px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 4px;

    p {
      margin: 0;
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
    }
  }

  .detail-meta {
    margin-bottom: 24px;

    .meta-item {
      display: flex;
      margin-bottom: 12px;
      font-size: 14px;

      .meta-label {
        color: #909399;
        min-width: 80px;
      }

      .meta-value {
        color: #606266;
      }
    }
  }

  .detail-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
}
</style>
