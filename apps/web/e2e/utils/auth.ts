import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function loginAsMockUser(page: Page) {
  await page.goto('/login')

  const textInputs = page.locator('input[type="text"]')
  await textInputs.first().fill('admin')
  await page.locator('input[type="password"]').fill('admin123')
  await page.locator('button.el-button').first().click()

  await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/)
  await expect(page.locator('.el-header')).toBeVisible()
}
