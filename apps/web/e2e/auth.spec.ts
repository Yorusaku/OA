import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'

test.describe('Authentication', () => {
  test('successful login', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'password')

    await expect(page).toHaveURL(/dashboard|workbench/)
  })

  test('shows error on invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('wrong', 'wrong')

    const error = await loginPage.getErrorMessage()
    expect(error).toBeTruthy()
  })
})

test.describe('Navigation', () => {
  test('can navigate to approval launch', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'password')

    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goToApprovalLaunch()

    await expect(page).toHaveURL(/approval/)
  })

  test('can navigate to workbench', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('admin', 'password')

    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goToWorkbench()

    await expect(page).toHaveURL(/workbench|dashboard/)
  })
})
