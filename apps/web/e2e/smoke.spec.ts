import { expect, test } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

test.describe('Smoke: 核心链路', () => {
  test('审批发起页可加载流程卡片并渲染动态表单', async ({ page }) => {
    await loginAsMockUser(page)

    await page.goto('/approval/launch')
    await expect(page.locator('.approval-launch')).toBeVisible()

    const firstWorkflowCard = page.locator('.workflow-card').first()
    await expect(firstWorkflowCard).toBeVisible()
    await firstWorkflowCard.click()

    await expect(page.locator('.dynamic-form')).toBeVisible()
    await expect(page.locator('.submit-btn')).toBeVisible()
  })

  test('动态表单演示页可正常渲染', async ({ page }) => {
    await loginAsMockUser(page)

    await page.goto('/demo/dynamic-form-linkage')
    await expect(page.locator('.linkage-demo')).toBeVisible()
    await expect(page.locator('.dynamic-form')).toBeVisible()
  })

  test('流程编辑器可加载画布', async ({ page }) => {
    await loginAsMockUser(page)

    await page.goto('/workflow/editor/wf-001')
    await expect(page.locator('.workflow-canvas')).toBeVisible()
    await expect(page.locator('.h-screen.flex.flex-col.overflow-hidden.bg-gray-50')).toBeVisible()
    await expect(page.locator('.bg-white.border-r.border-gray-200.flex.flex-col.w-60')).toBeVisible()
  })
})
