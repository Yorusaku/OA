import type { Page, Locator } from '@playwright/test'

/**
 * BasePage - Page Object Model 基类
 * 提供通用的页面操作方法
 */
export class BasePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * 导航到指定路径
   */
  async goto(path: string) {
    await this.page.goto(path)
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * 等待元素可见
   */
  async waitForVisible(selector: string) {
    await this.page.waitForSelector(selector, { state: 'visible' })
  }

  /**
   * 等待元素隐藏
   */
  async waitForHidden(selector: string) {
    await this.page.waitForSelector(selector, { state: 'hidden' })
  }

  /**
   * 点击元素
   */
  async click(selector: string) {
    await this.page.click(selector)
  }

  /**
   * 填写输入框
   */
  async fill(selector: string, value: string) {
    await this.page.fill(selector, value)
  }

  /**
   * 获取文本内容
   */
  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || ''
  }

  /**
   * 检查元素是否可见
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector)
  }

  /**
   * 等待并点击按钮（通过文本）
   */
  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click()
  }

  /**
   * 等待 Element Plus 消息提示
   */
  async waitForMessage(type: 'success' | 'error' | 'warning' | 'info' = 'success') {
    await this.page.waitForSelector(`.el-message--${type}`, { state: 'visible' })
  }

  /**
   * 获取 Element Plus 消息内容
   */
  async getMessageText(): Promise<string> {
    const message = this.page.locator('.el-message__content').first()
    return await message.textContent() || ''
  }

  /**
   * 等待 Element Plus 加载完成
   */
  async waitForElLoading() {
    await this.page.waitForSelector('.el-loading-mask', { state: 'hidden' })
  }

  /**
   * 截图（用于调试）
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
  }

  /**
   * 等待导航完成
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * 获取当前 URL
   */
  getCurrentUrl(): string {
    return this.page.url()
  }

  /**
   * 检查是否在指定路径
   */
  isAtPath(path: string): boolean {
    return this.getCurrentUrl().includes(path)
  }
}
