import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * LoginPage - 登录页面对象
 */
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到登录页
   */
  async goto() {
    await super.goto('/login')
  }

  /**
   * 执行登录
   */
  async login(username: string, password: string) {
    await this.fill('input[placeholder*="用户名"]', username)
    await this.fill('input[placeholder*="密码"]', password)
    await this.clickButton('登录')
    await this.waitForNavigation()
  }

  /**
   * 快速登录（使用默认测试账号）
   */
  async quickLogin() {
    await this.login('admin', 'admin123')
  }
}

/**
 * ApprovalListPage - 审批列表页面对象
 */
export class ApprovalListPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到待我审批页面
   */
  async gotoTodo() {
    await super.goto('/approval/todo')
    await this.waitForLoad()
  }

  /**
   * 导航到我发起的页面
   */
  async gotoMine() {
    await super.goto('/approval/mine')
    await this.waitForLoad()
  }

  /**
   * 导航到抄送我的页面
   */
  async gotoCC() {
    await super.goto('/approval/cc')
    await this.waitForLoad()
  }

  /**
   * 搜索审批
   */
  async search(keyword: string) {
    await this.fill('input[placeholder*="搜索"]', keyword)
    await this.page.keyboard.press('Enter')
    await this.waitForLoad()
  }

  /**
   * 点击第一条审批记录
   */
  async clickFirstRecord() {
    await this.page.locator('.el-table__row').first().click()
    await this.waitForNavigation()
  }

  /**
   * 获取审批记录数量
   */
  async getRecordCount(): Promise<number> {
    const rows = await this.page.locator('.el-table__row').count()
    return rows
  }

  /**
   * 批量选择审批
   */
  async selectRecords(count: number) {
    for (let i = 0; i < count; i++) {
      await this.page.locator('.el-table__row').nth(i).locator('.el-checkbox').click()
    }
  }

  /**
   * 批量通过
   */
  async batchApprove() {
    await this.clickButton('批量通过')
    await this.waitForMessage('success')
  }

  /**
   * 批量驳回
   */
  async batchReject() {
    await this.clickButton('批量驳回')
    await this.waitForMessage('success')
  }
}

/**
 * ApprovalDetailPage - 审批详情页面对象
 */
export class ApprovalDetailPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到审批详情页
   */
  async goto(id: string) {
    await super.goto(`/approval/detail/${id}`)
    await this.waitForLoad()
  }

  /**
   * 通过审批
   */
  async approve(comment?: string) {
    await this.clickButton('通过')

    if (comment) {
      await this.fill('textarea[placeholder*="审批意见"]', comment)
    }

    await this.page.locator('.el-dialog').getByRole('button', { name: '确定' }).click()
    await this.waitForMessage('success')
  }

  /**
   * 驳回审批
   */
  async reject(reason: string) {
    await this.clickButton('驳回')
    await this.fill('textarea[placeholder*="驳回原因"]', reason)
    await this.page.locator('.el-dialog').getByRole('button', { name: '确定' }).click()
    await this.waitForMessage('success')
  }

  /**
   * 转交审批
   */
  async transfer(userId: string, comment?: string) {
    await this.clickButton('转交')

    // 选择转交人
    await this.page.locator('.el-select').click()
    await this.page.getByText(userId).click()

    if (comment) {
      await this.fill('textarea[placeholder*="转交说明"]', comment)
    }

    await this.page.locator('.el-dialog').getByRole('button', { name: '确定' }).click()
    await this.waitForMessage('success')
  }

  /**
   * 添加评论
   */
  async addComment(content: string) {
    await this.fill('textarea[placeholder*="添加评论"]', content)
    await this.clickButton('发送')
    await this.waitForMessage('success')
  }

  /**
   * 获取审批状态
   */
  async getStatus(): Promise<string> {
    const statusTag = this.page.locator('.el-tag').first()
    return await statusTag.textContent() || ''
  }

  /**
   * 获取表单字段值
   */
  async getFieldValue(label: string): Promise<string> {
    const field = this.page.locator(`.el-form-item__label:has-text("${label}")`).locator('..').locator('.el-form-item__content')
    return await field.textContent() || ''
  }
}

/**
 * ApprovalLaunchPage - 发起审批页面对象
 */
export class ApprovalLaunchPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到发起审批页
   */
  async goto() {
    await super.goto('/approval/launch')
    await this.waitForLoad()
  }

  /**
   * 选择审批类型
   */
  async selectType(typeName: string) {
    await this.page.getByText(typeName).click()
    await this.waitForNavigation()
  }

  /**
   * 填写表单字段
   */
  async fillField(label: string, value: string) {
    const field = this.page.locator(`.el-form-item__label:has-text("${label}")`).locator('..').locator('input, textarea').first()
    await field.fill(value)
  }

  /**
   * 选择下拉框选项
   */
  async selectOption(label: string, optionText: string) {
    const formItem = this.page.locator(`.el-form-item__label:has-text("${label}")`).locator('..')
    await formItem.locator('.el-select').click()
    await this.page.getByText(optionText).click()
  }

  /**
   * 选择日期
   */
  async selectDate(label: string, date: string) {
    const formItem = this.page.locator(`.el-form-item__label:has-text("${label}")`).locator('..')
    await formItem.locator('.el-date-editor').click()
    await this.page.locator(`.el-date-picker__header-label:has-text("${date}")`).click()
  }

  /**
   * 提交审批
   */
  async submit() {
    await this.clickButton('提交')
    await this.waitForMessage('success')
  }

  /**
   * 保存草稿
   */
  async saveDraft() {
    await this.clickButton('保存草稿')
    await this.waitForMessage('success')
  }
}
