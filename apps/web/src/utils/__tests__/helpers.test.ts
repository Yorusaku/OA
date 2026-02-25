import { debounce, deepClone, generateId, sleep, throttle } from '@oa/utils'
import { describe, expect, it, vi } from 'vitest'

describe('helpers', () => {
  describe('debounce', () => {
    it('should debounce function calls', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced()
      debounced()
      debounced()

      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })

    it('should pass arguments correctly', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced('arg1', 'arg2')
      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
      vi.useRealTimers()
    })
  })

  describe('throttle', () => {
    it('should throttle function calls', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled()
      throttled()
      throttled()

      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(50)
      throttled()
      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      throttled()
      expect(fn).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })

  describe('deepClone', () => {
    it('should deep clone an object', () => {
      const obj = {
        name: 'test',
        nested: {
          value: 123,
        },
        array: [1, 2, 3],
      }

      const cloned = deepClone(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.nested).not.toBe(obj.nested)
      expect(cloned.array).not.toBe(obj.array)
    })

    it('should handle null and undefined', () => {
      expect(deepClone(null)).toBeNull()
      expect(deepClone(undefined)).toBeUndefined()
    })

    it('should handle arrays', () => {
      const arr = [1, { nested: 'value' }, [3, 4]]
      const cloned = deepClone(arr)
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[1]).not.toBe(arr[1])
      expect(cloned[2]).not.toBe(arr[2])
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15')
      const cloned = deepClone(date)
      expect(cloned).toEqual(date)
      expect(cloned).not.toBe(date)
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
    })
  })

  describe('sleep', () => {
    it('should return a promise that resolves after given ms', async () => {
      const start = Date.now()
      await sleep(100)
      const end = Date.now()
      expect(end - start).toBeGreaterThanOrEqual(100)
    })
  })
})
