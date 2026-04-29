import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import {
  disableApprovalDelegation,
  getApprovalDelegation,
  upsertApprovalDelegation,
} from '@/api/approval'
import { useUserStore } from '@/stores/user'
import ApprovalDelegationSettings from '../ApprovalDelegationSettings.vue'

vi.mock('@/api/approval', () => ({
  getApprovalDelegation: vi.fn(),
  upsertApprovalDelegation: vi.fn(),
  disableApprovalDelegation: vi.fn(),
}))

vi.mock('@/stores/user', () => ({
  useUserStore: vi.fn(),
}))

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
  }
})

const stubs = {
  ElCard: {
    template: '<div><slot name="header" /><slot /></div>',
  },
  ElTag: {
    template: '<span><slot /></span>',
  },
  ElSkeleton: {
    template: '<div><slot name="default" /></div>',
  },
  ElForm: {
    template: '<form><slot /></form>',
  },
  ElFormItem: {
    template: '<div><slot /></div>',
  },
  ElSwitch: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', $event.target.checked)"
      >
    `,
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
      <select
        v-bind="$attrs"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <slot />
      </select>
    `,
  },
  ElOption: {
    props: ['value', 'label'],
    template: '<option :value="value">{{ label }}</option>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
      <input
        v-bind="$attrs"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      >
    `,
  },
  ElButton: {
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  },
  ElAlert: {
    props: ['title', 'description'],
    template: '<div class="el-alert">{{ title }} {{ description }}</div>',
  },
}

function mountPage() {
  return mount(ApprovalDelegationSettings, {
    global: {
      stubs,
    },
  })
}

describe('ApprovalDelegationSettings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUserStore).mockReturnValue({
      userInfo: {
        id: 'user-001',
        name: 'admin',
      },
    } as any)
    vi.mocked(getApprovalDelegation).mockResolvedValue(null)
    vi.mocked(upsertApprovalDelegation).mockResolvedValue({
      ownerId: 'user-001',
      ownerName: 'admin',
      delegateId: 'user-002',
      delegateName: 'manager',
      startAt: '2026-04-01 09:00:00',
      endAt: '2026-04-30 18:00:00',
      enabled: true,
      updatedAt: '2026-04-01 09:00:00',
    })
    vi.mocked(disableApprovalDelegation).mockResolvedValue(undefined)
  })

  it('保存前缺少关键字段时应提示并阻止提交', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[data-testid="delegation-save-btn"]').trigger('click')
    await flushPromises()

    expect(ElMessage.warning).toHaveBeenCalled()
    expect(upsertApprovalDelegation).not.toHaveBeenCalled()
  })

  it('可保存代理规则（创建/更新共用路径）', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[data-testid="delegation-delegate-select"]').setValue('user-002')
    await wrapper.get('[data-testid="delegation-start-at"]').setValue('2026-04-01 09:00:00')
    await wrapper.get('[data-testid="delegation-end-at"]').setValue('2026-04-30 18:00:00')
    await wrapper.get('[data-testid="delegation-save-btn"]').trigger('click')
    await flushPromises()

    expect(upsertApprovalDelegation).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 'user-001',
      ownerName: 'admin',
      delegateId: 'user-002',
      delegateName: 'manager',
      startAt: '2026-04-01 09:00:00',
      endAt: '2026-04-30 18:00:00',
      enabled: true,
    }))
    expect(ElMessage.success).toHaveBeenCalled()
  })

  it('可关闭当前用户代理规则', async () => {
    vi.mocked(getApprovalDelegation).mockResolvedValue({
      ownerId: 'user-001',
      ownerName: 'admin',
      delegateId: 'user-002',
      delegateName: 'manager',
      startAt: '2026-04-01 09:00:00',
      endAt: '2026-04-30 18:00:00',
      enabled: true,
      updatedAt: '2026-04-01 09:00:00',
    })

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[data-testid="delegation-disable-btn"]').trigger('click')
    await flushPromises()

    expect(disableApprovalDelegation).toHaveBeenCalledWith('user-001')
    expect(ElMessage.success).toHaveBeenCalled()
  })
})
