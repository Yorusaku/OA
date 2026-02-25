<script setup lang="ts">
import { Document, Files, Picture, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref } from 'vue'
import { formatDate, formatFileSize } from '@/utils/formatters'

interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  createdAt: Date
}

const props = defineProps<{
  attachments?: Attachment[]
}>()

const emit = defineEmits<{
  upload: [file: File]
  delete: [id: string]
  preview: [attachment: Attachment]
}>()

const attachments = ref<Attachment[]>(props.attachments || [])

function isImage(type: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'].includes(type)
}

function isPdf(type: string): boolean {
  return type === 'application/pdf'
}

function beforeUpload(file: File) {
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB!')
    return false
  }
  return true
}

function handleUpload(file: any) {
  emit('upload', file.raw)
  ElMessage.success('文件上传成功')
}

function handlePreview(attachment: Attachment) {
  emit('preview', attachment)
}

function handleDownload(attachment: Attachment) {
  ElMessage.info(`正在下载 ${attachment.name}`)
}

async function handleDelete(attachment: Attachment) {
  try {
    await ElMessageBox.confirm('确定要删除此附件吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    emit('delete', attachment.id)
    ElMessage.success('删除成功')
  }
  catch {
  }
}
</script>

<template>
  <div class="approval-attachment">
    <div class="attachment-header">
      <h3>附件</h3>
      <el-upload
        :show-file-list="false"
        :on-change="handleUpload"
        :before-upload="beforeUpload"
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
      >
        <el-button type="primary" :icon="Upload">
          上传附件
        </el-button>
      </el-upload>
    </div>
    <div class="attachment-list">
      <div v-if="attachments.length === 0" class="empty-state">
        <el-empty description="暂无附件" />
      </div>
      <div v-else class="attachment-grid">
        <div v-for="attachment in attachments" :key="attachment.id" class="attachment-item">
          <div class="attachment-preview" @click="handlePreview(attachment)">
            <el-icon v-if="isImage(attachment.type)" class="image-icon" :size="48">
              <Picture />
            </el-icon>
            <el-icon v-else-if="isPdf(attachment.type)" class="pdf-icon" :size="48">
              <Document />
            </el-icon>
            <el-icon v-else class="file-icon" :size="48">
              <Files />
            </el-icon>
            <img
              v-if="isImage(attachment.type) && attachment.url"
              :src="attachment.url"
              class="preview-image"
              :alt="attachment.name"
            >
          </div>
          <div class="attachment-info">
            <div class="attachment-name">
              {{ attachment.name }}
            </div>
            <div class="attachment-meta">
              <span>{{ formatFileSize(attachment.size) }}</span>
              <span>{{ formatDate(attachment.createdAt) }}</span>
            </div>
          </div>
          <div class="attachment-actions">
            <el-button link type="primary" @click="handleDownload(attachment)">
              下载
            </el-button>
            <el-button link type="danger" @click="handleDelete(attachment)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.approval-attachment {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}

.attachment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 16px;
    color: #303133;
  }
}

.attachment-list {
  margin-bottom: 20px;
}

.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.attachment-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.3s;

  &:hover {
    background: #e6f7ff;
  }
}

.attachment-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;

  .image-icon {
    color: #409eff;
  }

  .pdf-icon {
    color: #f56c6c;
  }

  .file-icon {
    color: #909399;
  }
}

.preview-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.attachment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.attachment-name {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.attachment-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
