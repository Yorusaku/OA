import { expect, test, type Page } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

async function loginByForm(page: Page, account: 'admin' | 'manager') {
  await page.goto('/login')
  await page.getByTestId('login-username').fill(account)
  await page.getByTestId('login-password').fill(account === 'admin' ? 'admin123' : 'manager123')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/)
}

test.describe('Approval Delegation & SLA Automation', () => {
  test.describe.configure({ mode: 'serial' })

  test('admin 配置代理后，待办由 manager 接管', async ({ page }) => {
    await loginByForm(page, 'admin')
    await page.goto('/system/approval-delegation')
    await expect(page.locator('main').getByText('代理审批设置')).toBeVisible()

    await page.locator('[data-testid="delegation-delegate-select"]').click()
    await page.getByText('manager (user-002)').click()
    await page.locator('[data-testid="delegation-start-at"]').fill('2026-01-01 00:00:00')
    await page.locator('[data-testid="delegation-end-at"]').fill('2026-12-31 23:59:59')
    await page.locator('[data-testid="delegation-save-btn"]').click()

    await loginAsMockUser(page, 'manager', { preserveRuntime: true })
    await page.goto('/approval/todo')
    await expect(page.locator('.approval-todo .el-table__body-wrapper')).toContainText('APPROVE-20260228-001')
  })

  test('SLA 超时单据自动升级并显示无权限处理', async ({ page }) => {
    await loginByForm(page, 'admin')
    await page.goto('/approval/detail/APPROVE-20260115-ESC001')

    await expect(page.locator('.approval-detail')).toBeVisible()
    await expect(page.locator('.approval-detail')).toContainText('SLA: 已升级')
    await expect(page.locator('.info-grid')).toContainText('升级摘要')
    await expect(page.locator('.approve-btn')).toHaveCount(0)
    await expect(page.locator('.approval-detail')).toContainText('manager')
  })
})
