import { expect, test, type Page } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

const PENDING_APPROVAL_ID = 'APPROVE-20260228-001'

async function openApprovalDetail(page: Page, id = PENDING_APPROVAL_ID): Promise<void> {
  await loginAsMockUser(page)
  await page.goto(`/approval/detail/${id}`)
  await expect(page.locator('.approval-detail')).toBeVisible()
  await expect(page.locator('.approve-btn')).toBeVisible()
}

async function fillDetailForm(page: Page): Promise<void> {
  const form = page.locator('.dynamic-form')
  await expect(form).toBeVisible()

  const textboxes = form.getByRole('textbox')
  await textboxes.nth(0).fill('E2E 采购项目')
  await textboxes.nth(1).fill('显示器, 键盘, 鼠标')

  await form.getByRole('spinbutton').first().fill('5600')

  const dateInput = form.getByRole('combobox').first()
  await dateInput.fill('2026-05-01')
  await dateInput.press('Tab')
}

async function confirmCurrentMessageBox(page: Page): Promise<void> {
  const dialog = page.locator('.el-message-box:visible').last()
  await expect(dialog).toBeVisible()
  await dialog.locator('.el-message-box__btns .el-button--primary').click()
}

async function expectSuccessToast(page: Page, text: string): Promise<void> {
  const toast = page.locator('.el-message--success .el-message__content').last()
  await expect(toast).toBeVisible()
  await expect(toast).toContainText(text)
}

test.describe('Approval Detail Process', () => {
  test('详情页同意应完成审批并退出可处理态', async ({ page }) => {
    await openApprovalDetail(page)
    await fillDetailForm(page)

    await page.locator('.approve-btn').click()
    await confirmCurrentMessageBox(page)

    await expectSuccessToast(page, '审批通过成功')
    await expect(page.locator('.approve-btn')).toHaveCount(0)
  })

  test('详情页驳回应完成审批并退出可处理态', async ({ page }) => {
    await openApprovalDetail(page)
    await fillDetailForm(page)

    await page.locator('.reject-btn').click()
    await confirmCurrentMessageBox(page)

    await expectSuccessToast(page, '审批驳回成功')
    await expect(page.locator('.reject-btn')).toHaveCount(0)
  })
})
