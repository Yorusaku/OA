import { test, expect } from '@playwright/test'
import { LoginPage, ApprovalListPage, ApprovalDetailPage, ApprovalLaunchPage } from './pages/ApprovalPages'

/**
 * 审批流程 E2E 测试
 * 测试完整的审批业务流程：发起 → 审批 → 查看
 */

test.describe('审批流程', () => {
  let loginPage: LoginPage
  let launchPage: ApprovalLaunchPage
  let listPage: ApprovalListPage
  let detailPage: ApprovalDetailPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    launchPage = new ApprovalLaunchPage(page)
    listPage = new ApprovalListPage(page)
    detailPage = new ApprovalDetailPage(page)

    // 登录系统
    await loginPage.goto()
    await loginPage.quickLogin()
  })

  test('完整审批流程：发起 → 审批 → 通过', async ({ page }) => {
    // Step 1: 发起请假审批
    await launchPage.goto()
    await launchPage.selectType('请假申请')

    await launchPage.fillField('请假类型', '年假')
    await launchPage.fillField('请假天数', '3')
    await launchPage.fillField('请假事由', '家庭旅行')
    await launchPage.submit()

    // 验证提交成功
    const message = await launchPage.getMessageText()
    expect(message).toContain('提交成功')

    // Step 2: 切换到待审批列表
    await listPage.gotoTodo()
    await listPage.waitForLoad()

    // 验证审批记录存在
    const count = await listPage.getRecordCount()
    expect(count).toBeGreaterThan(0)

    // Step 3: 进入审批详情
    await listPage.clickFirstRecord()

    // 验证详情页加载
    expect(detailPage.isAtPath('/approval/detail')).toBeTruthy()

    // Step 4: 通过审批
    await detailPage.approve('同意请假')

    // 验证审批成功
    const approveMessage = await detailPage.getMessageText()
    expect(approveMessage).toContain('审批成功')

    // Step 5: 验证状态变更
    await page.waitForTimeout(1000) // 等待状态更新
    const status = await detailPage.getStatus()
    expect(status).toContain('已通过')
  })

  test('审批驳回流程', async ({ page }) => {
    // 发起审批
    await launchPage.goto()
    await launchPage.selectType('报销申请')

    await launchPage.fillField('报销金额', '5000')
    await launchPage.fillField('报销事由', '差旅费用')
    await launchPage.submit()

    // 进入待审批列表
    await listPage.gotoTodo()
    await listPage.clickFirstRecord()

    // 驳回审批
    await detailPage.reject('金额超出预算，请重新提交')

    // 验证驳回成功
    const message = await detailPage.getMessageText()
    expect(message).toContain('驳回成功')

    // 验证状态
    await page.waitForTimeout(1000)
    const status = await detailPage.getStatus()
    expect(status).toContain('已驳回')
  })

  test('审批转交流程', async ({ page }) => {
    // 发起审批
    await launchPage.goto()
    await launchPage.selectType('采购申请')

    await launchPage.fillField('采购物品', '办公用品')
    await launchPage.fillField('采购数量', '100')
    await launchPage.submit()

    // 进入待审批列表
    await listPage.gotoTodo()
    await listPage.clickFirstRecord()

    // 转交审批
    await detailPage.transfer('张三', '请协助审批')

    // 验证转交成功
    const message = await detailPage.getMessageText()
    expect(message).toContain('转交成功')
  })

  test('批量审批流程', async ({ page }) => {
    // 发起多个审批
    for (let i = 0; i < 3; i++) {
      await launchPage.goto()
      await launchPage.selectType('请假申请')
      await launchPage.fillField('请假类型', '事假')
      await launchPage.fillField('请假天数', '1')
      await launchPage.fillField('请假事由', `测试审批 ${i + 1}`)
      await launchPage.submit()
      await page.waitForTimeout(500)
    }

    // 进入待审批列表
    await listPage.gotoTodo()
    await listPage.waitForLoad()

    // 选择前3条记录
    await listPage.selectRecords(3)

    // 批量通过
    await listPage.batchApprove()

    // 验证批量审批成功
    const message = await listPage.getMessageText()
    expect(message).toContain('批量审批成功')
  })

  test('审批评论功能', async ({ page }) => {
    // 发起审批
    await launchPage.goto()
    await launchPage.selectType('请假申请')
    await launchPage.fillField('请假类型', '病假')
    await launchPage.fillField('请假天数', '2')
    await launchPage.fillField('请假事由', '身体不适')
    await launchPage.submit()

    // 进入审批详情
    await listPage.gotoTodo()
    await listPage.clickFirstRecord()

    // 添加评论
    await detailPage.addComment('请提供病假证明')

    // 验证评论成功
    const message = await detailPage.getMessageText()
    expect(message).toContain('评论成功')

    // 验证评论显示
    const commentText = await page.locator('.comment-item').last().textContent()
    expect(commentText).toContain('请提供病假证明')
  })

  test('查看我发起的审批', async ({ page }) => {
    // 发起审批
    await launchPage.goto()
    await launchPage.selectType('请假申请')
    await launchPage.fillField('请假类型', '年假')
    await launchPage.fillField('请假天数', '5')
    await launchPage.fillField('请假事由', '年度休假')
    await launchPage.submit()

    // 进入我发起的列表
    await listPage.gotoMine()
    await listPage.waitForLoad()

    // 验证记录存在
    const count = await listPage.getRecordCount()
    expect(count).toBeGreaterThan(0)

    // 搜索刚发起的审批
    await listPage.search('年度休假')
    await listPage.waitForLoad()

    // 验证搜索结果
    const searchCount = await listPage.getRecordCount()
    expect(searchCount).toBeGreaterThan(0)
  })

  test('保存审批草稿', async ({ page }) => {
    // 进入发起页面
    await launchPage.goto()
    await launchPage.selectType('报销申请')

    // 填写部分信息
    await launchPage.fillField('报销金额', '3000')
    await launchPage.fillField('报销事由', '会议费用')

    // 保存草稿
    await launchPage.saveDraft()

    // 验证保存成功
    const message = await launchPage.getMessageText()
    expect(message).toContain('保存成功')

    // 返回列表验证草稿存在
    await listPage.gotoMine()
    await listPage.waitForLoad()

    const draftText = await page.locator('.el-tag:has-text("草稿")').first().textContent()
    expect(draftText).toContain('草稿')
  })
})
