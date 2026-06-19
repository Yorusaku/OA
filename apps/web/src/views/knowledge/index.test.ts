import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import KnowledgePage from './index.vue'

const mockListKnowledgeBases = vi.fn()
const mockListKnowledgeDocuments = vi.fn()
const mockCreateKnowledgeBase = vi.fn()
const mockDeleteKnowledgeBase = vi.fn()
const mockUploadKnowledgeDocument = vi.fn()
const mockDeleteKnowledgeDocument = vi.fn()
const mockSearchKnowledge = vi.fn()
const mockExtractText = vi.fn()

vi.mock('@/api/ai', () => ({
  listKnowledgeBases: (...args: any[]) => mockListKnowledgeBases(...args),
  listKnowledgeDocuments: (...args: any[]) => mockListKnowledgeDocuments(...args),
  createKnowledgeBase: (...args: any[]) => mockCreateKnowledgeBase(...args),
  deleteKnowledgeBase: (...args: any[]) => mockDeleteKnowledgeBase(...args),
  uploadKnowledgeDocument: (...args: any[]) => mockUploadKnowledgeDocument(...args),
  deleteKnowledgeDocument: (...args: any[]) => mockDeleteKnowledgeDocument(...args),
  searchKnowledge: (...args: any[]) => mockSearchKnowledge(...args),
}))

vi.mock('@/services/document', () => ({
  pdfService: {
    extractText: (...args: any[]) => mockExtractText(...args),
  },
}))

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn().mockResolvedValue('confirm'),
    },
  }
})

describe('Knowledge index page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListKnowledgeBases.mockResolvedValue([
      {
        id: 'kb-001',
        name: '企业报销制度',
        description: '费用与差旅制度',
        chunkSize: 500,
        chunkOverlap: 50,
        createdAt: '2026-06-18T10:00:00.000Z',
      },
    ])
    mockListKnowledgeDocuments.mockResolvedValue([
      {
        id: 'doc-001',
        kbId: 'kb-001',
        filename: '报销制度.txt',
        fileType: 'text/plain',
        fileSize: 1024,
        chunkCount: 2,
        status: 'ready',
        errorMessage: null,
        createdAt: '2026-06-18T10:10:00.000Z',
      },
    ])
    mockCreateKnowledgeBase.mockResolvedValue({})
    mockDeleteKnowledgeBase.mockResolvedValue({ success: true })
    mockUploadKnowledgeDocument.mockResolvedValue({
      id: 'doc-002',
      kbId: 'kb-001',
      filename: '差旅政策.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      chunkCount: 3,
      status: 'ready',
      errorMessage: null,
      createdAt: '2026-06-18T10:20:00.000Z',
    })
    mockDeleteKnowledgeDocument.mockResolvedValue({ success: true })
    mockSearchKnowledge.mockResolvedValue({
      answer: '测试回答',
      sources: [],
    })
    mockExtractText.mockResolvedValue({
      text: 'PDF 提取文本内容',
    })
  })

  it('renders knowledge bases and documents after mount', async () => {
    const wrapper = mount(KnowledgePage)
    await nextTick()
    await Promise.resolve()
    await nextTick()

    expect(mockListKnowledgeBases).toHaveBeenCalledTimes(1)
    expect(mockListKnowledgeDocuments).toHaveBeenCalledWith('kb-001')
    expect(wrapper.text()).toContain('企业报销制度')
    expect(wrapper.text()).toContain('文档管理')
    expect(wrapper.text()).toContain('检索测试')
  })

  it('uploads a PDF document after extracting text', async () => {
    const wrapper = mount(KnowledgePage)
    await nextTick()
    await Promise.resolve()
    await nextTick()

    const file = new File(['mock pdf'], '差旅政策.pdf', { type: 'application/pdf' })
    const input = wrapper.find('#knowledge-upload-input')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })

    await input.trigger('change')

    const uploadButton = wrapper.findAll('button').find(button => button.text().includes('上传文档'))
    expect(uploadButton).toBeTruthy()

    await uploadButton!.trigger('click')
    await Promise.resolve()
    await nextTick()

    expect(mockExtractText).toHaveBeenCalledWith(file)
    expect(mockUploadKnowledgeDocument).toHaveBeenCalledWith('kb-001', {
      filename: '差旅政策.pdf',
      fileType: 'application/pdf',
      fileSize: file.size,
      content: 'PDF 提取文本内容',
    })
  })
})
