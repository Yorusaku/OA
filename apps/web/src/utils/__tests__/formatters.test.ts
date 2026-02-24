import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatMoney, formatFileSize, truncateText } from '@oa/utils'

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const date = '2024-01-15'
      expect(formatDate(date)).toContain('2024')
      expect(formatDate(date)).toContain('01')
      expect(formatDate(date)).toContain('15')
    })

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date)).toContain('2024')
      expect(formatDate(date)).toContain('01')
      expect(formatDate(date)).toContain('15')
    })

    it('should return empty string for invalid date', () => {
      expect(formatDate('invalid')).toBe('')
      expect(formatDate('')).toBe('')
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time correctly', () => {
      const date = new Date('2024-01-15T10:30:00')
      const formatted = formatDateTime(date)
      expect(formatted).toContain('2024')
      expect(formatted).toContain('01')
      expect(formatted).toContain('15')
      expect(formatted).toContain('10')
      expect(formatted).toContain('30')
    })
  })

  describe('formatMoney', () => {
    it('should format number as currency', () => {
      expect(formatMoney(1000)).toBe('1,000.00')
      expect(formatMoney(1234.56)).toBe('1,234.56')
    })

    it('should handle zero and negative numbers', () => {
      expect(formatMoney(0)).toBe('0.00')
      expect(formatMoney(-100)).toBe('-100.00')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('should format KB correctly', () => {
      expect(formatFileSize(1024 * 2)).toBe('2 KB')
    })

    it('should format MB correctly', () => {
      expect(formatFileSize(1024 * 1024 * 5)).toBe('5 MB')
    })

    it('should format GB correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 2)).toBe('2 GB')
    })
  })

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello')
    })

    it('should truncate long text', () => {
      expect(truncateText('Hello world this is long text', 10)).toContain('...')
      expect(truncateText('Hello world this is long text', 10).length).toBeLessThan(15)
    })
  })
})
