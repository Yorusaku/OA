/**
 * DynamicForm 组件测试
 * 包含基础渲染与节点级表单权限（Node-Level Permissions）的红灯测试
 */

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DynamicForm from '../DynamicForm.vue'
import type { FormSchema, FormFieldSchema } from '@/types/form-schema'
import ElementPlus from 'element-plus'

// ==================== 🚀 精妙 Mock 探针 ====================
// 使用 vi.hoisted 确保 mock 变量在 vi.mock 提升后仍能访问
const { mockRule, mockFormCreate, mockComponent, mockComponentApi } = vi.hoisted(() => {
  return {
    mockRule: vi.fn(),
    mockFormCreate: vi.fn().mockImplementation((rules: any[], options: any) => {
      mockComponentApi.rules = rules
      mockComponentApi.options = options
      return {
        rule: mockRule,
        setValue: vi.fn(),
        formData: vi.fn().mockImplementation((val?: any) => val ?? {}),
        validate: vi.fn().mockResolvedValue(true),
        reset: vi.fn(),
        submit: vi.fn(),
        destroy: vi.fn(),
      }
    }),
    mockComponent: {
      name: 'FormCreateComponent',
      props: ['rule', 'option', 'api'],
      setup(props: any) {
        // 返回一个渲染函数，简单渲染一个 div
        return () => null
      }
    },
    mockComponentApi: {
      rules: [] as any[],
      options: {} as any
    }
  }
})

vi.mock('@form-create/element-ui', () => ({
  default: new Proxy(mockFormCreate, {
    apply: (target: any, thisArg: any, argumentsList: any[]) => {
      // 拦截函数调用，转发给 mockFormCreate
      return Reflect.apply(target, thisArg, argumentsList)
    },
    get: (target: any, prop: string) => {
      if (prop === '$form') {
        return () => mockComponent
      }
      return Reflect.get(target, prop)
    }
  })
}))

// ==================== Mock Data ====================
const mockSchema: FormSchema = {
  fields: [
    { key: 'testInput', label: '测试输入', type: 'input', required: true } as FormFieldSchema,
    { key: 'testSelect', label: '测试下拉', type: 'select', options: [{ label: '1', value: '1' }] } as FormFieldSchema,
  ],
  labelWidth: '100px',
}

// 专为权限测试构造的业务 Schema
const permissionSchema: FormSchema = {
  fields: [
    { key: 'amount', label: '金额', type: 'number' } as FormFieldSchema,
    { key: 'reason', label: '事由', type: 'input' } as FormFieldSchema,
    { key: 'hr_comment', label: 'HR审批意见', type: 'input' } as FormFieldSchema,
  ]
}

// ==================== 基础测试 ====================
describe('DynamicForm 基础生命周期', () => {
  it('应该能够成功挂载不报错', () => {
    const wrapper = mount(DynamicForm, {
      global: { plugins: [ElementPlus] },
      props: { schema: mockSchema }
    })
    expect(wrapper.exists()).toBe(true)
  })
})

// ==================== 🚦 节点级表单权限测试 ====================
describe('DynamicForm - Node-Level Permissions', () => {

  it('hidden 权限：传入 { amount: "hidden" } 时，底层规则的 hidden 应为 true', () => {
    const wrapper = mount(DynamicForm, {
      global: { plugins: [ElementPlus] },
      props: {
        schema: permissionSchema,
        // @ts-ignore：TDD红灯期，强行绕过未定义的 prop 检查
        permissions: { amount: 'hidden' }
      }
    })

    // 🚀 使用 findComponent 抓取声明式组件的 rule props
    const formComponent = wrapper.findComponent({ name: 'FormCreateComponent' })
    expect(formComponent.exists()).toBe(true)
    
    const rules = formComponent.props('rule')
    const amountRule = rules.find((r: any) => r.field === 'amount')

    expect(amountRule).toBeDefined()
    expect(amountRule.hidden).toBe(true)
  })

  it('readonly 权限：传入 { reason: "readonly" } 时，组件 props 应被禁用或只读', () => {
    const wrapper = mount(DynamicForm, {
      global: { plugins: [ElementPlus] },
      props: {
        schema: permissionSchema,
        // @ts-ignore
        permissions: { reason: 'readonly' }
      }
    })

    // 🚀 使用 findComponent 抓取声明式组件的 rule props
    const formComponent = wrapper.findComponent({ name: 'FormCreateComponent' })
    expect(formComponent.exists()).toBe(true)
    
    const rules = formComponent.props('rule')
    const reasonRule = rules.find((r: any) => r.field === 'reason')

    const isReadonly = reasonRule.props.disabled === true || reasonRule.props.readonly === true
    expect(isReadonly).toBe(true)
  })

  it('required 权限：传入 { hr_comment: "required" } 时，验证规则中应包含必填', () => {
    const wrapper = mount(DynamicForm, {
      global: { plugins: [ElementPlus] },
      props: {
        schema: permissionSchema,
        // @ts-ignore
        permissions: { hr_comment: 'required' }
      }
    })

    // 🚀 使用 findComponent 抓取声明式组件的 rule props
    const formComponent = wrapper.findComponent({ name: 'FormCreateComponent' })
    expect(formComponent.exists()).toBe(true)
    
    const rules = formComponent.props('rule')
    const hrCommentRule = rules.find((r: any) => r.field === 'hr_comment')

    const hasRequired = hrCommentRule.validate?.some((v: any) => v.required === true)
    expect(hasRequired).toBe(true)
  })
})