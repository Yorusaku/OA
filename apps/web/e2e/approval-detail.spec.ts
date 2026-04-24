import { expect, test } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

test.describe('Approval Detail', () => {
  test('审批详情页渲染动态表单和操作按钮', async ({ page }) => {
    await loginAsMockUser(page)

    await page.goto('/approval/detail/APPROVE-20260228-001')
    await expect(page).toHaveURL(/\/approval\/detail\/APPROVE-20260228-001$/)

    await expect(page.locator('.approval-detail')).toBeVisible()
    await expect(page.locator('.dynamic-form')).toBeVisible()
    await expect(page.locator('.approve-btn')).toBeVisible()
    await expect(page.locator('.reject-btn')).toBeVisible()
  })
})
