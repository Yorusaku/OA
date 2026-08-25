import { chromium } from '@playwright/test'
import fs from 'node:fs'

const base = process.env.E2E_BASE || 'http://localhost:5173'
const outDir = process.env.E2E_SHOTS || 'e2e-walkthrough-shots'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (err) => console.log('[pageerror]', err.message.slice(0, 300)))

await page.addInitScript(() => {
  localStorage.setItem('token', JSON.stringify('mock-token'))
  localStorage.setItem('userInfo', JSON.stringify({ id: 'user-001', name: 'admin' }))
})

try {
  await page.goto(base + '/knowledge', { waitUntil: 'networkidle' })
  await page.screenshot({ path: outDir + '/1-knowledge-list.png' })

  const entries = page.locator('button[title="进入对话"]')
  console.log('entry count:', await entries.count())
  await entries.first().click()
  await page.waitForSelector('.knowledge-chat-page', { timeout: 10000 })
  console.log('chat page url:', page.url())

  const textarea = page.locator('.chat-main__composer textarea')
  await textarea.waitFor({ timeout: 10000 })
  await textarea.fill('北京出差住宿标准是多少？请用要点列表总结。')
  await page.keyboard.press('Enter')
  console.log('sent, waiting...')

  await page.waitForSelector('.chat-message--assistant .chat-markdown', { timeout: 30000 })
  await page.waitForSelector('.chat-cursor', { state: 'detached', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(600)

  const assistantText = (await page.locator('.chat-message--assistant').last().innerText()).replace(/\s+/g, ' ')
  console.log('assistant:', assistantText.slice(0, 120))
  console.log('sessions:', await page.locator('.chat-session').count(),
    'sources:', await page.locator('.chat-message--assistant .chat-sources').count(),
    'md has list:', (await page.locator('.chat-message--assistant .chat-markdown').last().innerHTML()).includes('<ul'))

  await page.screenshot({ path: outDir + '/2-chat-with-reply.png' })

  // 会话重命名入口存在性
  await page.locator('.chat-session').first().hover()
  await page.waitForTimeout(300)
  console.log('rename btn visible:', await page.locator('.chat-session--active button[title], .chat-session--active .el-button').count())
  await page.screenshot({ path: outDir + '/3-session-hover.png' })

  // 新建会话 = 草稿态：点击后不立即建会话，清空当前消息并展示建议问题
  await page.locator('.chat-sidebar__header button[title="新建会话"]').click()
  await page.waitForTimeout(600)
  console.log('sessions after new (draft, expect unchanged):', await page.locator('.chat-session').count())
  console.log('suggestions visible in draft:', await page.locator('.chat-suggestions').count())
  await textarea.fill('采购金额超过五万元需要哪些材料？')
  await page.keyboard.press('Enter')
  await page.waitForSelector('.chat-message--assistant .chat-markdown', { timeout: 30000 })
  await page.waitForSelector('.chat-cursor', { state: 'detached', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(600)
  console.log('sessions after first message in draft (expect +1):', await page.locator('.chat-session').count())
  await page.screenshot({ path: outDir + '/4-second-session.png' })

  console.log('WALKTHROUGH_OK')
} catch (error) {
  console.error('WALKTHROUGH_FAIL:', error.message)
  await page.screenshot({ path: outDir + '/error.png' }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}