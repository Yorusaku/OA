import { checkCondition, checkConditions } from '@oa/utils'
import { describe, expect, it } from 'vitest'

describe('form conditions', () => {
  it('supports contains operator', () => {
    expect(
      checkCondition(
        { field: 'tags', operator: 'contains', value: 'finance' },
        { tags: ['finance', 'hr'] },
      ),
    ).toBe(true)
  })

  it('supports includes operator as legacy alias', () => {
    expect(
      checkCondition(
        { field: 'name', operator: 'includes', value: '张' },
        { name: '张三' },
      ),
    ).toBe(true)
  })

  it('evaluates condition arrays', () => {
    expect(
      checkConditions(
        [
          { field: 'amount', operator: 'gt', value: 5000 },
          { field: 'type', operator: 'eq', value: 'expense' },
        ],
        { amount: 1000, type: 'expense' },
      ),
    ).toBe(true)
  })
})
