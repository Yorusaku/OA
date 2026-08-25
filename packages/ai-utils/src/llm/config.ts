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

export interface StreamingLLM {
  stream(messages: AiChatMessage[]): AsyncIterable<{ content: string; usage?: AiUsage }>
}

export function createStreamingLLM(options: AiChatOptions = {}): StreamingLLM {
  const apiKey = readEnv('ARK_API_KEY')
  if (!apiKey)
    throw new Error('缺少 ARK_API_KEY 环境变量')

  return {
    async *stream(messages: AiChatMessage[]): AsyncIterable<{ content: string; usage?: AiUsage }> {
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
            stream: true,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Ark 流式请求失败(${response.status}): ${text}`)
        }

        if (!response.body)
          throw new Error('Ark 流式响应缺少 body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let finalUsage: AiUsage | undefined

        while (true) {
          const { value, done } = await reader.read()
          if (done)
            break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          // 最后一个可能是不完整的行，保留在 buffer 中
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: '))
              continue

            const jsonText = trimmed.slice(6)
            if (jsonText === '[DONE]')
              continue

            try {
              const parsed = JSON.parse(jsonText) as {
                choices?: Array<{
                  delta?: { content?: string }
                  finish_reason?: string | null
                }>
                usage?: {
                  prompt_tokens?: number
                  completion_tokens?: number
                  total_tokens?: number
                }
              }

              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                yield { content }
              }

              if (parsed.usage) {
                finalUsage = {
                  inputTokens: parsed.usage.prompt_tokens,
                  outputTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                }
              }
            }
            catch {
              // 跳过无法解析的行
            }
          }
        }

        // 处理 buffer 中可能残留的最后一行
        if (buffer.trim().startsWith('data: ')) {
          const jsonText = buffer.trim().slice(6)
          if (jsonText !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonText) as {
                usage?: {
                  prompt_tokens?: number
                  completion_tokens?: number
                  total_tokens?: number
                }
              }
              if (parsed.usage) {
                finalUsage = {
                  inputTokens: parsed.usage.prompt_tokens,
                  outputTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                }
              }
            }
            catch {
              // 跳过
            }
          }
        }

        if (finalUsage) {
          yield { content: '', usage: finalUsage }
        }
      }
      finally {
        clearTimeout(timer)
      }
    },
  }
}
