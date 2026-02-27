import { expect, test } from '@playwright/test'
import { LoginPage } from './LoginPage'
import { ApprovalDetailPage } from './ApprovalDetailPage'

test.describe('Approval Detail', () => {
  test('can navigate to approval detail page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'password')

    // 导航到审批详情页
    await page.goto('/approval/detail/1')
    
    // 验证页面标题
    await expect(page).toHaveURL(/approval\/detail/)
    
    // 验证审批详情页面应该显示审批标题
    // 注意：这里需要根据实际页面结构调整
  })

  test('should display approval status tag', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'password')

    await page.goto('/approval/detail/1')
    
    // 验证状态标签
    const statusTag = page.locator('text=待审批').first()
    await expect(statusTag).toBeVisible()
  })
})
