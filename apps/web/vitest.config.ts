import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 🚀 核心：放弃 mergeConfig 这种容易踩坑的黑魔法，直接显式组装测试必须的插件和环境！
export default defineConfig({
  plugins: [
    vue() // 手动注入 Vue 解析插件，终结那个 "Failed to parse .vue files" 报错
  ],
  resolve: {
    alias: {
      // 手动配置路径别名，确保你的 @/components/xxx 能被测试环境正确找到
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true, // 允许全局使用 describe, it, expect
    environment: 'jsdom', // 模拟浏览器 DOM 环境
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})