import { expect, test, type Locator, type Page } from '@playwright/test'
import { loginAsMockUser } from './utils/auth'

async function openApprovalDetail(page: Page, id: string): Promise<void> {
  await page.goto(`/approval/detail/${id}`)
  await expect(page.locator('.approval-detail')).toBeVisible()
}

async function openApprovalDetailInRuntime(page: Page, id: string): Promise<void> {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, `/approval/detail/${id}`)
  await expect(page.locator('.approval-detail')).toBeVisible()
}

async function openTodoInRuntime(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.history.pushState({}, '', '/approval/todo')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.locator('.approval-todo')).toBeVisible()
}

async function confirmDialog(page: Page): Promise<void> {
  const dialog = page.locator('.el-message-box:visible').last()
  await expect(dialog).toBeVisible()
  await dialog.locator('.el-message-box__btns .el-button--primary').click()
}

async function fillReadonlyCombobox(page: Page, input: Locator): Promise<void> {
  await input.click({ force: true })
  await page.locator('.el-select-dropdown:visible, .el-picker-panel:visible').first().waitFor({ state: 'visible', timeout: 800 }).catch(() => {})

  const selectOption = page.locator('.el-select-dropdown:visible .el-select-dropdown__item:not(.is-disabled)').first()
  if (await selectOption.count()) {
    await selectOption.click()
    return
  }

  const availableDate = page.locator('.el-picker-panel:visible td.available:not(.disabled)').first()
  if (await availableDate.count()) {
    await availableDate.click()
    return
  }

  await input.press('ArrowDown')
  await input.press('Enter')
}

async function fillDetailForm(page: Page): Promise<void> {
  const form = page.locator('.dynamic-form')
  await expect(form).toBeVisible()

  const textboxes = form.getByRole('textbox')
  const textboxCount = await textboxes.count()
  if (textboxCount > 0) {
    await textboxes.nth(0).fill('会签流程演示')
    if (textboxCount > 1)
      await textboxes.nth(1).fill('审批协同演示数据')
  }

  const spinboxes = form.getByRole('spinbutton')
  if (await spinboxes.count() > 0)
    await spinboxes.first().fill('5600')

  const combos = form.getByRole('combobox')
  if (await combos.count() > 0) {
    const comboCount = await combos.count()
    for (let index = 0; index < comboCount; index += 1) {
      const combobox = combos.nth(index)
      const isReadonly = await combobox.evaluate(node =>
        node.hasAttribute('readonly') || (node as HTMLInputElement).readOnly,
      )

      if (isReadonly) {
        await fillReadonlyCombobox(page, combobox)
        continue
      }

      await combobox.fill('2026-05-01')
      await combobox.press('Tab')
    }
  }
}

async function approveFromDetail(page: Page): Promise<void> {
  await fillDetailForm(page)
  await page.locator('.approve-btn').click()
  await confirmDialog(page)
  await expect(page.locator('.el-message--success .el-message__content').last()).toBeVisible()
}

test.describe('Approval Collaboration', () => {
  test.describe.configure({ mode: 'serial' })

  test('会签：admin 处理后保持 1/2，manager 处理后完成', async ({ page }) => {
    await loginAsMockUser(page, 'admin')
    await openApprovalDetail(page, 'APPROVE-20260228-001')

    await expect(page.locator('.info-grid')).toContainText('审批策略：会签')
    await approveFromDetail(page)
    await expect(page.locator('.info-grid')).toContainText('节点进度：1/2')

    await loginAsMockUser(page, 'manager', { preserveRuntime: true })
    await openApprovalDetailInRuntime(page, 'APPROVE-20260228-001')
    await expect(page.locator('.approve-btn')).toBeVisible()

    await approveFromDetail(page)
    await expect(page.locator('.info-grid')).toContainText('节点进度：2/2')
    await expect(page.locator('.approve-btn')).toHaveCount(0)
  })

  test('或签：admin 通过后 manager 待办中不再出现该单', async ({ page }) => {
    await loginAsMockUser(page, 'admin')
    await openApprovalDetail(page, 'APPROVE-20260228-002')
    await approveFromDetail(page)

    await loginAsMockUser(page, 'manager', { preserveRuntime: true })
    await openTodoInRuntime(page)
    await expect(page.locator('.approval-todo .el-table__body-wrapper')).toContainText('APPROVE-20260228-001')
    await expect(page.locator('.approval-todo .el-table__body-wrapper')).not.toContainText('APPROVE-20260228-002')
  })
})
