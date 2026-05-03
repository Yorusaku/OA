type ApiMode = 'mock' | 'hybrid' | 'real'

function normalizeApiMode(value?: string): ApiMode {
  const next = value?.toLowerCase()
  if (next === 'real')
    return 'real'
  if (next === 'hybrid')
    return 'hybrid'
  return 'mock'
}

const fallbackMode = import.meta.env.VITE_USE_MOCK === 'true' ? 'mock' : 'real'
const testFallbackMode = import.meta.env.MODE === 'test' || import.meta.env.VITEST ? 'mock' : fallbackMode
const apiMode = normalizeApiMode(import.meta.env.VITE_API_MODE || testFallbackMode)

export function getApiMode(): ApiMode {
  return apiMode
}

export function useRemoteApprovalApi(): boolean {
  return apiMode === 'hybrid' || apiMode === 'real'
}

export function useRemoteWorkflowApi(): boolean {
  return apiMode === 'hybrid' || apiMode === 'real'
}

export function useRealtimeStream(): boolean {
  const env = (import.meta.env.VITE_REALTIME_ENABLE ?? '').toLowerCase()
  if (env === 'false')
    return false
  if (env === 'true')
    return true
  return apiMode === 'hybrid' || apiMode === 'real'
}
