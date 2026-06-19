export interface AiUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiChatOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
}
