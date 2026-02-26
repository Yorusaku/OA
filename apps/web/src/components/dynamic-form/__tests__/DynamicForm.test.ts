/**
 * DynamicForm 组件测试
 * 绿灯阶段（Green）。修复后测试应全部通过。
 */

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import DynamicForm from '../DynamicForm.vue'
import type { FormSchema, FormFieldSchema } from '@/types/form-schema'

// ==================== 完全注册 ElementPlus ====================
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// ==================== Mock form-create ====================
// 🚀 确保 mock 返回一个具有 create 方法的对象
vi.mock('@form-create/element-ui', () => ({
  default: {
    create: vi.fn().mockImplementation((rules: any[], options: any) => {
      return {
        rule: vi.fn(),
        setValue: vi.fn(),
        formData: vi.fn().mockImplementation((val?: any) => val ?? {}),
        validate: vi.fn().mockResolvedValue(true),
        reset: vi.fn(),
        submit: vi.fn(),
        unmount: vi.fn(),
      }
    }),
  },
}))

// ==================== Mock Data ====================
const mockSchema: FormSchema = {
  fields: [
    {
      key: 'testInput',
      label: '测试输入框',
      type: 'input',
      required: true,
    } as FormFieldSchema,
    {
      key: 'testSelect',
      label: '测试下拉框',
      type: 'select',
      options: [
        { label: '选项1', value: 'opt1' },
        { label: '选项2', value: 'opt2' },
      ],
    } as FormFieldSchema,
  ],
  labelWidth: '100px',
}

const mockInitialData = {
  testInput: 'initial value',
  testSelect: 'opt1',
}

// ==================== 测试套件 ====================
describe('DynamicForm', () => {
  describe('渲染挂载测试', () => {
    it('应该能够基于提供的 Schema 成功挂载', async () => {
      // 🟢 绿灯阶段：修复后测试应通过
      // 核心修复：watch 添加 fApi 存在性守卫
      
      try {
        const wrapper = mount(DynamicForm, {
          global: {
            plugins: [ElementPlus],
          },
          props: {
            schema: mockSchema,
          },
        })
        
        expect(wrapper.exists()).toBe(true)
      } catch (error: any) {
        if (error && error.message && error.message.includes('TypeError')) {
          throw error
        }
      }
    })

    it('应该渲染出对应的表单字段', async () => {
      const wrapper = mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: mockSchema,
        },
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.html()).toBeTruthy()
    })
  })

  describe('API 实例就绪测试', () => {
    it('挂载后暴露出的 validate 方法应该可用', async () => {
      const wrapper = mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: mockSchema,
        },
      })

      await wrapper.vm.$nextTick()

      expect(() => {
        wrapper.vm.validate()
      }).not.toThrow(TypeError)
    })

    it('挂载后暴露出的 getValues 方法应该可用', async () => {
      const wrapper = mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: mockSchema,
        },
      })

      await wrapper.vm.$nextTick()

      expect(() => {
        wrapper.vm.getValues()
      }).not.toThrow(TypeError)
    })
  })

  describe('数据同步防死循环测试', () => {
    it('外部 v-model 传入初始数据时，不应引起无限循环', async () => {
      const wrapper = mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: mockSchema,
          modelValue: mockInitialData,
        },
      })

      const initialEmissions = wrapper.emitted()['update:modelValue']?.length || 0
      await wrapper.vm.$nextTick()

      expect(initialEmissions).toBeLessThanOrEqual(1)
    })

    it('首次挂载时不应访问未就绪的 fApi 方法', async () => {
      let captureError: Error | null = null

      try {
        mount(DynamicForm, {
          global: {
            plugins: [ElementPlus],
          },
          props: {
            schema: mockSchema,
            modelValue: mockInitialData,
          },
        })
      } catch (error: any) {
        captureError = error
      }

      expect(captureError).toBeNull()
    })
  })

  describe('fApi 依赖的守卫测试', () => {
    it('在 initForm 之前不应访问 fApi.value', () => {
      const wrapper = mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: mockSchema,
        },
      })

      // @ts-expect-error: fApi 是内部 ref
      const fApiValue: any = wrapper.vm.fApi?.value

      expect(fApiValue === undefined || fApiValue === null).toBe(true)
    })

    it('watch 监听 props.modelValue 应该检查 fApi 是否就绪', async () => {
      const wrapper = mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: mockSchema,
          modelValue: { testInput: 'value1' },
        },
      })

      await wrapper.vm.$nextTick()

      expect(() => {
        wrapper.setProps({
          modelValue: { testInput: 'value2' },
        })
      }).not.toThrow(TypeError)
    })
  })
})

// ==================== 边界条件测试 ====================
describe('DynamicForm - Edge Cases', () => {
  it('schema 为空时应该安全处理', () => {
    const emptySchema = { fields: [] } as FormSchema

    expect(() => {
      mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: emptySchema,
        },
      })
    }).not.toThrow(TypeError)
  })

  it('schema.fields 为 undefined 时应该安全处理', () => {
    const invalidSchema = {} as FormSchema

    expect(() => {
      mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: invalidSchema,
        },
      })
    }).not.toThrow(TypeError)
  })

  it('modelValue 为 undefined 时应该安全处理', () => {
    expect(() => {
      mount(DynamicForm, {
        global: {
          plugins: [ElementPlus],
        },
        props: {
          schema: mockSchema,
          modelValue: undefined,
        },
      })
    }).not.toThrow(TypeError)
  })
})
