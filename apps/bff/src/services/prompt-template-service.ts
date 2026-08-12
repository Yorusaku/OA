import type {
  CreatePromptTemplateRequest,
  PromptTemplate,
  PromptTemplateModelConfig,
  PromptTemplateScope,
  PromptTemplateStatus,
  PromptTemplateTestRequest,
  PromptTemplateTestResponse,
  UpdatePromptTemplateRequest,
} from '@oa/contracts'
import { createLLM } from '@oa/ai-utils'
import { nowText, uid } from '../utils'

// ========== 默认模板 ==========

const DEFAULT_MODEL_CONFIG: PromptTemplateModelConfig = {
  temperature: 0.2,
  maxTokens: 512,
}

const DEFAULT_SYSTEM_PROMPT = [
  '你是企业 OA 审批辅助助手，只能给出建议，不能替代人工审批。',
  '请基于审批单关键信息、表单摘要、流程节点、历史轨迹、SLA 与代理信息进行判断。',
  '请遵循 Human-in-the-Loop 原则：信息不足、规则冲突、金额异常、升级/代理场景不清晰时，优先返回 manual_review。',
  '你必须输出严格 JSON，字段仅包含 suggestion、confidence、riskLevel、reasoning。',
  'suggestion 只能是 approve、reject、manual_review。',
  'confidence 范围 0 到 1，riskLevel 只能是 low、medium、high。',
  'reasoning 用中文，给出 2 到 4 条简明依据，并明确说明为什么建议人工判断或建议通过/驳回。',
  '{{#policyWarnings}}',
  '【AI 策略警告 - 请降低建议置信度】',
  '{{policyWarnings}}',
  '{{/policyWarnings}}',
  '审批单号: {{approvalId}}',
  '标题: {{title}}',
  '类型: {{type}}',
  '申请人: {{applicant}}',
  '金额: {{amount}}',
  '描述: {{description}}',
  '当前节点: {{currentNodeName}}',
  'SLA 截止: {{deadlineAt}}',
  '超时升级: {{escalatedAt}}',
  '催办次数: {{remindCount}}',
  '最近意见: {{latestComment}}',
  '最近附件: {{latestAttachments}}',
  '流程摘要: {{workflowSummary}}',
  '轨迹摘要: {{trailSummary}}',
  '表单摘要: {{formSummary}}',
  '',
  '最小判断规则：',
  '1. 金额高、信息缺失、历史意见冲突时，提升 riskLevel，必要时 manual_review。',
  '2. 若当前已超时升级或代理处理，除非依据非常充分，否则 confidence 不宜过高。',
  '3. 若描述、金额、类型与表单摘要明显一致且历史处理轨迹清晰，可给 approve 或 reject。',
  '4. 不得虚构制度条款，不得假设不存在的附件内容。',
].join('\n')

const DEFAULT_USER_PROMPT = '请根据以上上下文返回审批建议 JSON，不要输出 Markdown 或额外说明。'

const DEFAULT_VARIABLES = [
  { name: 'approvalId', label: '审批单号', required: true },
  { name: 'title', label: '标题', required: true },
  { name: 'type', label: '类型', required: true },
  { name: 'applicant', label: '申请人', required: true },
  { name: 'amount', label: '金额', required: false, defaultValue: '-' },
  { name: 'description', label: '描述', required: false, defaultValue: '-' },
  { name: 'currentNodeName', label: '当前节点', required: false, defaultValue: '-' },
  { name: 'deadlineAt', label: 'SLA 截止', required: false, defaultValue: '-' },
  { name: 'escalatedAt', label: '超时升级', required: false, defaultValue: '-' },
  { name: 'remindCount', label: '催办次数', required: false, defaultValue: '0' },
  { name: 'latestComment', label: '最近意见', required: false, defaultValue: '-' },
  { name: 'latestAttachments', label: '最近附件', required: false, defaultValue: '-' },
  { name: 'workflowSummary', label: '流程摘要', required: true },
  { name: 'trailSummary', label: '轨迹摘要', required: true },
  { name: 'formSummary', label: '表单摘要', required: true },
  { name: 'policyWarnings', label: '策略警告', required: false, defaultValue: '' },
]

// ========== 模板存储（模块级单例） ==========

export interface PromptTemplateStore {
  templates: PromptTemplate[]
}

let _store: PromptTemplateStore | null = null

export function getPromptTemplateStore(): PromptTemplateStore {
  if (!_store)
    _store = { templates: [] }
  return _store
}

/**
 * 初始化默认模板（首次启动时调用）
 */
export function ensureDefaultTemplate(store = getPromptTemplateStore()): PromptTemplate {
  const existing = store.templates.find(
    t => t.scope === 'approval_suggestion' && t.status === 'active',
  )
  if (existing)
    return existing

  const now = nowText(new Date())
  const template: PromptTemplate = {
    id: uid('tmpl'),
    name: '审批建议默认模板',
    description: '系统默认的审批建议 Prompt 模板',
    scope: 'approval_suggestion',
    status: 'active',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPrompt: DEFAULT_USER_PROMPT,
    variables: DEFAULT_VARIABLES,
    modelConfig: { ...DEFAULT_MODEL_CONFIG },
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
  }
  store.templates.push(template)
  return template
}

// ========== CRUD ==========

export function listPromptTemplates(
  store: PromptTemplateStore,
  query: { scope?: PromptTemplateScope; status?: PromptTemplateStatus; keyword?: string },
): PromptTemplate[] {
  let list = [...store.templates]

  if (query.scope)
    list = list.filter(t => t.scope === query.scope)
  if (query.status)
    list = list.filter(t => t.status === query.status)
  if (query.keyword) {
    const kw = query.keyword.toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(kw) || (t.description || '').toLowerCase().includes(kw))
  }

  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getPromptTemplate(store: PromptTemplateStore, id: string): PromptTemplate | null {
  return store.templates.find(t => t.id === id) || null
}

export function createPromptTemplate(
  store: PromptTemplateStore,
  payload: CreatePromptTemplateRequest,
  createdBy = 'system',
): PromptTemplate {
  const now = nowText(new Date())
  const template: PromptTemplate = {
    id: uid('tmpl'),
    name: payload.name.trim(),
    description: payload.description?.trim(),
    scope: payload.scope,
    status: 'draft',
    systemPrompt: payload.systemPrompt,
    userPrompt: payload.userPrompt,
    variables: payload.variables || [],
    modelConfig: payload.modelConfig || { ...DEFAULT_MODEL_CONFIG },
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy,
  }
  store.templates.push(template)
  return template
}

export function updatePromptTemplate(
  store: PromptTemplateStore,
  id: string,
  payload: UpdatePromptTemplateRequest,
): PromptTemplate {
  const idx = store.templates.findIndex(t => t.id === id)
  if (idx === -1)
    throw new Error('prompt-template-not-found')

  const existing = store.templates[idx]
  const updated: PromptTemplate = {
    ...existing,
    name: payload.name?.trim() || existing.name,
    description: payload.description !== undefined ? payload.description.trim() : existing.description,
    systemPrompt: payload.systemPrompt !== undefined ? payload.systemPrompt : existing.systemPrompt,
    userPrompt: payload.userPrompt !== undefined ? payload.userPrompt : existing.userPrompt,
    variables: payload.variables !== undefined ? payload.variables : existing.variables,
    modelConfig: payload.modelConfig !== undefined ? payload.modelConfig : existing.modelConfig,
    version: existing.version + 1,
    updatedAt: nowText(new Date()),
  }
  store.templates[idx] = updated
  return updated
}

export function deletePromptTemplate(store: PromptTemplateStore, id: string): void {
  const idx = store.templates.findIndex(t => t.id === id)
  if (idx === -1)
    throw new Error('prompt-template-not-found')
  store.templates.splice(idx, 1)
}

/**
 * 激活模板（同一 scope 下其他模板自动变 archived）
 */
export function activatePromptTemplate(store: PromptTemplateStore, id: string): PromptTemplate {
  const template = store.templates.find(t => t.id === id)
  if (!template)
    throw new Error('prompt-template-not-found')

  // 同 scope 下其他 active 模板 → archived
  for (const t of store.templates) {
    if (t.id !== id && t.scope === template.scope && t.status === 'active') {
      t.status = 'archived'
      t.updatedAt = nowText(new Date())
    }
  }

  template.status = 'active'
  template.updatedAt = nowText(new Date())
  return template
}

/**
 * 获取指定 scope 下当前激活的模板
 */
export function getActiveTemplateForScope(
  store: PromptTemplateStore,
  scope: PromptTemplateScope,
): PromptTemplate | null {
  return store.templates.find(t => t.scope === scope && t.status === 'active') || null
}

// ========== 变量渲染 ==========

/**
 * 渲染 Prompt 模板 — 替换 {{varName}} 占位符
 * 支持简单的条件块：{{#varName}}...{{/varName}} — varName 非空时输出内容
 */
export function renderPrompt(template: string, variables: Record<string, string>): string {
  let result = template

  // 处理条件块 {{#var}}...{{/var}}
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, varName: string, content: string) => {
    const value = variables[varName] || ''
    return value ? content.replace(/\{\{(\w+)\}\}/g, (_m2: string, vn2: string) => variables[vn2] || '') : ''
  })

  // 替换简单变量 {{var}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    return variables[varName] !== undefined ? variables[varName] : `{{${varName}}}`
  })

  return result.trim()
}

// ========== 模板测试 ==========

/**
 * 用真实 LLM 调用测试模板
 */
export async function testPromptTemplate(
  payload: PromptTemplateTestRequest,
): Promise<PromptTemplateTestResponse> {
  const startTime = Date.now()
  const systemPrompt = renderPrompt(payload.systemPrompt, payload.variables)
  const userPrompt = renderPrompt(payload.userPrompt, payload.variables)

  const modelConfig = payload.modelConfig || DEFAULT_MODEL_CONFIG
  const llm = createLLM({
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
  })

  const response = await llm.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const latencyMs = Date.now() - startTime

  return {
    output: response.content,
    latencyMs,
    usage: response.usage,
  }
}
