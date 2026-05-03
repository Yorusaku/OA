import { randomUUID } from 'node:crypto'

export function nowText(date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  const second = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

export function parseTime(value?: string): Date {
  if (!value)
    return new Date()
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime()))
    return new Date()
  return date
}

export function uid(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

export function toDateRange(value?: [Date, Date] | null): [Date, Date] | null {
  if (!value?.[0] || !value?.[1])
    return null
  const start = new Date(value[0])
  const end = new Date(value[1])
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return [start, end]
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
