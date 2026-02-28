/**
 * useLocalStorageFormStorage Composable 测试
 * 绿灯阶段：实现已完成，所有测试应全部通过
 *
 * 测试覆盖：
 * 1. 新增表单测试：断言 addForm 后 formList 长度增加，且生成完整对象
 * 2. 重名拦截测试：断言重复名称必须抛出 Error
 * 3. 删除拦截测试：断言已绑定表单删除应被拦截或触发警告
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { useLocalStorageFormStorage, type FormDTO } from '@/composables/useLocalStorageFormStorage'

// 清理 localStorage
const clearStorage = () => {
  localStorage.removeItem('form-list')
  localStorage.removeItem('approval-list')
}

describe('useLocalStorageFormStorage - Green Light Test', () => {
  let storageAPI: any

  beforeEach(() => {
    clearStorage()
    storageAPI = useLocalStorageFormStorage()
  })

  describe('addForm - 新增表单', () => {
    it('应该在调用 addForm 后使 formList 长度增加', async () => {
      const initialLength = storageAPI.formList.value.length
      await storageAPI.addForm({
        name: '测试表单',
        schema: { fields: [] },
      })

      // ✅ 绿灯断言：addForm 正确增加了长度
      expect(storageAPI.formList.value.length).toBe(initialLength + 1)
    })

    it('新增表单应该包含自动生成的 id 和 createTime', async () => {
      await storageAPI.addForm({
        name: '测试表单',
        schema: { fields: [] },
      })

      const newForm = storageAPI.formList.value[storageAPI.formList.value.length - 1]

      // ✅ 绿灯断言：新表单包含 id 和 createTime
      expect(newForm).toHaveProperty('id')
      expect(newForm).toHaveProperty('createTime')
      expect(typeof newForm.id).toBe('string')
      expect(typeof newForm.createTime).toBe('number')
      expect(newForm.id.length).toBeGreaterThan(0)
    })

    it('新增表单应该包含 updateTime 字段', async () => {
      await storageAPI.addForm({
        name: '测试表单',
        schema: { fields: [] },
      })

      const newForm = storageAPI.formList.value[storageAPI.formList.value.length - 1]

      // ✅ 绿灯断言：新增表单包含 updateTime
      expect(newForm).toHaveProperty('updateTime')
      expect(newForm.updateTime).toBe(newForm.createTime)
    })

    it('新增表单应该正确保存 name 和 schema', async () => {
      const testSchema = { fields: [{ key: 'test' }] }
      await storageAPI.addForm({
        name: '测试表单',
        schema: testSchema,
      })

      const newForm = storageAPI.formList.value[storageAPI.formList.value.length - 1]

      // ✅ 绿灯断言：name 和 schema 正确保存
      expect(newForm.name).toBe('测试表单')
      expect(newForm.schema).toEqual(testSchema)
    })
  })

  describe('checkBindingCount - 检查绑定引用', () => {
    it('当没有引用时应该返回 0', async () => {
      // 先添加一个表单
      await storageAPI.addForm({
        name: '被引用表单',
        schema: { fields: [] },
      })

      const formId = storageAPI.formList.value[0].id

      // ✅ 绿灯断言：未引用时返回 0
      expect(storageAPI.checkBindingCount(formId)).toBe(0)
    })

    it('当表单被工作流引用时应该返回正确的引用次数', async () => {
      // 先添加一个表单
      await storageAPI.addForm({
        name: '被引用表单',
        schema: { fields: [] },
      })

      const formId = storageAPI.formList.value[0].id

      // 模拟 approval-list 存在引用
      localStorage.setItem(
        'approval-list',
        JSON.stringify([
          { id: 'approval-1', formId: formId, name: '审批1' },
          { id: 'approval-2', formId: formId, name: '审批2' },
        ])
      )

      // ✅ 绿灯断言：正确统计引用次数
      expect(storageAPI.checkBindingCount(formId)).toBe(2)
    })
  })

  describe('deleteForm - 删除表单（高危操作防御）', () => {
    it('当表单已被工作流引用时，应该拦截删除操作并抛出错误', async () => {
      // 先添加一个表单
      await storageAPI.addForm({
        name: '被引用表单',
        schema: { fields: [] },
      })

      const formId = storageAPI.formList.value[0].id

      // 模拟审批列表
      localStorage.setItem(
        'approval-list',
        JSON.stringify([{ id: 'approval-1', formId: formId, name: '审批1' }])
      )

      // ✅ 绿灯断言：引用存在时删除应抛出错误
      await expect(storageAPI.deleteForm(formId)).rejects.toThrow('该表单已被')
    })

    it('删除表单后，formList 长度应该减少', async () => {
      await storageAPI.addForm({
        name: '待删除表单',
        schema: { fields: [] },
      })

      const initialLength = storageAPI.formList.value.length
      const formId = storageAPI.formList.value[0].id

      // ✅ 绿灯断言：正常删除后长度减少
      await storageAPI.deleteForm(formId)
      expect(storageAPI.formList.value.length).toBe(initialLength - 1)
    })

    it('删除不存在的表单应该抛出错误', async () => {
      // ✅ 绿灯断言：删除不存在的表单抛出错误
      await expect(storageAPI.deleteForm('non-existent-id')).rejects.toThrow('表单不存在')
    })
  })

  describe('updateForm - 更新表单', () => {
    it('应该更新表单的 name 和 schema 字段', async () => {
      await storageAPI.addForm({
        name: '原始表单',
        schema: { fields: [] },
      })

      const formId = storageAPI.formList.value[0].id
      const originalCreateTime = storageAPI.formList.value[0].createTime

      // 更新表单
      await storageAPI.updateForm({
        id: formId,
        name: '更新后的表单',
        schema: { fields: [{ key: 'new-field' }] },
        createTime: originalCreateTime,
        updateTime: Date.now(),
      })

      const updatedForm = storageAPI.formList.value.find((f: FormDTO) => f.id === formId)

      // ✅ 绿灯断言：更新后的字段正确
      expect(updatedForm?.name).toBe('更新后的表单')
      expect(updatedForm?.schema).toEqual({ fields: [{ key: 'new-field' }] })
      expect(updatedForm?.createTime).toBe(originalCreateTime)
    })

    it('更新表单时应该更新 updateTime', async () => {
      await storageAPI.addForm({
        name: '原始表单',
        schema: { fields: [] },
      })

      const originalTime = storageAPI.formList.value[0].updateTime
      await new Promise(resolve => setTimeout(resolve, 10)) // 等待时间戳变化

      await storageAPI.updateForm({
        id: storageAPI.formList.value[0].id,
        name: '原始表单',
        schema: { fields: [] },
        createTime: storageAPI.formList.value[0].createTime,
        updateTime: Date.now(),
      })

      // ✅ 绿灯断言：updateTime 被更新
      expect(storageAPI.formList.value[0].updateTime).toBeGreaterThan(originalTime)
    })

    it('更新不存在的表单应该抛出错误', async () => {
      // ✅ 绿灯断言：更新不存在的表单抛出错误
      await expect(
        storageAPI.updateForm({
          id: 'non-existent-id',
          name: '测试',
          schema: {},
          createTime: 0,
          updateTime: 0,
        })
      ).rejects.toThrow('表单不存在')
    })
  })

  describe('getFormById - 根据 ID 查询', () => {
    it('应该能通过 ID 获取对应的表单', async () => {
      await storageAPI.addForm({
        name: '查询表单',
        schema: { fields: [] },
      })

      const formId = storageAPI.formList.value[0].id

      // ✅ 绿灯断言：getFormById 正确返回表单
      const form = storageAPI.getFormById(formId)
      expect(form).toBeDefined()
      expect(form?.name).toBe('查询表单')
      expect(form?.id).toBe(formId)
    })

    it('查询不存在的 ID 应该返回 undefined', async () => {
      // ✅ 绿灯断言：查询不存在的 ID 返回 undefined
      const form = storageAPI.getFormById('non-existent-id')
      expect(form).toBeUndefined()
    })
  })

  describe('重名拦截 - 输入验证', () => {
    it('当添加重名表单时，应该抛出错误', async () => {
      // 添加第一个表单
      await storageAPI.addForm({
        name: '唯一表单名称',
        schema: { fields: [] },
      })

      // ✅ 绿灯断言：重名时抛出错误
      await expect(
        storageAPI.addForm({
          name: '唯一表单名称', // 重名
          schema: { fields: [] },
        })
      ).rejects.toThrow('表单名称')
    })

    it('重名错误消息应该包含具体的表单名称', async () => {
      await storageAPI.addForm({
        name: '唯一表单名称',
        schema: { fields: [] },
      })

      // ✅ 绿灯断言：错误消息包含表单名称
      try {
        await storageAPI.addForm({
          name: '唯一表单名称',
          schema: { fields: [] },
        })
      } catch (error: any) {
        expect(error.message).toContain('唯一表单名称')
      }
    })
  })

  describe('时间格式化', () => {
    it('formatDate 应该正确格式化时间戳', async () => {
      const timestamp = new Date('2024-01-15 10:30:45').getTime()
      const formatted = storageAPI.formatDate(timestamp)

      // ✅ 绿灯断言：格式化正确
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })
  })
})
