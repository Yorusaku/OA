import { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly welcomeMessage: Locator
  readonly menuItems: Locator
  readonly approvalMenuItem: Locator
  readonly workbenchMenuItem: Locator

  constructor(page: Page) {
    this.page = page
    this.welcomeMessage = page.getByRole('heading', { name: /工作台|Dashboard/ })
    this.menuItems = page.getByRole('navigation').locator('a')
    this.approvalMenuItem = page.getByText(/发起审批|Approval Launch/).first()
    this.workbenchMenuItem = page.getByText(/工作台|Workbench/).first()
  }

  async goto() {
    await this.page.goto('/dashboard')
  }

  async goToApprovalLaunch() {
    await this.approvalMenuItem.click()
  }

  async goToWorkbench() {
    await this.workbenchMenuItem.click()
  }
}
