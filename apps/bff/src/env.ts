import fs from 'node:fs'
import path from 'node:path'

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed)
    return ''

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function loadEnvFile(filePath: string, shellKeys: Set<string>): void {
  if (!fs.existsSync(filePath))
    return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#'))
      continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0)
      continue

    const key = trimmed.slice(0, separatorIndex).trim()
    if (!key || shellKeys.has(key))
      continue

    const value = parseEnvValue(trimmed.slice(separatorIndex + 1))
    process.env[key] = value
  }
}

export function loadLocalEnv(): void {
  const shellKeys = new Set(Object.keys(process.env))
  const candidateDirs = Array.from(new Set([
    process.cwd(),
    path.resolve(process.cwd(), 'apps/bff'),
  ]))

  for (const dir of candidateDirs) {
    loadEnvFile(path.join(dir, '.env'), shellKeys)
    loadEnvFile(path.join(dir, '.env.local'), shellKeys)
  }
}
