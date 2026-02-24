const isServer = typeof window === 'undefined'

export function getStorage<T = any>(key: string, defaultValue?: T): T | null {
  if (isServer)
    return null
  try {
    const item = window.localStorage.getItem(key)
    if (item) {
      return JSON.parse(item) as T
    }
  }
  catch {
    console.error(`Error reading localStorage key "${key}"`)
  }
  return defaultValue ?? null
}

export function setStorage(key: string, value: any): boolean {
  if (isServer)
    return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  }
  catch {
    console.error(`Error setting localStorage key "${key}"`)
    return false
  }
}

export function removeStorage(key: string): boolean {
  if (isServer)
    return false
  try {
    window.localStorage.removeItem(key)
    return true
  }
  catch {
    console.error(`Error removing localStorage key "${key}"`)
    return false
  }
}
