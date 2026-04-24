/**
 * useFormSchemaAdapter Composable 测试
 * 红灯阶段：测试空实现，所有测试应显示 FAIL
 * 
 * 测试覆盖：
 * 1. 类型映射测试：Designer 的 'input', 'select', 'date-picker' → 系统的 'text', 'select', 'date'
 * 2. 属性提取测试：label, placeholder 等属性 → componentProps
 * 3. 校验转换测试：Designer 的 validate → Element Plus 的 rules
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  designerToFormSchema,
  mapFieldType,
  convertValidationToRules,
  type DesignerConfig,
} from '@/composables/useFormSchemaAdapter'
import type { FormSchema } from '@/types/form-schema'

// Mock Designer 配置数据
const mockDesignerConfig: DesignerConfig = {
  rule: [
    {
      name: 'input-username',
      type: 'input',
      props: {
        label: '用户名',
        placeholder: '请输入用户名',
      },
      validate: {
        required: true,
        rules: [
          {
            min: 3,
            max: 20,
            message: '长度在 3 到 20 个字符',
            trigger: 'blur',
          },
        ],
      },
    },
    {
      name: 'select-dept',
      type: 'select',
      props: {
        label: '部门',
        placeholder: '请选择部门',
        options: [
          { label: '技术部', value: 'tech' },
          { label: '产品部', value: 'product' },
        ],
      },
      validate: {
        required: true,
      },
    },
    {
      name: 'date-birthday',
      type: 'date-picker',
      props: {
        label: '生日',
        placeholder: '请选择生日',
      },
    },
  ],
  option: {
    labelWidth: '120px',
    submitBtn: false,
    resetBtn: false,
  },
}

describe('useFormSchemaAdapter - Red Light Test', () => {
  describe('designerToFormSchema', () => {
    it('应该从 Designer 配置中提取 fields 数组', () => {
      // 当前空实现会返回空数组，测试应失败
      const result = designerToFormSchema(mockDesignerConfig)
      
      // 绿灯断言：正确提取 fields 数组
      expect(result.fields).toHaveLength(3)
      expect(result.fields[0].key).toBe('input-username')
      expect(result.fields[0].type).toBe('text')
      expect(result.fields[0].label).toBe('用户名')
    })

    it('应该从 Designer option 中提取 labelWidth 配置', () => {
      // 绿灯断言：正确提取 labelWidth
      const result = designerToFormSchema(mockDesignerConfig)
      expect(result.labelWidth).toBe('120px')
    })

    it('应该正确处理空的 Designer 配置', () => {
      // 绿灯断言：空配置也正确处理
      const emptyConfig: DesignerConfig = {
        rule: [],
        option: {},
      }
      const result = designerToFormSchema(emptyConfig)
      expect(result.fields).toEqual([])
      expect(result.labelWidth).toBe('100px')
    })
  })

  describe('mapFieldType', () => {
    it('应该将 Designer 的 input 类型映射为系统的 text 类型', () => {
      // 绿灯断言：mapFieldType 正确映射
      const result = mapFieldType('input')
      expect(result).toBe('text')
    })

    it('应该将 Designer 的 select 类型映射为系统的 select 类型', () => {
      // 绿灯断言：mapFieldType 正确映射
      const result = mapFieldType('select')
      expect(result).toBe('select')
    })

    it('应该将 Designer 的 date-picker 类型映射为系统的 date 类型', () => {
      // 绿灯断言：mapFieldType 正确映射
      const result = mapFieldType('date-picker')
      expect(result).toBe('date')
    })

    it('应该将 Designer 的 inputNumber 类型映射为系统的 number 类型', () => {
      // 绿灯断言：mapFieldType 正确映射
      const result = mapFieldType('inputNumber')
      expect(result).toBe('number')
    })

    it('应该处理未知类型并返回默认值', () => {
      // 绿灯断言：未知类型返回默认 text
      const result = mapFieldType('unknown-type')
      expect(result).toBe('text')
    })
  })

  describe('convertValidationToRules', () => {
    it('应该将 Designer 的 required 属性转换为 Element Plus 的 required 规则', () => {
      // ❌ 红灯断言：当前空实现未正确转换 required
      const validate = {
        required: true,
        rules: [],
      }
      const result = convertValidationToRules(validate)
      
      expect(result).toEqual([
        {
          required: true,
          message: '请输入必填项',
          trigger: 'blur',
        },
      ])
    })

    it('应该将 Designer 的自定义规则转换为 Element Plus 的 rules', () => {
      // ❌ 红灯断言：当前空实现未正确转换自定义规则
      const validate = {
        required: false,
        rules: [
          {
            min: 3,
            max: 20,
            message: '长度在 3 到 20 个字符',
            trigger: 'blur',
          },
        ],
      }
      const result = convertValidationToRules(validate)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        min: 3,
        max: 20,
        message: '长度在 3 到 20 个字符',
        trigger: 'blur',
      })
    })

    it('应该处理空的 validate 配置并返回空数组', () => {
      // 绿灯断言：空 validate 正确返回空数组
      const result = convertValidationToRules(undefined)
      expect(result).toEqual([])
    })

    it('应该合并 required 和自定义规则到一个 rules 数组', () => {
      // 绿灯断言：合并 required 和自定义规则
      const validate = {
        required: true,
        rules: [
          {
            pattern: /^[a-zA-Z0-9]+$/,
            message: '只包含字母和数字',
            trigger: 'blur',
          },
        ],
      }
      const result = convertValidationToRules(validate)

      expect(result).toHaveLength(2)
      expect(result[0].required).toBe(true)
      if (result[1].pattern instanceof RegExp) {
        expect(result[1].pattern.source).toBe('^[a-zA-Z0-9]+$')
      } else {
        expect(result[1].pattern).toBe('^[a-zA-Z0-9]+$')
      }
    })
  })
})
