import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

type MockUser = 'admin' | 'manager'

interface LoginAsMockUserOptions {
  preserveRuntime?: boolean
}

async function loginFromForm(page: Page, account: MockUser): Promise<void> {
  await page.getByTestId('login-username').fill(account)
  await page.getByTestId('login-password').fill(account === 'admin' ? 'admin123' : 'manager123')
  await page.getByTestId('login-submit').click()
}

export async function loginAsMockUser(
  page: Page,
  account: MockUser = 'admin',
  options: LoginAsMockUserOptions = {},
) {
  if (options.preserveRuntime) {
    if (!/\/login(?:\?.*)?$/.test(page.url())) {
      const logoutButton = page.locator('.el-header .el-button--danger').first()
      if (await logoutButton.count())
        await logoutButton.click()
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    }

    await loginFromForm(page, account)
    await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/)
    await expect(page.locator('.el-header')).toBeVisible()
    return
  }

  await page.addInitScript(({ username }) => {
    const userMap = {
      admin: { id: 'user-001', name: 'admin' },
      manager: { id: 'user-002', name: 'manager' },
    } as const
    const user = userMap[username]
    localStorage.setItem('token', JSON.stringify('mock-token'))
    localStorage.setItem('userInfo', JSON.stringify(user))
  }, { username: account })

  await page.goto('/')
  await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/)
  await expect(page.locator('.el-header')).toBeVisible()
}
