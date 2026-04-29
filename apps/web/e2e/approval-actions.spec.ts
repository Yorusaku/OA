import { expect, test, type Locator, type Page } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

const PENDING_APPROVAL_ID = 'APPROVE-20260228-001'

async function openApprovalDetail(page: Page, id = PENDING_APPROVAL_ID): Promise<void> {
  await loginAsMockUser(page)
  await page.goto(`/approval/detail/${id}`)
  await expect(page.locator('.approval-detail')).toBeVisible()
  await expect(page.locator('.action-buttons')).toBeVisible()
}

function currentDialog(page: Page): Locator {
  return page.locator('.el-message-box:visible').last()
}

async function confirmDialog(page: Page): Promise<void> {
  const dialog = currentDialog(page)
  await expect(dialog).toBeVisible()
  await dialog.locator('.el-message-box__btns .el-button--primary').click()
}

async function fillPromptAndConfirm(page: Page, value: string): Promise<void> {
  const dialog = currentDialog(page)
  await expect(dialog).toBeVisible()
  await dialog.locator('.el-message-box__input input').fill(value)
  await dialog.locator('.el-message-box__btns .el-button--primary').click()
}

async function expectSuccessToast(page: Page, text: string): Promise<void> {
  const toast = page.locator('.el-message--success .el-message__content').last()
  await expect(toast).toBeVisible()
  await expect(toast).toContainText(text)
}

test.describe('Approval Detail Actions', () => {
  test('转交动作应成功并结束当前审批动作入口', async ({ page }) => {
    await openApprovalDetail(page)

    await page.locator('.transfer-btn').click()
    await fillPromptAndConfirm(page, 'user-e2e-transfer')

    await expectSuccessToast(page, '审批转交成功')
    await expect(page.locator('.approve-btn')).toHaveCount(0)
  })

  test('加签动作应成功并保持审批可处理状态', async ({ page }) => {
    await openApprovalDetail(page)

    await page.locator('.addsign-btn').click()
    await fillPromptAndConfirm(page, 'user-e2e-addsign')

    await expectSuccessToast(page, '加签成功')
    await expect(page.locator('.approve-btn')).toBeVisible()
  })

  test('催办动作应成功并保持审批可处理状态', async ({ page }) => {
    await openApprovalDetail(page)

    await page.locator('.remind-btn').click()

    await expectSuccessToast(page, '催办提醒已发送')
    await expect(page.locator('.approve-btn')).toBeVisible()
  })

  test('撤回动作应成功并结束当前审批动作入口', async ({ page }) => {
    await openApprovalDetail(page)

    await page.locator('.withdraw-btn').click()
    await confirmDialog(page)

    await expectSuccessToast(page, '审批撤回成功')
    await expect(page.locator('.approve-btn')).toHaveCount(0)
  })

  test('取消动作应成功并结束当前审批动作入口', async ({ page }) => {
    await openApprovalDetail(page)

    await page.locator('.cancel-btn').click()
    await confirmDialog(page)

    await expectSuccessToast(page, '审批取消成功')
    await expect(page.locator('.approve-btn')).toHaveCount(0)
  })
})
