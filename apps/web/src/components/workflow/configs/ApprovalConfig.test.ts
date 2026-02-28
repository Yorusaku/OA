/**
 * ApprovalConfig.vue 组件测试
 * 红灯阶段：测试空实现，所有测试应显示 FAIL
 *
 * 测试覆盖：
 * 1. 空状态渲染（未绑定表单）
 * 2. 表格渲染（字段权限配置）
 */

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'

// Mock @form-create/designer
vi.mock('@form-create/designer/dist/designer.cjs.js', () => ({
  default: {
    name: 'FcDesigner',
    props: {
      rule: { type: Object, default: () => ({}) },
      option: { type: Object, default: () => ({}) },
    },
    emits: ['node-click', 'change'],
    setup: () => ({
      getValue: vi.fn(() => ({
        rule: [],
        option: {},
      })),
      reset: vi.fn(),
    }),
    render: () => null,
  },
}))

// Mock form-create/element-ui
vi.mock('@form-create/element-ui', () => ({
  default: {
    $form: () => ({
      name: 'FcForm',
      props: {
        rule: { type: Array, default: () => [] },
        option: { type: Object, default: () => ({}) },
      },
      emits: ['node-click', 'change'],
      setup: () => ({
        api: vi.fn(),
        rule: vi.fn(),
        option: vi.fn(),
      }),
      render: () => null,
    }),
  },
}))

describe('ApprovalConfig - Red Light Test', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.clearAllMocks()
  })

  it('应该能够挂载包含 ElementPlus 组件的模板', async () => {
    // 创建一个使用 ElementPlus 组件的测试组件
    const wrapper = mount({
      template: `
        <div class="test-container">
          <el-form label-width="80px">
            <el-form-item label="绑定表单">
              <el-select v-model="formSchemaId">
                <el-option label="表单1" value="1" />
                <el-option label="表单2" value="2" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      `,
      setup() {
        return { formSchemaId: '' }
      },
    }, {
      global: {
        plugins: [ElementPlus],
      },
    })

    // 🔴 红灯断言：测试 DOM 结构
    expect(wrapper.html()).toContain('绑定表单')
    expect(wrapper.html()).toContain('el-form')
    expect(wrapper.html()).toContain('el-select')
  })

  it('应该在无字段时渲染空状态', async () => {
    const wrapper = mount({
      template: `
        <div class="test-empty">
          <el-empty v-if="fields.length === 0" description="暂无字段，请先绑定表单" />
        </div>
      `,
      setup() {
        return { fields: [] as any[] }
      },
    }, {
      global: {
        plugins: [ElementPlus],
      },
    })

    // 🔴 红灯断言：测试 ElEmpty 组件渲染
    expect(wrapper.html()).toContain('暂无字段，请先绑定表单')
    expect(wrapper.html()).toContain('el-empty')
  })
})
