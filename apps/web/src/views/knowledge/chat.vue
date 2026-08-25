<script setup lang="ts">
import type { KnowledgeBaseItem, KnowledgeChatMessage, RagCitation } from '@oa/contracts'
import {
  ArrowLeft,
  ChatDotRound,
  Delete,
  Edit,
  Plus,
  Promotion,
  Refresh,
  VideoPause,
} from '@element-plus/icons-vue'
import {
  ElButton,
  ElCard,
  ElEmpty,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElScrollbar,
  ElTag,
  ElTooltip,
} from 'element-plus'
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatMarkdown from '@/components/chat/ChatMarkdown.vue'
import { listKnowledgeBases } from '@/api/ai'
import { useKnowledgeChat } from '@/composables/useKnowledgeChat'

const route = useRoute()
const router = useRouter()
const kbId = computed(() => String(route.params.kbId || ''))
const knowledgeBase = ref<KnowledgeBaseItem | null>(null)
const input = ref('')
const editingSessionId = ref('')
const editingTitle = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

const chat = useKnowledgeChat(kbId)
const {
  sessions,
  currentSessionId,
  messages,
  streamingContent,
  streamingSources,
  status,
  isStreaming,
} = chat
const canSend = computed(() => input.value.trim().length > 0 && !isStreaming.value)

const suggestions = [
  '差旅住宿标准是什么？',
  '报销缺少发票应该怎么处理？',
  '采购金额超过五万元需要哪些材料？',
]

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 16)
}

function sourceScore(source: RagCitation): string {
  return `${(source.score * 100).toFixed(1)}%`
}

function messageSources(message: KnowledgeChatMessage): RagCitation[] {
  return message.sources || []
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const element = messagesContainer.value
  if (element)
    element.scrollTop = element.scrollHeight
}

async function submitMessage(): Promise<void> {
  if (!canSend.value)
    return
  const content = input.value.trim()
  input.value = ''
  try {
    await chat.sendMessage(content)
    await scrollToBottom()
  }
  catch (error) {
    if (!isAbortError(error))
      ElMessage.error('对话生成失败，请稍后重试')
  }
}

function handleEnter(event: Event | KeyboardEvent): void {
  if (!(event instanceof KeyboardEvent))
    return
  if (event.shiftKey)
    return
  event.preventDefault()
  void submitMessage()
}

function createNewSession(): void {
  chat.startDraft()
}

async function renameSession(sessionId: string): Promise<void> {
  const session = sessions.value.find(item => item.id === sessionId)
  if (!session)
    return
  editingSessionId.value = sessionId
  editingTitle.value = session.title
}

async function saveSessionTitle(sessionId: string): Promise<void> {
  try {
    await chat.renameSession(sessionId, editingTitle.value)
    editingSessionId.value = ''
  }
  catch {
    ElMessage.error('会话名称保存失败')
  }
}

async function deleteSession(sessionId: string): Promise<void> {
  try {
    await ElMessageBox.confirm('确定删除这个会话吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await chat.deleteSession(sessionId)
  }
  catch (error) {
    if (error !== 'cancel')
      ElMessage.error('会话删除失败')
  }
}

async function chooseSuggestion(value: string): Promise<void> {
  input.value = value
  await submitMessage()
}

void (async () => {
  try {
    const bases = await listKnowledgeBases()
    knowledgeBase.value = bases.find(item => item.id === kbId.value) || null
    if (!knowledgeBase.value)
      ElMessage.error('知识库不存在')
  }
  catch {
    ElMessage.error('知识库信息加载失败')
  }
})()
</script>

<template>
  <div class="knowledge-chat-page">
    <aside class="knowledge-chat-page__sidebar">
      <div class="chat-sidebar__header">
        <ElButton text :icon="ArrowLeft" @click="router.push({ name: 'KnowledgeCenter' })">
          知识库管理
        </ElButton>
        <ElButton circle :icon="Plus" title="新建会话" @click="createNewSession" />
      </div>
      <div class="chat-sidebar__title">
        <ElIcon><ChatDotRound /></ElIcon>
        <span>{{ knowledgeBase?.name || '知识库对话' }}</span>
      </div>
      <ElScrollbar class="chat-sidebar__scroll">
        <ElEmpty v-if="!sessions.length" description="暂无历史会话" :image-size="72" />
        <div
          v-for="session in sessions"
          :key="session.id"
          class="chat-session"
          :class="{ 'chat-session--active': session.id === currentSessionId }"
          @click="chat.selectSession(session.id)"
        >
          <template v-if="editingSessionId === session.id">
            <ElInput
              v-model="editingTitle"
              size="small"
              autofocus
              @keyup.enter="saveSessionTitle(session.id)"
              @blur="saveSessionTitle(session.id)"
              @click.stop
            />
          </template>
          <template v-else>
            <div class="chat-session__main">
              <div class="chat-session__title">{{ session.title }}</div>
              <div class="chat-session__time">{{ formatDate(session.updatedAt) }}</div>
            </div>
            <div class="chat-session__actions" @click.stop>
              <ElTooltip content="重命名">
                <ElButton text :icon="Edit" @click="renameSession(session.id)" />
              </ElTooltip>
              <ElTooltip content="删除">
                <ElButton text type="danger" :icon="Delete" @click="deleteSession(session.id)" />
              </ElTooltip>
            </div>
          </template>
        </div>
      </ElScrollbar>
    </aside>

    <main class="knowledge-chat-page__main">
      <header class="chat-main__header">
        <div>
          <h1>制度知识库对话</h1>
          <p>基于制度片段检索回答，结果仅供业务复核参考</p>
        </div>
        <ElTag type="success">RAG 检索</ElTag>
      </header>

      <div ref="messagesContainer" class="chat-main__messages">
        <ElEmpty
          v-if="!messages.length && !streamingContent"
          description="向知识库提问，快速定位制度条款"
        >
          <div class="chat-suggestions">
            <ElButton
              v-for="item in suggestions"
              :key="item"
              plain
              @click="chooseSuggestion(item)"
            >
              {{ item }}
            </ElButton>
          </div>
        </ElEmpty>

        <div
          v-for="message in messages"
          :key="message.id"
          class="chat-message"
          :class="`chat-message--${message.role}`"
        >
          <div class="chat-message__avatar">
            {{ message.role === 'user' ? '我' : 'AI' }}
          </div>
          <div class="chat-message__body">
            <div class="chat-message__content">
              <ChatMarkdown :content="message.content" />
            </div>
            <details v-if="messageSources(message).length" class="chat-sources">
              <summary>依据来源（{{ messageSources(message).length }}）</summary>
              <div
                v-for="source in messageSources(message)"
                :key="source.chunkId"
                class="chat-source"
              >
                <div class="chat-source__head">
                  <span>{{ source.filename }}</span>
                  <ElTag size="small" type="info">相似度{{ sourceScore(source) }}</ElTag>
                </div>
                <p>{{ source.content }}</p>
              </div>
            </details>
          </div>
        </div>

        <div v-if="isStreaming && streamingContent" class="chat-message chat-message--assistant">
          <div class="chat-message__avatar">AI</div>
          <div class="chat-message__body">
            <div class="chat-message__content">
              <ChatMarkdown :content="streamingContent" />
              <span class="chat-cursor" />
            </div>
            <details v-if="streamingSources.length" class="chat-sources">
              <summary>依据来源（{{ streamingSources.length }}）</summary>
            </details>
          </div>
        </div>
      </div>

      <footer class="chat-main__composer">
        <ElInput
          v-model="input"
          type="textarea"
          :rows="3"
          resize="none"
          maxlength="2000"
          show-word-limit
          placeholder="输入制度问题，Enter 发送，Shift + Enter 换行"
          @keydown.enter="handleEnter"
        />
        <div class="chat-composer__footer">
          <span>AI 只提供制度检索与解释，不直接执行审批动作</span>
          <div>
            <ElButton v-if="isStreaming" :icon="VideoPause" @click="chat.stop">
              停止生成
            </ElButton>
            <ElButton v-else :icon="Promotion" type="primary" :disabled="!canSend" @click="submitMessage">
              发送
            </ElButton>
            <ElButton
              v-if="status === 'error'"
              text
              :icon="Refresh"
              @click="chat.retry"
            >
              重试
            </ElButton>
          </div>
        </div>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.knowledge-chat-page {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  height: 100%;
  min-height: 720px;
  background: #f5f7fa;
}

.knowledge-chat-page__sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid #e4e7ed;
  background: #fff;
}

.chat-sidebar__header,
.chat-main__header,
.chat-composer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chat-sidebar__header {
  padding: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.chat-sidebar__title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 16px 12px;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.chat-sidebar__scroll {
  flex: 1;
  padding: 0 12px 16px;
}

.chat-session {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.chat-session:hover,
.chat-session--active {
  background: #ecf5ff;
}

.chat-session__main {
  min-width: 0;
}

.chat-session__title {
  overflow: hidden;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-session__time {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.chat-session__actions {
  display: flex;
  flex: none;
}

.knowledge-chat-page__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.chat-main__header {
  padding: 18px 28px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.chat-main__header h1 {
  margin: 0;
  color: #303133;
  font-size: 18px;
}

.chat-main__header p {
  margin: 6px 0 0;
  color: #909399;
  font-size: 13px;
}

.chat-main__messages {
  flex: 1;
  min-height: 0;
  padding: 28px max(24px, 8vw);
  overflow-y: auto;
}

.chat-suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 680px;
}

.chat-message {
  display: flex;
  gap: 12px;
  max-width: 900px;
  margin: 0 auto 22px;
}

.chat-message--user {
  flex-direction: row-reverse;
}

.chat-message__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 12px;
}

.chat-message--assistant .chat-message__avatar {
  background: #67c23a;
}

.chat-message__body {
  max-width: min(760px, 85%);
}

.chat-message__content {
  padding: 12px 15px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.chat-message--user .chat-message__content {
  background: #409eff;
  color: #fff;
}

.chat-message--user .chat-message__content :deep(*) {
  color: inherit;
}

.chat-sources {
  margin-top: 8px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #606266;
  font-size: 13px;
}

.chat-sources summary {
  cursor: pointer;
  color: #409eff;
}

.chat-source {
  padding: 10px 0 2px;
}

.chat-source + .chat-source {
  border-top: 1px solid #f0f2f5;
}

.chat-source__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.chat-source p {
  margin: 6px 0 0;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}

.chat-cursor {
  display: inline-block;
  width: 7px;
  height: 18px;
  margin-left: 3px;
  vertical-align: -3px;
  background: #409eff;
  animation: blink 1s steps(2, start) infinite;
}

.chat-main__composer {
  padding: 14px max(24px, 8vw) 18px;
  border-top: 1px solid #e4e7ed;
  background: #fff;
}

.chat-composer__footer {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (max-width: 800px) {
  .knowledge-chat-page {
    grid-template-columns: 1fr;
  }

  .knowledge-chat-page__sidebar {
    display: none;
  }

  .chat-main__messages {
    padding: 20px 14px;
  }

  .chat-main__composer {
    padding: 12px 14px 16px;
  }

  .chat-composer__footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
 
