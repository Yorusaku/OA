import { test, expect } from '@playwright/test'
import { LoginPage, ApprovalLaunchPage } from './pages/ApprovalPages'

/**
 * 表单验证 E2E 测试
 * 测试动态表单的各种验证规则
 */

test.describe('表单验证', () => {
  let loginPage: LoginPage
  let launchPage: ApprovalLaunchPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    launchPage = new ApprovalLaunchPage(page)

    await loginPage.goto()
    await loginPage.quickLogin()
    await launchPage.goto()
  })

  test('必填字段验证', async ({ page }) => {
    await launchPage.selectType('请假申请')

    // 不填写任何字段，直接提交
    await launchPage.submit()

    // 验证必填提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toContain('必填')
  })

  test('数字字段验证', async ({ page }) => {
    await launchPage.selectType('报销申请')

    // 填写非数字内容
    await launchPage.fillField('报销金额', 'abc')
    await launchPage.submit()

    // 验证数字格式提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toContain('数字')
  })

  test('金额范围验证', async ({ page }) => {
    await launchPage.selectType('报销申请')

    // 填写超出范围的金额
    await launchPage.fillField('报销金额', '999999')
    await launchPage.fillField('报销事由', '测试金额范围')
    await launchPage.submit()

    // 验证范围提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toMatch(/范围|超出|最大/)
  })

  test('日期范围验证', async ({ page }) => {
    await launchPage.selectType('请假申请')

    // 选择过去的日期
    await launchPage.fillField('请假类型', '年假')
    await launchPage.selectDate('开始日期', '2020-01-01')
    await launchPage.submit()

    // 验证日期提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toMatch(/日期|时间/)
  })

  test('字符长度验证', async ({ page }) => {
    await launchPage.selectType('请假申请')

    // 填写超长文本
    const longText = 'a'.repeat(1000)
    await launchPage.fillField('请假事由', longText)
    await launchPage.submit()

    // 验证长度提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toMatch(/长度|字符/)
  })

  test('邮箱格式验证', async ({ page }) => {
    await launchPage.selectType('用户注册')

    // 填写错误的邮箱格式
    await launchPage.fillField('邮箱', 'invalid-email')
    await launchPage.submit()

    // 验证邮箱格式提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toMatch(/邮箱|格式/)
  })

  test('手机号格式验证', async ({ page }) => {
    await launchPage.selectType('用户注册')

    // 填写错误的手机号
    await launchPage.fillField('手机号', '123')
    await launchPage.submit()

    // 验证手机号格式提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toMatch(/手机|格式/)
  })

  test('联动必填验证', async ({ page }) => {
    await launchPage.selectType('请假申请')

    // 选择病假类型（触发联动必填）
    await launchPage.selectOption('请假类型', '病假')

    // 不填写病假证明，直接提交
    await launchPage.fillField('请假天数', '2')
    await launchPage.fillField('请假事由', '身体不适')
    await launchPage.submit()

    // 验证联动必填提示
    const errorMessage = await page.locator('.el-form-item__error:has-text("病假证明")').textContent()
    expect(errorMessage).toContain('必填')
  })

  test('联动显示验证', async ({ page }) => {
    await launchPage.selectType('报销申请')

    // 选择差旅报销（触发联动显示）
    await launchPage.selectOption('报销类型', '差旅')

    // 验证差旅相关字段显示
    const travelField = await page.locator('.el-form-item__label:has-text("出差地点")').isVisible()
    expect(travelField).toBeTruthy()

    // 切换到其他类型
    await launchPage.selectOption('报销类型', '办公')

    // 验证差旅字段隐藏
    const travelFieldHidden = await page.locator('.el-form-item__label:has-text("出差地点")').isHidden()
    expect(travelFieldHidden).toBeTruthy()
  })

  test('联动禁用验证', async ({ page }) => {
    await launchPage.selectType('采购申请')

    // 选择紧急采购（触发联动禁用）
    await launchPage.selectOption('采购类型', '紧急')

    // 验证预算字段被禁用
    const budgetField = page.locator('.el-form-item__label:has-text("预算金额")').locator('..').locator('input')
    const isDisabled = await budgetField.isDisabled()
    expect(isDisabled).toBeTruthy()
  })

  test('自定义验证规则', async ({ page }) => {
    await launchPage.selectType('请假申请')

    // 填写请假天数大于剩余年假天数
    await launchPage.fillField('请假类型', '年假')
    await launchPage.fillField('请假天数', '100')
    await launchPage.fillField('请假事由', '测试自定义验证')
    await launchPage.submit()

    // 验证自定义规则提示
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toMatch(/剩余|不足/)
  })

  test('表单重置功能', async ({ page }) => {
    await launchPage.selectType('请假申请')

    // 填写表单
    await launchPage.fillField('请假类型', '年假')
    await launchPage.fillField('请假天数', '3')
    await launchPage.fillField('请假事由', '测试重置')

    // 点击重置按钮
    await page.getByRole('button', { name: '重置' }).click()

    // 验证字段已清空
    const typeValue = await page.locator('input[placeholder*="请假类型"]').inputValue()
    expect(typeValue).toBe('')
  })

  test('表单自动保存', async ({ page }) => {
    await launchPage.selectType('报销申请')

    // 填写部分字段
    await launchPage.fillField('报销金额', '1000')
    await launchPage.fillField('报销事由', '测试自动保存')

    // 等待自动保存
    await page.waitForTimeout(3000)

    // 刷新页面
    await page.reload()

    // 验证字段值保留
    const amountValue = await page.locator('input[placeholder*="报销金额"]').inputValue()
    expect(amountValue).toBe('1000')
  })

  test('多步骤表单验证', async ({ page }) => {
    await launchPage.selectType('项目申请')

    // Step 1: 基本信息
    await launchPage.fillField('项目名称', '测试项目')
    await page.getByRole('button', { name: '下一步' }).click()

    // Step 2: 项目详情（不填写必填字段）
    await page.getByRole('button', { name: '下一步' }).click()

    // 验证无法进入下一步
    const errorMessage = await page.locator('.el-form-item__error').first().textContent()
    expect(errorMessage).toContain('必填')

    // 填写必填字段
    await launchPage.fillField('项目预算', '100000')
    await page.getByRole('button', { name: '下一步' }).click()

    // 验证进入下一步
    const step3 = await page.locator('.el-step.is-process').textContent()
    expect(step3).toContain('3')
  })
})
