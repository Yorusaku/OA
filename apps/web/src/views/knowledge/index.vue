<script setup lang="ts">
import type {
  CreateKnowledgeBaseRequest,
  KnowledgeBaseItem,
  KnowledgeDocumentItem,
  RagCitation,
  RagSearchResponse,
  UploadKnowledgeDocumentRequest,
} from '@oa/contracts'
import {
  ElAlert,
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElScrollbar,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import { ChatDotRound } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  deleteKnowledgeDocument,
  listKnowledgeBases,
  listKnowledgeDocuments,
  reindexKnowledgeDocument,
  searchKnowledge,
  uploadKnowledgeDocument,
} from '@/api/ai'
import { pdfService } from '@/services/document'

const loadingBases = ref(false)
const loadingDocuments = ref(false)
const creatingBase = ref(false)
const uploadingDocument = ref(false)
const searching = ref(false)

const knowledgeBases = ref<KnowledgeBaseItem[]>([])
const documents = ref<KnowledgeDocumentItem[]>([])
const selectedKbId = ref<string>('')
const activeBase = computed(() => knowledgeBases.value.find(item => item.id === selectedKbId.value) || null)

const createDialogVisible = ref(false)
const createBaseForm = reactive<CreateKnowledgeBaseRequest>({
  name: '',
  description: '',
  chunkSize: 500,
  chunkOverlap: 50,
})

const uploadFile = ref<File | null>(null)
const uploadError = ref('')

const searchForm = reactive({
  query: '',
  topK: 5,
})
const searchResult = ref<RagSearchResponse | null>(null)
const router = useRouter()

function formatFileSize(size: number): string {
  if (size < 1024)
    return `${size} B`
  if (size < 1024 * 1024)
    return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

function statusTagType(status: KnowledgeDocumentItem['status']): 'info' | 'success' | 'danger' | 'warning' {
  if (status === 'ready')
    return 'success'
  if (status === 'error')
    return 'danger'
  if (status === 'processing')
    return 'warning'
  return 'info'
}

function statusText(status: KnowledgeDocumentItem['status']): string {
  if (status === 'ready')
    return '就绪'
  if (status === 'processing')
    return '处理中'
  if (status === 'error')
    return '失败'
  return status
}

async function loadKnowledgeBases(): Promise<void> {
  loadingBases.value = true
  try {
    const result = await listKnowledgeBases()
    knowledgeBases.value = result
    if (!selectedKbId.value && result.length > 0)
      selectedKbId.value = result[0].id
    if (selectedKbId.value && !result.some(item => item.id === selectedKbId.value))
      selectedKbId.value = result[0]?.id || ''
  }
  catch (error) {
    ElMessage.error('知识库列表加载失败')
  }
  finally {
    loadingBases.value = false
  }
}

async function loadDocuments(): Promise<void> {
  if (!selectedKbId.value) {
    documents.value = []
    return
  }

  loadingDocuments.value = true
  try {
    documents.value = await listKnowledgeDocuments(selectedKbId.value)
  }
  catch {
    ElMessage.error('文档列表加载失败')
  }
  finally {
    loadingDocuments.value = false
  }
}

async function handleCreateBase(): Promise<void> {
  if (!createBaseForm.name?.trim()) {
    ElMessage.warning('请输入知识库名称')
    return
  }

  creatingBase.value = true
  try {
    const created = await createKnowledgeBase({
      name: createBaseForm.name,
      description: createBaseForm.description,
      chunkSize: createBaseForm.chunkSize,
      chunkOverlap: createBaseForm.chunkOverlap,
    })
    createDialogVisible.value = false
    createBaseForm.name = ''
    createBaseForm.description = ''
    createBaseForm.chunkSize = 500
    createBaseForm.chunkOverlap = 50
    await loadKnowledgeBases()
    selectedKbId.value = created.id
    ElMessage.success('知识库创建成功')
  }
  catch {
    ElMessage.error('知识库创建失败')
  }
  finally {
    creatingBase.value = false
  }
}

async function handleDeleteBase(item: KnowledgeBaseItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除知识库“${item.name}”吗？相关文档和向量索引会一起清理。`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteKnowledgeBase(item.id)
    if (selectedKbId.value === item.id)
      selectedKbId.value = ''
    await loadKnowledgeBases()
    await loadDocuments()
    searchResult.value = null
    ElMessage.success('知识库已删除')
  }
  catch (error) {
    if (error !== 'cancel')
      ElMessage.error('知识库删除失败')
  }
}

function handleFileChange(file: Event): void {
  const input = file.target as HTMLInputElement
  uploadFile.value = input.files?.[0] || null
  uploadError.value = ''
}

async function extractDocumentPayload(file: File): Promise<UploadKnowledgeDocumentRequest> {
  const filename = file.name
  const lowered = filename.toLowerCase()

  if (lowered.endsWith('.txt') || lowered.endsWith('.md')) {
    return {
      filename,
      fileType: file.type || 'text/plain',
      fileSize: file.size,
      content: await file.text(),
    }
  }

  if (lowered.endsWith('.pdf')) {
    const { text } = await pdfService.extractText(file)
    return {
      filename,
      fileType: file.type || 'application/pdf',
      fileSize: file.size,
      content: text,
    }
  }

  throw new Error('unsupported-file-type')
}

async function handleUploadDocument(): Promise<void> {
  if (!selectedKbId.value) {
    ElMessage.warning('请先选择知识库')
    return
  }

  if (!uploadFile.value) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  uploadingDocument.value = true
  uploadError.value = ''
  try {
    const payload = await extractDocumentPayload(uploadFile.value)
    if (!payload.content.trim()) {
      throw new Error('empty-document-content')
    }
    await uploadKnowledgeDocument(selectedKbId.value, payload)
    uploadFile.value = null
    const input = document.getElementById('knowledge-upload-input') as HTMLInputElement | null
    if (input)
      input.value = ''
    await loadDocuments()
    ElMessage.success('文档上传成功')
  }
  catch (error) {
    if (error instanceof Error && error.message === 'unsupported-file-type') {
      uploadError.value = '首版仅支持 TXT、Markdown、PDF。Word 文档请先转换为 PDF 或 TXT。'
    }
    else if (error instanceof Error && error.message === 'empty-document-content') {
      uploadError.value = '文档未提取到可用文本，请确认文件内容后重试。'
    }
    else {
      uploadError.value = '文档上传失败，请稍后重试。'
    }
    ElMessage.error(uploadError.value)
  }
  finally {
    uploadingDocument.value = false
  }
}

async function handleDeleteDocument(item: KnowledgeDocumentItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除文档“${item.filename}”吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteKnowledgeDocument(item.kbId, item.id)
    await loadDocuments()
    ElMessage.success('文档已删除')
  }
  catch (error) {
    if (error !== 'cancel')
      ElMessage.error('文档删除失败')
  }
}

async function handleReindexDocument(item: KnowledgeDocumentItem): Promise<void> {
  try {
    await reindexKnowledgeDocument(item.kbId, item.id)
    await loadDocuments()
    ElMessage.success('文档索引已重建')
  }
  catch {
    ElMessage.error('索引重建失败，请稍后重试')
  }
}

async function handleSearch(): Promise<void> {
  if (!selectedKbId.value) {
    ElMessage.warning('请先选择知识库')
    return
  }
  if (!searchForm.query.trim()) {
    ElMessage.warning('请输入检索问题')
    return
  }

  searching.value = true
  try {
    searchResult.value = await searchKnowledge(selectedKbId.value, {
      query: searchForm.query.trim(),
      topK: searchForm.topK,
    })
  }
  catch {
    ElMessage.error('检索失败，请稍后重试')
  }
  finally {
    searching.value = false
  }
}

function sourceScoreText(source: RagCitation): string {
  return `${(source.score * 100).toFixed(1)}%`
}

function enterKnowledgeChat(item: KnowledgeBaseItem): void {
  router.push({ name: 'KnowledgeChat', params: { kbId: item.id } })
}

watch(selectedKbId, async () => {
  searchResult.value = null
  await loadDocuments()
})

onMounted(async () => {
  await loadKnowledgeBases()
  await loadDocuments()
})
</script>

<template>
  <div class="knowledge-page">
    <div class="knowledge-page__header">
      <div>
        <h1 class="knowledge-page__title">知识库管理</h1>
        <p class="knowledge-page__subtitle">
          上传制度文档并做检索问答，服务审批场景下的制度查询与人工复核。
        </p>
      </div>
      <ElButton type="primary" @click="createDialogVisible = true">
        新建知识库
      </ElButton>
    </div>

    <div class="knowledge-page__grid">
      <ElCard class="knowledge-page__sidebar" shadow="never">
        <template #header>
          <div class="knowledge-page__section-head">
            <span>知识库列表</span>
            <ElButton text @click="loadKnowledgeBases">
              刷新
            </ElButton>
          </div>
        </template>

        <ElScrollbar height="680px" v-loading="loadingBases">
          <div v-if="knowledgeBases.length === 0" class="knowledge-page__empty-inline">
            <ElEmpty description="暂无知识库" :image-size="84" />
          </div>

          <button
            v-for="item in knowledgeBases"
            :key="item.id"
            class="knowledge-base-item"
            :class="{ 'knowledge-base-item--active': item.id === selectedKbId }"
            type="button"
            @click="selectedKbId = item.id"
          >
            <div class="knowledge-base-item__main">
              <div class="knowledge-base-item__name">{{ item.name }}</div>
              <div class="knowledge-base-item__desc">{{ item.description || '暂无描述' }}</div>
              <div class="knowledge-base-item__meta">
                分块 {{ item.chunkSize }} / 重叠 {{ item.chunkOverlap }}
              </div>
            </div>
            <div class="knowledge-base-item__actions" @click.stop>
              <ElButton text :icon="ChatDotRound" title="进入对话" @click="enterKnowledgeChat(item)">
                对话
              </ElButton>
              <ElButton text type="danger" @click="handleDeleteBase(item)">
                删除
              </ElButton>
            </div>
          </button>
        </ElScrollbar>
      </ElCard>

      <div class="knowledge-page__content">
        <ElCard class="knowledge-page__panel" shadow="never">
          <template #header>
            <div class="knowledge-page__section-head">
              <span>文档管理</span>
              <span v-if="activeBase" class="knowledge-page__active-name">{{ activeBase.name }}</span>
            </div>
          </template>

          <div v-if="!activeBase" class="knowledge-page__empty-inline">
            <ElEmpty description="先创建或选择一个知识库" />
          </div>

          <template v-else>
            <ElAlert
              title="首版上传说明"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                当前支持 TXT、Markdown、PDF。PDF 会先在前端提取文本，再通过 JSON 发送到 BFF。
              </template>
            </ElAlert>

            <div class="knowledge-upload">
              <input
                id="knowledge-upload-input"
                accept=".txt,.md,.pdf"
                type="file"
                @change="handleFileChange"
              >
              <ElButton type="primary" :loading="uploadingDocument" @click="handleUploadDocument">
                上传文档
              </ElButton>
              <span class="knowledge-upload__hint">
                {{ uploadFile ? `已选择：${uploadFile.name}` : '请选择文件后上传' }}
              </span>
            </div>

            <p v-if="uploadError" class="knowledge-upload__error">
              {{ uploadError }}
            </p>

            <ElTable
              v-loading="loadingDocuments"
              :data="documents"
              class="knowledge-page__table"
              empty-text="暂无文档"
            >
              <ElTableColumn prop="filename" label="文件名" min-width="220" />
              <ElTableColumn prop="fileType" label="类型" min-width="140" />
              <ElTableColumn label="大小" width="110">
                <template #default="{ row }">
                  {{ formatFileSize(row.fileSize) }}
                </template>
              </ElTableColumn>
              <ElTableColumn prop="chunkCount" label="分块数" width="90" />
              <ElTableColumn label="状态" width="110">
                <template #default="{ row }">
                  <ElTag :type="statusTagType(row.status)">
                    {{ statusText(row.status) }}
                  </ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn label="创建时间" min-width="170">
                <template #default="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <ElButton
                    v-if="row.status === 'ready' && row.errorMessage"
                    text
                    type="warning"
                    @click="handleReindexDocument(row)"
                  >
                    重试索引
                  </ElButton>
                  <ElButton text type="danger" @click="handleDeleteDocument(row)">
                    删除
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </template>
        </ElCard>

        <ElCard class="knowledge-page__panel" shadow="never">
          <template #header>
            <div class="knowledge-page__section-head">
              <span>检索测试</span>
            </div>
          </template>

          <div v-if="!activeBase" class="knowledge-page__empty-inline">
            <ElEmpty description="选择知识库后即可开始检索" :image-size="84" />
          </div>

          <template v-else>
            <ElForm inline>
              <ElFormItem label="问题">
                <ElInput
                  v-model="searchForm.query"
                  class="knowledge-search__input"
                  placeholder="例如：出差住宿标准是多少？"
                  @keyup.enter="handleSearch"
                />
              </ElFormItem>
              <ElFormItem label="TopK">
                <ElSelect v-model="searchForm.topK" style="width: 110px">
                  <ElOption :value="3" label="3" />
                  <ElOption :value="5" label="5" />
                  <ElOption :value="8" label="8" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem>
                <ElButton type="primary" :loading="searching" @click="handleSearch">
                  开始检索
                </ElButton>
              </ElFormItem>
            </ElForm>

            <div v-if="searchResult" class="knowledge-search__result">
              <div class="knowledge-search__answer">
                <h3>回答</h3>
                <p>{{ searchResult.answer }}</p>
              </div>

              <div class="knowledge-search__sources">
                <h3>引用来源</h3>
                <div v-if="searchResult.sources.length === 0" class="knowledge-page__empty-inline">
                  <ElEmpty description="暂无命中片段" :image-size="70" />
                </div>
                <div
                  v-for="source in searchResult.sources"
                  :key="source.chunkId"
                  class="knowledge-source-card"
                >
                  <div class="knowledge-source-card__head">
                    <span>{{ source.filename }}</span>
                    <ElTag type="info">相似度 {{ sourceScoreText(source) }}</ElTag>
                  </div>
                  <p>{{ source.content }}</p>
                </div>
              </div>
            </div>
          </template>
        </ElCard>
      </div>
    </div>

    <ElDialog v-model="createDialogVisible" title="新建知识库" width="480px">
      <ElForm label-position="top">
        <ElFormItem label="名称">
          <ElInput v-model="createBaseForm.name" maxlength="50" placeholder="例如：企业报销制度" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput
            v-model="createBaseForm.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            placeholder="简要描述知识库用途"
          />
        </ElFormItem>
        <div class="knowledge-page__dialog-grid">
          <ElFormItem label="分块大小">
            <ElInput v-model.number="createBaseForm.chunkSize" type="number" />
          </ElFormItem>
          <ElFormItem label="重叠长度">
            <ElInput v-model.number="createBaseForm.chunkOverlap" type="number" />
          </ElFormItem>
        </div>
      </ElForm>

      <template #footer>
        <ElButton @click="createDialogVisible = false">
          取消
        </ElButton>
        <ElButton type="primary" :loading="creatingBase" @click="handleCreateBase">
          创建
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.knowledge-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100%;
}

.knowledge-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.knowledge-page__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.knowledge-page__subtitle {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.6;
}

.knowledge-page__grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.knowledge-page__sidebar,
.knowledge-page__panel {
  border: 1px solid #e5e7eb;
}

.knowledge-page__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.knowledge-page__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  font-weight: 600;
}

.knowledge-page__active-name {
  color: #409eff;
  font-size: 13px;
  font-weight: 500;
}

.knowledge-page__empty-inline {
  padding: 24px 0;
}

.knowledge-base-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.knowledge-base-item + .knowledge-base-item {
  margin-top: 12px;
}

.knowledge-base-item:hover,
.knowledge-base-item--active {
  border-color: #409eff;
  box-shadow: 0 10px 24px rgba(64, 158, 255, 0.12);
}

.knowledge-base-item__main {
  min-width: 0;
}

.knowledge-base-item__actions {
  display: flex;
  flex: none;
  align-items: center;
}

.knowledge-base-item__name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.knowledge-base-item__desc,
.knowledge-base-item__meta {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.knowledge-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 16px;
  flex-wrap: wrap;
}

.knowledge-upload__hint {
  color: #6b7280;
  font-size: 13px;
}

.knowledge-upload__error {
  margin: 0 0 16px;
  color: #f56c6c;
  font-size: 13px;
}

.knowledge-page__table {
  margin-top: 12px;
}

.knowledge-search__input {
  width: 420px;
  max-width: 100%;
}

.knowledge-search__result {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.knowledge-search__answer,
.knowledge-search__sources {
  padding: 18px;
  border-radius: 14px;
  background: #f8fafc;
}

.knowledge-search__answer h3,
.knowledge-search__sources h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.knowledge-search__answer p {
  margin: 0;
  line-height: 1.8;
  color: #374151;
  white-space: pre-wrap;
}

.knowledge-source-card + .knowledge-source-card {
  margin-top: 12px;
}

.knowledge-source-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.knowledge-source-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #111827;
}

.knowledge-source-card p {
  margin: 0;
  line-height: 1.7;
  color: #4b5563;
  white-space: pre-wrap;
}

.knowledge-page__dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1024px) {
  .knowledge-page__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .knowledge-page {
    padding: 16px;
  }

  .knowledge-page__header {
    flex-direction: column;
    align-items: stretch;
  }

  .knowledge-page__dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
