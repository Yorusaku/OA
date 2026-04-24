import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * WorkflowEditorPage - 工作流编辑器页面对象
 */
export class WorkflowEditorPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到工作流编辑器
   */
  async goto(workflowId?: string) {
    const path = workflowId ? `/workflow/editor/${workflowId}` : '/workflow/editor'
    await super.goto(path)
    await this.waitForLoad()
  }

  /**
   * 等待画布加载完成
   */
  async waitForCanvas() {
    await this.page.waitForSelector('.lf-canvas', { state: 'visible' })
  }

  /**
   * 从左侧面板拖拽节点到画布
   */
  async dragNodeToCanvas(nodeType: string, x: number, y: number) {
    const node = this.page.locator(`.node-item:has-text("${nodeType}")`)
    const canvas = this.page.locator('.lf-canvas')

    await node.dragTo(canvas, {
      targetPosition: { x, y }
    })
  }

  /**
   * 点击画布上的节点
   */
  async clickNode(nodeText: string) {
    await this.page.locator(`.lf-node:has-text("${nodeText}")`).click()
  }

  /**
   * 配置审批节点
   */
  async configureApprovalNode(config: {
    name?: string
    approvers?: string[]
    approvalType?: 'sequential' | 'parallel' | 'any'
  }) {
    if (config.name) {
      await this.fill('input[placeholder*="节点名称"]', config.name)
    }

    if (config.approvers) {
      await this.page.locator('.el-select[placeholder*="审批人"]').click()
      for (const approver of config.approvers) {
        await this.page.getByText(approver).click()
      }
      await this.page.keyboard.press('Escape')
    }

    if (config.approvalType) {
      await this.page.locator('.el-radio-group').getByText(config.approvalType).click()
    }
  }

  /**
   * 连接两个节点
   */
  async connectNodes(fromNode: string, toNode: string) {
    const from = this.page.locator(`.lf-node:has-text("${fromNode}")`)
    const to = this.page.locator(`.lf-node:has-text("${toNode}")`)

    // 从源节点的锚点拖拽到目标节点
    await from.locator('.lf-anchor').first().dragTo(to)
  }

  /**
   * 删除节点
   */
  async deleteNode(nodeText: string) {
    await this.clickNode(nodeText)
    await this.page.keyboard.press('Delete')
  }

  /**
   * 保存工作流
   */
  async save() {
    await this.clickButton('保存')
    await this.waitForMessage('success')
  }

  /**
   * 发布工作流
   */
  async publish() {
    await this.clickButton('发布')
    await this.page.locator('.el-dialog').getByRole('button', { name: '确定' }).click()
    await this.waitForMessage('success')
  }

  /**
   * 验证工作流
   */
  async validate(): Promise<boolean> {
    await this.clickButton('验证')
    const message = await this.getMessageText()
    return message.includes('验证通过')
  }

  /**
   * 获取画布上的节点数量
   */
  async getNodeCount(): Promise<number> {
    return await this.page.locator('.lf-node').count()
  }

  /**
   * 获取画布上的连线数量
   */
  async getEdgeCount(): Promise<number> {
    return await this.page.locator('.lf-edge').count()
  }
}

/**
 * FormDesignerPage - 表单设计器页面对象
 */
export class FormDesignerPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到表单设计器
   */
  async goto(formId?: string) {
    const path = formId ? `/form/designer/${formId}` : '/form/designer'
    await super.goto(path)
    await this.waitForLoad()
  }

  /**
   * 从左侧面板拖拽字段到画布
   */
  async dragFieldToCanvas(fieldType: string) {
    const field = this.page.locator(`.field-item:has-text("${fieldType}")`)
    const canvas = this.page.locator('.form-canvas')

    await field.dragTo(canvas)
  }

  /**
   * 点击画布上的字段
   */
  async clickField(fieldLabel: string) {
    await this.page.locator(`.form-field:has-text("${fieldLabel}")`).click()
  }

  /**
   * 配置字段属性
   */
  async configureField(config: {
    label?: string
    placeholder?: string
    required?: boolean
    defaultValue?: string
  }) {
    if (config.label) {
      await this.fill('input[placeholder*="字段标签"]', config.label)
    }

    if (config.placeholder) {
      await this.fill('input[placeholder*="占位符"]', config.placeholder)
    }

    if (config.required !== undefined) {
      const checkbox = this.page.locator('.el-checkbox:has-text("必填")')
      const isChecked = await checkbox.locator('input').isChecked()
      if (isChecked !== config.required) {
        await checkbox.click()
      }
    }

    if (config.defaultValue) {
      await this.fill('input[placeholder*="默认值"]', config.defaultValue)
    }
  }

  /**
   * 删除字段
   */
  async deleteField(fieldLabel: string) {
    await this.clickField(fieldLabel)
    await this.page.keyboard.press('Delete')
  }

  /**
   * 保存表单
   */
  async save() {
    await this.clickButton('保存')
    await this.waitForMessage('success')
  }

  /**
   * 预览表单
   */
  async preview() {
    await this.clickButton('预览')
    await this.page.waitForSelector('.el-dialog', { state: 'visible' })
  }

  /**
   * 获取画布上的字段数量
   */
  async getFieldCount(): Promise<number> {
    return await this.page.locator('.form-field').count()
  }
}
