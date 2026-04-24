import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/ApprovalPages'
import { WorkflowEditorPage } from './pages/WorkflowPages'

/**
 * 工作流编辑器 E2E 测试
 * 测试工作流设计器的节点操作、连线、配置等功能
 */

test.describe('工作流编辑器', () => {
  let loginPage: LoginPage
  let editorPage: WorkflowEditorPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    editorPage = new WorkflowEditorPage(page)

    await loginPage.goto()
    await loginPage.quickLogin()
    await editorPage.goto()
    await editorPage.waitForCanvas()
  })

  test('创建简单审批流程', async ({ page }) => {
    // 拖拽开始节点
    await editorPage.dragNodeToCanvas('开始', 200, 100)

    // 拖拽审批节点
    await editorPage.dragNodeToCanvas('审批', 200, 250)

    // 拖拽结束节点
    await editorPage.dragNodeToCanvas('结束', 200, 400)

    // 验证节点数量
    const nodeCount = await editorPage.getNodeCount()
    expect(nodeCount).toBe(3)

    // 连接节点
    await editorPage.connectNodes('开始', '审批')
    await editorPage.connectNodes('审批', '结束')

    // 验证连线数量
    const edgeCount = await editorPage.getEdgeCount()
    expect(edgeCount).toBe(2)

    // 保存工作流
    await editorPage.save()

    const message = await editorPage.getMessageText()
    expect(message).toContain('保存成功')
  })

  test('配置审批节点', async ({ page }) => {
    // 添加审批节点
    await editorPage.dragNodeToCanvas('审批', 300, 200)

    // 点击节点打开配置面板
    await editorPage.clickNode('审批')

    // 配置审批节点
    await editorPage.configureApprovalNode({
      name: '部门经理审批',
      approvers: ['张三', '李四'],
      approvalType: 'any'
    })

    // 保存配置
    await page.getByRole('button', { name: '确定' }).click()

    // 验证节点名称更新
    const nodeName = await page.locator('.lf-node:has-text("部门经理审批")').textContent()
    expect(nodeName).toContain('部门经理审批')
  })

  test('删除节点', async ({ page }) => {
    // 添加多个节点
    await editorPage.dragNodeToCanvas('开始', 200, 100)
    await editorPage.dragNodeToCanvas('审批', 200, 250)
    await editorPage.dragNodeToCanvas('结束', 200, 400)

    // 验证初始节点数量
    let nodeCount = await editorPage.getNodeCount()
    expect(nodeCount).toBe(3)

    // 删除审批节点
    await editorPage.deleteNode('审批')

    // 验证节点已删除
    nodeCount = await editorPage.getNodeCount()
    expect(nodeCount).toBe(2)
  })

  test('工作流验证', async ({ page }) => {
    // 创建不完整的工作流（缺少结束节点）
    await editorPage.dragNodeToCanvas('开始', 200, 100)
    await editorPage.dragNodeToCanvas('审批', 200, 250)

    // 验证工作流
    const isValid = await editorPage.validate()
    expect(isValid).toBeFalsy()

    // 添加结束节点
    await editorPage.dragNodeToCanvas('结束', 200, 400)
    await editorPage.connectNodes('开始', '审批')
    await editorPage.connectNodes('审批', '结束')

    // 再次验证
    const isValidNow = await editorPage.validate()
    expect(isValidNow).toBeTruthy()
  })

  test('复杂审批流程：并行审批', async ({ page }) => {
    // 开始节点
    await editorPage.dragNodeToCanvas('开始', 300, 100)

    // 并行网关
    await editorPage.dragNodeToCanvas('并行网关', 300, 200)

    // 两个并行审批节点
    await editorPage.dragNodeToCanvas('审批', 200, 300)
    await editorPage.dragNodeToCanvas('审批', 400, 300)

    // 汇聚网关
    await editorPage.dragNodeToCanvas('汇聚网关', 300, 400)

    // 结束节点
    await editorPage.dragNodeToCanvas('结束', 300, 500)

    // 连接节点
    await editorPage.connectNodes('开始', '并行网关')
    await editorPage.connectNodes('并行网关', '审批')
    await editorPage.connectNodes('并行网关', '审批')
    await editorPage.connectNodes('审批', '汇聚网关')
    await editorPage.connectNodes('审批', '汇聚网关')
    await editorPage.connectNodes('汇聚网关', '结束')

    // 验证节点和连线数量
    const nodeCount = await editorPage.getNodeCount()
    const edgeCount = await editorPage.getEdgeCount()
    expect(nodeCount).toBe(6)
    expect(edgeCount).toBe(6)

    // 保存
    await editorPage.save()
  })

  test('条件分支流程', async ({ page }) => {
    // 开始节点
    await editorPage.dragNodeToCanvas('开始', 300, 100)

    // 条件网关
    await editorPage.dragNodeToCanvas('条件网关', 300, 200)

    // 两个条件分支
    await editorPage.dragNodeToCanvas('审批', 200, 300)
    await editorPage.dragNodeToCanvas('审批', 400, 300)

    // 结束节点
    await editorPage.dragNodeToCanvas('结束', 300, 400)

    // 连接节点
    await editorPage.connectNodes('开始', '条件网关')
    await editorPage.connectNodes('条件网关', '审批')
    await editorPage.connectNodes('条件网关', '审批')
    await editorPage.connectNodes('审批', '结束')
    await editorPage.connectNodes('审批', '结束')

    // 配置条件
    await editorPage.clickNode('条件网关')
    await page.locator('input[placeholder*="条件表达式"]').first().fill('amount > 10000')
    await page.getByRole('button', { name: '确定' }).click()

    // 保存
    await editorPage.save()
  })

  test('工作流发布', async ({ page }) => {
    // 创建完整工作流
    await editorPage.dragNodeToCanvas('开始', 200, 100)
    await editorPage.dragNodeToCanvas('审批', 200, 250)
    await editorPage.dragNodeToCanvas('结束', 200, 400)

    await editorPage.connectNodes('开始', '审批')
    await editorPage.connectNodes('审批', '结束')

    // 保存
    await editorPage.save()

    // 发布
    await editorPage.publish()

    const message = await editorPage.getMessageText()
    expect(message).toContain('发布成功')
  })

  test('编辑已有工作流', async ({ page }) => {
    // 创建并保存工作流
    await editorPage.dragNodeToCanvas('开始', 200, 100)
    await editorPage.dragNodeToCanvas('审批', 200, 250)
    await editorPage.dragNodeToCanvas('结束', 200, 400)
    await editorPage.save()

    // 获取工作流ID（从URL或其他方式）
    const workflowId = 'test-workflow-001'

    // 重新加载工作流
    await editorPage.goto(workflowId)
    await editorPage.waitForCanvas()

    // 验证节点已加载
    const nodeCount = await editorPage.getNodeCount()
    expect(nodeCount).toBe(3)

    // 添加新节点
    await editorPage.dragNodeToCanvas('抄送', 200, 325)

    // 保存修改
    await editorPage.save()
  })

  test('工作流撤销重做', async ({ page }) => {
    // 添加节点
    await editorPage.dragNodeToCanvas('开始', 200, 100)
    await editorPage.dragNodeToCanvas('审批', 200, 250)

    let nodeCount = await editorPage.getNodeCount()
    expect(nodeCount).toBe(2)

    // 撤销
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(500)

    nodeCount = await editorPage.getNodeCount()
    expect(nodeCount).toBe(1)

    // 重做
    await page.keyboard.press('Control+Y')
    await page.waitForTimeout(500)

    nodeCount = await editorPage.getNodeCount()
    expect(nodeCount).toBe(2)
  })

  test('工作流缩放和平移', async ({ page }) => {
    // 添加节点
    await editorPage.dragNodeToCanvas('开始', 200, 100)

    // 放大画布
    await page.keyboard.press('Control+=')
    await page.waitForTimeout(500)

    // 缩小画布
    await page.keyboard.press('Control+-')
    await page.waitForTimeout(500)

    // 重置缩放
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(500)

    // 验证节点仍然可见
    const isVisible = await page.locator('.lf-node').first().isVisible()
    expect(isVisible).toBeTruthy()
  })
})
