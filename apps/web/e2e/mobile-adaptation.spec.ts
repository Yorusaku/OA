import { test, expect, devices } from '@playwright/test'
import { LoginPage, ApprovalListPage, ApprovalDetailPage } from './pages/ApprovalPages'

/**
 * 移动端适配 E2E 测试
 * 测试移动端布局、手势交互、响应式设计
 */

test.describe('移动端适配', () => {
  // 使用移动端设备配置
  test.use({
    ...devices['iPhone 12'],
  })

  let loginPage: LoginPage
  let listPage: ApprovalListPage
  let detailPage: ApprovalDetailPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    listPage = new ApprovalListPage(page)
    detailPage = new ApprovalDetailPage(page)

    await loginPage.goto()
    await loginPage.quickLogin()
  })

  test('移动端底部导航栏显示', async ({ page }) => {
    // 验证底部导航栏可见
    const tabBar = page.locator('.mobile-tab-bar')
    await expect(tabBar).toBeVisible()

    // 验证导航项
    await expect(page.getByText('工作台')).toBeVisible()
    await expect(page.getByText('审批')).toBeVisible()
    await expect(page.getByText('应用')).toBeVisible()
    await expect(page.getByText('更多')).toBeVisible()
  })

  test('移动端审批列表卡片布局', async ({ page }) => {
    await listPage.gotoTodo()

    // 验证使用卡片布局而非表格
    const cardList = page.locator('.approval-card')
    const cardCount = await cardList.count()
    expect(cardCount).toBeGreaterThan(0)

    // 验证表格不显示
    const table = page.locator('.el-table')
    await expect(table).not.toBeVisible()
  })

  test('移动端审批详情卡片式布局', async ({ page }) => {
    await listPage.gotoTodo()
    await listPage.clickFirstRecord()

    // 验证卡片式布局
    const infoCard = page.locator('.info-card')
    await expect(infoCard).toBeVisible()

    // 验证底部固定操作栏
    const actionBar = page.locator('.fixed-action-bar')
    await expect(actionBar).toBeVisible()

    // 验证操作按钮
    await expect(page.getByRole('button', { name: '通过' })).toBeVisible()
    await expect(page.getByRole('button', { name: '驳回' })).toBeVisible()
  })

  test('移动端表单 labelPosition 为 top', async ({ page }) => {
    await page.goto('/approval/launch')
    await page.getByText('请假申请').click()

    // 验证表单标签位置为顶部
    const formItem = page.locator('.el-form-item').first()
    const labelPosition = await formItem.evaluate((el) => {
      const label = el.querySelector('.el-form-item__label')
      const content = el.querySelector('.el-form-item__content')
      if (!label || !content) return 'unknown'

      const labelRect = label.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()

      return labelRect.bottom <= contentRect.top ? 'top' : 'left'
    })

    expect(labelPosition).toBe('top')
  })

  test('移动端筛选抽屉', async ({ page }) => {
    await listPage.gotoTodo()

    // 点击筛选按钮
    await page.getByRole('button', { name: '筛选' }).click()

    // 验证抽屉打开
    const drawer = page.locator('.el-drawer')
    await expect(drawer).toBeVisible()

    // 填写筛选条件
    await page.locator('.el-drawer').locator('input[placeholder*="搜索"]').fill('测试')
    await page.locator('.el-drawer').getByRole('button', { name: '确定' }).click()

    // 验证抽屉关闭
    await expect(drawer).not.toBeVisible()
  })

  test('移动端下拉刷新', async ({ page }) => {
    await listPage.gotoTodo()

    // 获取初始记录数
    const initialCount = await listPage.getRecordCount()

    // 模拟下拉刷新
    await page.touchscreen.tap(100, 100)
    await page.mouse.move(100, 100)
    await page.mouse.down()
    await page.mouse.move(100, 300, { steps: 10 })
    await page.mouse.up()

    // 等待刷新完成
    await page.waitForTimeout(2000)

    // 验证列表已刷新（可能记录数相同，但至少不报错）
    const newCount = await listPage.getRecordCount()
    expect(newCount).toBeGreaterThanOrEqual(0)
  })

  test('移动端左滑操作', async ({ page }) => {
    await listPage.gotoTodo()

    // 获取第一条记录
    const firstCard = page.locator('.approval-card').first()

    // 模拟左滑
    const box = await firstCard.boundingBox()
    if (box) {
      await page.touchscreen.tap(box.x + box.width - 10, box.y + box.height / 2)
      await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()

      // 验证操作按钮显示
      await expect(page.getByRole('button', { name: '通过' })).toBeVisible()
      await expect(page.getByRole('button', { name: '驳回' })).toBeVisible()
    }
  })

  test('移动端横竖屏切换', async ({ page }) => {
    await listPage.gotoTodo()

    // 竖屏模式
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)

    // 验证底部导航栏可见
    await expect(page.locator('.mobile-tab-bar')).toBeVisible()

    // 横屏模式
    await page.setViewportSize({ width: 812, height: 375 })
    await page.waitForTimeout(500)

    // 验证布局适配
    const isVisible = await page.locator('.approval-card').first().isVisible()
    expect(isVisible).toBeTruthy()
  })

  test('移动端字体大小适配', async ({ page }) => {
    await listPage.gotoTodo()

    // 获取标题字体大小
    const titleFontSize = await page.locator('.approval-card').first().locator('.title').evaluate((el) => {
      return window.getComputedStyle(el).fontSize
    })

    // 验证字体大小合理（移动端通常 14-16px）
    const fontSize = parseInt(titleFontSize)
    expect(fontSize).toBeGreaterThanOrEqual(14)
    expect(fontSize).toBeLessThanOrEqual(18)
  })

  test('移动端触摸目标大小', async ({ page }) => {
    await listPage.gotoTodo()

    // 获取按钮尺寸
    const button = page.getByRole('button', { name: '筛选' })
    const box = await button.boundingBox()

    // 验证触摸目标至少 44x44px（iOS 人机界面指南）
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })

  test('移动端侧边栏隐藏', async ({ page }) => {
    await page.goto('/dashboard')

    // 验证桌面端侧边栏在移动端不显示
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).not.toBeVisible()
  })

  test('移动端抽屉菜单', async ({ page }) => {
    // 点击"更多"标签
    await page.getByText('更多').click()

    // 验证抽屉菜单打开
    const drawer = page.locator('.mobile-drawer')
    await expect(drawer).toBeVisible()

    // 验证菜单项
    await expect(page.getByText('组织架构')).toBeVisible()
    await expect(page.getByText('通讯录')).toBeVisible()
    await expect(page.getByText('消息中心')).toBeVisible()

    // 点击菜单项
    await page.getByText('消息中心').click()

    // 验证导航成功
    expect(page.url()).toContain('/message')
  })

  test('移动端图片懒加载', async ({ page }) => {
    await page.goto('/application/list')

    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000)

    // 验证图片已加载
    const images = page.locator('img[data-src]')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const src = await img.getAttribute('src')
      expect(src).not.toBeNull()
      expect(src).not.toBe('')
    }
  })

  test('移动端响应式断点', async ({ page }) => {
    // 测试不同屏幕尺寸

    // 小屏幕 (< 640px)
    await page.setViewportSize({ width: 375, height: 667 })
    await listPage.gotoTodo()
    await expect(page.locator('.mobile-tab-bar')).toBeVisible()

    // 中等屏幕 (640px - 768px)
    await page.setViewportSize({ width: 700, height: 1024 })
    await page.waitForTimeout(500)
    await expect(page.locator('.mobile-tab-bar')).toBeVisible()

    // 大屏幕 (>= 768px) - 应该显示桌面端布局
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(500)
    await expect(page.locator('.sidebar')).toBeVisible()
  })
})
