import { isEmail, isIdCard, isMobilePhone, isNotEmpty, isNumber } from '@oa/utils'
import { describe, expect, it } from 'vitest'

describe('validators', () => {
  describe('isMobilePhone', () => {
    it('should return true for valid phone numbers', () => {
      expect(isMobilePhone('13800138000')).toBe(true)
      expect(isMobilePhone('15912345678')).toBe(true)
    })

    it('should return false for invalid phone numbers', () => {
      expect(isMobilePhone('123456789')).toBe(false)
      expect(isMobilePhone('138001380000')).toBe(false)
      expect(isMobilePhone('abc')).toBe(false)
      expect(isMobilePhone('')).toBe(false)
    })
  })

  describe('isEmail', () => {
    it('should return true for valid emails', () => {
      expect(isEmail('test@example.com')).toBe(true)
      expect(isEmail('user.name+tag@domain.co.uk')).toBe(true)
    })

    it('should return false for invalid emails', () => {
      expect(isEmail('invalid-email')).toBe(false)
      expect(isEmail('test@')).toBe(false)
      expect(isEmail('@example.com')).toBe(false)
      expect(isEmail('')).toBe(false)
    })
  })

  describe('isIdCard', () => {
    it('should return true for valid Chinese ID cards', () => {
      expect(isIdCard('110101199003071234')).toBe(true)
    })

    it('should return false for invalid Chinese ID cards', () => {
      expect(isIdCard('12345678901234567')).toBe(false)
      expect(isIdCard('abc')).toBe(false)
      expect(isIdCard('')).toBe(false)
    })
  })

  describe('isNotEmpty', () => {
    it('should return true for non-empty values', () => {
      expect(isNotEmpty('hello')).toBe(true)
      expect(isNotEmpty([1, 2])).toBe(true)
      expect(isNotEmpty({})).toBe(true)
    })

    it('should return false for empty values', () => {
      expect(isNotEmpty('')).toBe(false)
      expect(isNotEmpty('   ')).toBe(false)
      expect(isNotEmpty([])).toBe(false)
      expect(isNotEmpty(null)).toBe(false)
      expect(isNotEmpty(undefined)).toBe(false)
    })
  })

  describe('isNumber', () => {
    it('should return true for numbers', () => {
      expect(isNumber(123)).toBe(true)
      expect(isNumber(0)).toBe(true)
    })

    it('should return false for non-numbers', () => {
      expect(isNumber('456')).toBe(false)
      expect(isNumber('abc')).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber(undefined)).toBe(false)
      expect(isNumber(Number.NaN)).toBe(false)
      expect(isNumber(Number.POSITIVE_INFINITY)).toBe(false)
    })
  })
})
