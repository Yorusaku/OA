import { expect, test, type Page } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

async function openTodoPage(page: Page): Promise<void> {
  await loginAsMockUser(page)
  await page.goto('/approval/todo')
  await expect(page.locator('.approval-todo')).toBeVisible()
  await expect(page.locator('.el-table__body tbody tr').first()).toBeVisible()
}

async function selectFirstRow(page: Page): Promise<void> {
  const firstRow = page.locator('.el-table__body tbody tr').first()
  await firstRow.locator('.el-checkbox').click()
}

async function expectSuccessToast(page: Page, text: string): Promise<void> {
  const toast = page.locator('.el-message--success .el-message__content').last()
  await expect(toast).toBeVisible()
  await expect(toast).toContainText(text)
}

test.describe('Approval Todo Actions', () => {
  test('批量通过应处理成功', async ({ page }) => {
    await openTodoPage(page)
    await selectFirstRow(page)

    await page.getByRole('button', { name: /^批量通过/ }).click()

    await expectSuccessToast(page, '成功通过')
  })

  test('批量驳回应处理成功', async ({ page }) => {
    await openTodoPage(page)
    await selectFirstRow(page)

    await page.locator('.approval-todo .mb-6 .el-button--danger').click()

    await expectSuccessToast(page, '成功驳回')
  })
})
