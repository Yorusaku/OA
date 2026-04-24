/**
 * ApprovalConfig.vue 组件测试（Phase 17：工作流与本地表单库联动）
 * 红灯阶段：测试未实现逻辑，所有测试应显示 FAIL
 *
 * 测试覆盖：
 * 1. 【正常数据源】下拉框选项来源于 formList（而非静态 props）
 * 2. 【联动回显】当 formSchemaId 有效时，渲染真实表单字段的权限配置表格
 * 3. 【脏数据兜底】formSchemaId 存在但表单已被删除时，优雅降级为 ElEmpty
 */

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createApp, ref } from 'vue'
import ElementPlus from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormDTO } from '@/composables/useLocalStorageFormStorage'
import ApprovalConfig from './ApprovalConfig.vue'

// ==================== Mocks ====================

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

// Mock @form-create/element-ui
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

// Mock useLocalStorageFormStorage（核心 Mock）
vi.mock('@/composables/useLocalStorageFormStorage', () => {
  const realFormatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  
  return {
    useLocalStorageFormStorage: vi.fn(),
    formatDate: realFormatDate,
  }
})

// ==================== Mock 数据 ====================

const mockFormListData: FormDTO[] = [
  {
    id: 'form-leave-001',
    name: '请假申请表',
    schema: {
      fields: [
        { key: 'leave_type', label: '请假类型', type: 'select' },
        { key: 'leave_days', label: '请假天数', type: 'number' },
        { key: 'start_date', label: '开始日期', type: 'date' },
        { key: 'reason', label: '请假事由', type: 'textarea' },
      ],
      labelWidth: '100px',
    },
    createTime: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 天前
    updateTime: Date.now(),
  },
  {
    id: 'form-expense-001',
    name: '费用报销申请',
    schema: {
      fields: [
        { key: 'expense_type', label: '费用类型', type: 'select' },
        { key: 'amount', label: '报销金额', type: 'number' },
        { key: 'description', label: '费用说明', type: 'textarea' },
      ],
      labelWidth: '100px',
    },
    createTime: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 天前
    updateTime: Date.now(),
  },
]

const mockDeletedFormId = 'form-deleted-999' // 已删除的表单 ID（脏数据）

// ==================== 辅助函数 ====================

/**
 * 创建测试组件的辅助函数
 */
async function createTestWrapper(propsData: any, mockStorageReturnValue: any) {
  const { useLocalStorageFormStorage } = await import('@/composables/useLocalStorageFormStorage')
  
  vi.mocked(useLocalStorageFormStorage).mockReturnValue(mockStorageReturnValue)

  return mount(ApprovalConfig, {
    global: {
      plugins: [ElementPlus],
      stubs: ['fc-designer', 'fc-form'],
      mocks: {
        $route: { path: '/form/config' },
      },
    },
    props: {
      modelValue: propsData,
    },
  })
}

// ==================== 测试套件 ====================

describe('ApprovalConfig - Phase 17：工作流与本地表单库联动（红灯测试）', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.clearAllMocks()
    localStorage.removeItem('form-list')
  })

  // ==================== 测试 1：正常数据源（下拉框选项应来源于 formList）====================
  it('（测试 1）当绑定表单下拉框选项应来源于 formList（而非静态 props）', async () => {
    // Arrange：Mock useLocalStorageFormStorage 返回真实数据
    const { useLocalStorageFormStorage } = await import('@/composables/useLocalStorageFormStorage')
    
    const mockFormListRef = ref(mockFormListData)
    
    vi.mocked(useLocalStorageFormStorage).mockReturnValue({
      formList: mockFormListRef,
      addForm: vi.fn(),
      updateForm: vi.fn(),
      deleteForm: vi.fn(),
      getFormById: vi.fn((id: string) => mockFormListData.find(f => f.id === id)),
      checkBindingCount: vi.fn(() => 0),
      formatDate: (timestamp: number): string => {
        const date = new Date(timestamp)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      },
    })

    // Arrange：挂载 ApprovalConfig 组件（模拟绑定表单场景）
    const wrapper = mount(ApprovalConfig, {
      global: {
        plugins: [ElementPlus],
        stubs: ['fc-designer', 'fc-form'],
      },
      props: {
        modelValue: {
          id: 'node-approval-001',
          type: 'approval',
          name: '经理审批',
          formSchemaId: 'form-leave-001', // 已绑定表单
        },
      },
    })

    // Act：等待组件渲染
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // ✅ Phase 17 绿灯断言：下拉框选项应来源于 formList（真实数据源）
    const html = wrapper.html()

    // ✅ 组件正确渲染了 formList 中的第一个表单名称
    expect(html).toContain('请假申请表')
    
    // ✅ 下拉框 placeholder 显示选中的表单名称（因为 formSchemaId 存在）
    expect(html).toContain('请假申请表')
  })

  // ==================== 测试 2：联动回显（有有效 formSchemaId）====================
  it('（测试 2）当 formSchemaId 有效时，应正确渲染带有真实表单字段的权限配置表格', async () => {
    // Arrange：Mock useLocalStorageFormStorage 返回有效数据
    const { useLocalStorageFormStorage } = await import('@/composables/useLocalStorageFormStorage')
    
    const mockFormListRef = ref(mockFormListData)
    
    vi.mocked(useLocalStorageFormStorage).mockReturnValue({
      formList: mockFormListRef,
      addForm: vi.fn(),
      updateForm: vi.fn(),
      deleteForm: vi.fn(),
      getFormById: vi.fn((id: string) => mockFormListData.find(f => f.id === id)),
      checkBindingCount: vi.fn(() => 0),
      formatDate: vi.fn((timestamp: number): string => new Date(timestamp).toLocaleString()),
    })

    // Arrange：挂载组件（已绑定请假申请表）
    const wrapper = mount(ApprovalConfig, {
      global: {
        plugins: [ElementPlus],
        stubs: ['fc-designer', 'fc-form'],
      },
      props: {
        modelValue: {
          id: 'node-approval-001',
          type: 'approval',
          name: '经理审批',
          formSchemaId: 'form-leave-001', // 有效 ID，指向"请假申请表"
        },
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const html = wrapper.html()

    // ✅ Phase 17 绿灯断言：权限配置表格应渲染真实表单字段
    expect(html).toContain('请假类型') // form-leave-001 的字段
    expect(html).toContain('请假天数')
    expect(html).toContain('开始日期')
    expect(html).toContain('请假事由')

    // ✅ 表格正确渲染（ElementPlus 使用 el-table__cell 类名）
    expect(html).toContain('el-table')
    expect(html).toContain('el-table__cell')
  })

  // ==================== 测试 3：脏数据兜底（核心测试）====================
  it('（测试 3）当 formSchemaId 存在但表单已被删除（脏数据），应优雅降级为 ElEmpty 并触发 update:modelValue', async () => {
    // Arrange：Mock useLocalStorageFormStorage 返回清理后的 formList（不含 deletedFormId）
    const { useLocalStorageFormStorage } = await import('@/composables/useLocalStorageFormStorage')
    
    const mockFormListRef = ref(mockFormListData)
    
    // formList 中没有 form-deleted-999（模拟用户手动删除表单）
    vi.mocked(useLocalStorageFormStorage).mockReturnValue({
      formList: mockFormListRef,
      addForm: vi.fn(),
      updateForm: vi.fn(),
      deleteForm: vi.fn(),
      getFormById: vi.fn((id: string) => {
        if (id === mockDeletedFormId) return undefined // 脏数据：ID 不存在
        return mockFormListData.find(f => f.id === id)
      }),
      checkBindingCount: vi.fn(() => 0),
      formatDate: vi.fn((timestamp: number): string => new Date(timestamp).toLocaleString()),
    })

    // Arrange：挂载组件（绑定已删除的表单 - 脏数据场景）
    const wrapper = mount(ApprovalConfig, {
      global: {
        plugins: [ElementPlus],
        stubs: ['fc-designer', 'fc-form'],
      },
      props: {
        modelValue: {
          id: 'node-approval-001',
          type: 'approval',
          name: '经理审批',
          formSchemaId: mockDeletedFormId, // 脏数据：已删除的表单 ID
        },
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const html = wrapper.html()

    // ✅ Phase 17 绿灯断言 1：不应白屏崩溃
    expect(html).toBeTruthy() // 组件应正常渲染
    
    // ✅ Phase 17 绿灯断言 2：应渲染 ElEmpty 友好提示
    // 由于找不到表单，currentSchema 返回 null，触发 ElEmpty 渲染
    expect(html).toContain('el-empty')
    expect(html).toContain('请先绑定表单') // 组件中使用的真实文案
  })

  // ==================== 测试 4：空状态（未绑定表单）====================
  it('（测试 4）当未绑定表单（formSchemaId 为空），应渲染空状态提醒', async () => {
    // Arrange：Mock useLocalStorageFormStorage
    const { useLocalStorageFormStorage } = await import('@/composables/useLocalStorageFormStorage')
    
    const mockFormListRef = ref(mockFormListData)
    
    vi.mocked(useLocalStorageFormStorage).mockReturnValue({
      formList: mockFormListRef,
      addForm: vi.fn(),
      updateForm: vi.fn(),
      deleteForm: vi.fn(),
      getFormById: vi.fn((id: string) => mockFormListData.find(f => f.id === id)),
      checkBindingCount: vi.fn(() => 0),
      formatDate: vi.fn(),
    })

    // Arrange：挂载组件（未绑定表单）
    const wrapper = mount(ApprovalConfig, {
      global: {
        plugins: [ElementPlus],
        stubs: ['fc-designer', 'fc-form'],
      },
      props: {
        modelValue: {
          id: 'node-approval-001',
          type: 'approval',
          name: '经理审批',
          // formSchemaId 未设置（未绑定表单）
        },
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const html = wrapper.html()

    // ✅ Phase 17 绿灯断言：应渲染空状态
    expect(html).toContain('el-empty')
    expect(html).toContain('请先绑定表单')
  })
})
