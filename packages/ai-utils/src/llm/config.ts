import type { AiChatMessage, AiChatOptions, AiUsage } from './types'

export interface ArkChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ArkChatResponse {
  content: string
  usage?: AiUsage
}

function readEnv(key: string): string | undefined {
  const maybeProcess = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return maybeProcess.process?.env?.[key]
}

function resolveBaseUrl(): string {
  return readEnv('ARK_LLM_BASE_URL')
    || readEnv('ARK_BASE_URL')
    || 'https://ark.cn-beijing.volces.com/api/v3'
}

function resolveModel(): string {
  return readEnv('ARK_LLM_MODEL') || 'deepseek-v4-pro'
}

function resolveTimeout(): number {
  const raw = readEnv('ARK_REQUEST_TIMEOUT_MS')
  if (!raw)
    return 30_000

  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 30_000
}

export function createLLM(options: AiChatOptions = {}) {
  const apiKey = readEnv('ARK_API_KEY')
  if (!apiKey)
    throw new Error('缺少 ARK_API_KEY 环境变量')

  return {
    async invoke(messages: AiChatMessage[]): Promise<ArkChatResponse> {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), resolveTimeout())

      try {
        const response = await fetch(`${resolveBaseUrl()}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: resolveModel(),
            messages: messages.map(message => ({
              role: message.role,
              content: message.content,
            }) satisfies ArkChatMessage),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            stream: false,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(`Ark 请求失败(${response.status}): ${message}`)
        }

        const json = await response.json() as {
          choices?: Array<{
            message?: {
              content?: string
            }
          }>
          usage?: {
            prompt_tokens?: number
            completion_tokens?: number
            total_tokens?: number
          }
        }

        const content = json.choices?.[0]?.message?.content?.trim()
        if (!content)
          throw new Error('Ark 返回内容为空')

        return {
          content,
          usage: json.usage
            ? {
                inputTokens: json.usage.prompt_tokens,
                outputTokens: json.usage.completion_tokens,
                totalTokens: json.usage.total_tokens,
              }
            : undefined,
        }
      }
      finally {
        clearTimeout(timer)
      }
    },
  }
}
