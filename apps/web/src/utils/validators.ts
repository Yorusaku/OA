export function isMobilePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)
}

export function isIdCard(idCard: string): boolean {
  return /(^\d{15}$)|(^\d{18}$)|(^\d{17}([\dX])$)/i.test(idCard)
}

export function isUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  }
  catch {
    return false
  }
}

export function isNumber(value: any): boolean {
  return !Number.isNaN(Number(value))
}

export function isInteger(value: any): boolean {
  return Number.isInteger(Number(value))
}

export function isPositiveNumber(value: any): boolean {
  const num = Number(value)
  return !Number.isNaN(num) && num > 0
}

export function isNotEmpty(value: any): boolean {
  if (value === null || value === undefined)
    return false
  if (typeof value === 'string')
    return value.trim().length > 0
  if (Array.isArray(value))
    return value.length > 0
  return true
}
