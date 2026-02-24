<template>
  <div class="approval-comment">
    <div class="comment-header">
      <h3>审批评论</h3>
    </div>
    <div class="comment-list">
      <div v-if="comments.length === 0" class="empty-state">
        <el-empty description="暂无评论" />
      </div>
      <div v-else>
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <el-avatar :size="40" :src="comment.avatar">{{ comment.userName.charAt(0) }}</el-avatar>
          <div class="comment-content">
            <div class="comment-user">
              <span class="user-name">{{ comment.userName }}</span>
              <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
            </div>
            <div class="comment-text">{{ comment.content }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="comment-input">
      <el-input
        v-model="newComment"
        type="textarea"
        :rows="3"
        placeholder="请输入评论内容..."
        @keydown.ctrl.enter="handleSubmit"
      />
      <div class="input-actions">
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          发表评论
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDate } from '@/utils/formatters'

interface Comment {
  id: string
  userId: string
  userName: string
  avatar?: string
  content: string
  createdAt: Date
}

const props = defineProps<{
  comments?: Comment[]
}>()

const emit = defineEmits<{
  'submit': [content: string]
}>()

const comments = ref<Comment[]>(props.comments || [])
const newComment = ref('')
const submitting = ref(false)

function handleSubmit() {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true

  setTimeout(() => {
    emit('submit', newComment.value)
    newComment.value = ''
    submitting.value = false
    ElMessage.success('评论发表成功')
  }, 500)
}
</script>

<style scoped lang="scss">
.approval-comment {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}

.comment-header {
  margin-bottom: 20px;
  h3 {
    margin: 0;
    font-size: 16px;
    color: #303133;
  }
}

.comment-list {
  margin-bottom: 20px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.comment-content {
  flex: 1;
}

.comment-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.user-name {
  font-weight: 500;
  color: #303133;
}

.comment-time {
  font-size: 12px;
  color: #909399;
}

.comment-text {
  color: #606266;
  line-height: 1.6;
}

.comment-input {
  .input-actions {
    margin-top: 12px;
    text-align: right;
  }
}
</style>
