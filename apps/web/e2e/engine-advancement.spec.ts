import { expect, test, type Page } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

async function confirmCurrentMessageBox(page: Page): Promise<void> {
  const dialog = page.locator('.el-message-box:visible').last()
  await expect(dialog).toBeVisible()
  await dialog.locator('.el-message-box__btns .el-button--primary').click()
}

async function expectSuccessToast(page: Page): Promise<void> {
  const toast = page.locator('.el-message--success .el-message__content').last()
  await expect(toast).toBeVisible()
}

async function fillPurchaseForm(form: ReturnType<Page['locator']>, budget: number): Promise<void> {
  const textboxes = form.getByRole('textbox')
  await textboxes.nth(0).fill(`引擎 E2E 项目 ${budget}`)
  await textboxes.nth(1).fill('显示器、键盘')
  await form.getByRole('spinbutton').first().fill(String(budget))

  const dateInput = form.getByRole('combobox').first()
  await dateInput.fill('2026-12-31')
  await dateInput.press('Tab')
}

async function launchPurchaseApproval(page: Page, budget: number): Promise<void> {
  await expect(page.locator('.approval-launch')).toBeVisible()

  // 当前 mock 流程列表按请假、报销、采购稳定排序；避免将 E2E 绑定到页面文案编码。
  await page.locator('.workflow-card').nth(2).click()
  const form = page.locator('.dynamic-form')
  await expect(form).toBeVisible()
  await fillPurchaseForm(form, budget)

  await page.locator('.submit-btn').click()
  await confirmCurrentMessageBox(page)
  await expectSuccessToast(page)
  await expect(page).toHaveURL(/\/approval\/mine$/)
}

async function navigateApprovalMenu(page: Page, itemIndex: number, expectedPath: RegExp): Promise<void> {
  await page.locator('.el-sub-menu .el-menu-item').nth(itemIndex).click()
  await expect(page).toHaveURL(expectedPath)
}

async function openLatestApplication(page: Page): Promise<void> {
  const firstRow = page.locator('.el-table__body tbody tr').first()
  await expect(firstRow).toBeVisible()
  await firstRow.getByRole('button', { name: '查看详情' }).click()
  await expect(page).toHaveURL(/\/approval\/detail\/.+$/)
  await expect(page.locator('.approval-detail')).toBeVisible()
}

async function openFirstTodoApproval(page: Page): Promise<void> {
  const firstRow = page.locator('.el-table__body tbody tr').first()
  await expect(firstRow).toBeVisible()
  await firstRow.locator('.el-button').click()
  await expect(page).toHaveURL(/\/approval\/detail\/.+$/)
  await expect(page.locator('.approval-detail')).toBeVisible()
}

test.describe('Workflow Engine Advancement', () => {
  test('采购预算条件应路由到相应节点，并允许财务节点推进至结束', async ({ page }) => {
    await loginAsMockUser(page)
    await page.goto('/approval/launch')

    await launchPurchaseApproval(page, 10000)
    await openLatestApplication(page)
    await expect(page.locator('.workflow-runtime-chart')).toBeVisible()
    await expect(page.locator('.approve-btn')).toHaveCount(0)

    await navigateApprovalMenu(page, 0, /\/approval\/launch$/)
    await launchPurchaseApproval(page, 5000)
    await navigateApprovalMenu(page, 2, /\/approval\/todo$/)
    await openFirstTodoApproval(page)
    await expect(page.locator('.workflow-runtime-chart')).toBeVisible()
    await expect(page.locator('.approve-btn')).toBeVisible()

    await fillPurchaseForm(page.locator('.dynamic-form'), 5000)
    await page.locator('.approve-btn').click()
    await confirmCurrentMessageBox(page)
    await expectSuccessToast(page)
    await expect(page.locator('.approve-btn')).toHaveCount(0)
  })

  test('待办批量通过应提交处理结果并清空选中态', async ({ page }) => {
    await loginAsMockUser(page)
    await page.goto('/approval/launch')
    await launchPurchaseApproval(page, 5000)
    await navigateApprovalMenu(page, 0, /\/approval\/launch$/)
    await launchPurchaseApproval(page, 5000)
    await navigateApprovalMenu(page, 2, /\/approval\/todo$/)

    await expect(page.locator('.approval-todo')).toBeVisible()
    const rows = page.locator('.el-table__body tbody tr')
    await expect(rows.nth(1)).toBeVisible()

    await rows.nth(0).locator('.el-checkbox').click()
    await rows.nth(1).locator('.el-checkbox').click()
    await page.locator('.approval-todo > .mb-6').first().locator('.el-button--primary').click()
    await expectSuccessToast(page)
    await expect(page.locator('.approval-todo > .mb-6').first().locator('.el-button--primary')).toBeDisabled()
  })
})
