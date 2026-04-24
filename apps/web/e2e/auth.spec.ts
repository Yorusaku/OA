import { expect, test } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

test.describe('Authentication', () => {
  test('未登录访问受保护路由会跳回登录页', async ({ page }) => {
    await page.goto('/approval/launch')
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
  })

  test('登录后进入工作区并可访问审批页面', async ({ page }) => {
    await loginAsMockUser(page)

    await page.goto('/approval/launch')
    await expect(page).toHaveURL(/\/approval\/launch$/)
    await expect(page.locator('.approval-launch')).toBeVisible()
  })
})
