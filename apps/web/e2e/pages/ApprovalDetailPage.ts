import { expect, Page } from '@playwright/test'

export class ApprovalDetailPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(approvalId: string = '1') {
    await this.page.goto(`/approval/detail/${approvalId}`)
  }

  async getApplicant() {
    return this.page.locator('text=申请人：').first()
  }

  async getStatusTag() {
    return this.page.locator('text=待审批').first()
  }

  async getForm() {
    return this.page.locator('.approval-detail').first()
  }

  async clickApproveButton() {
    await this.page.locator('button.approve-btn').click()
  }

  async clickRejectButton() {
    await this.page.locator('button.reject-btn').click()
  }
}
