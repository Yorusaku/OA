/**
 * @oa/config - 共享配置包
 * 
 * 统一的工程化配置
 */

// ESLint 配置
export default {
  vue: true,
  typescript: true,
  ignores: [
    '**/node_modules',
    '**/dist',
    '**/coverage',
    '**/*.d.ts',
    '**/*.md',
  ],
  rules: {
    'no-console': 'warn',
    'vue/no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  formatters: {
    css: true,
    html: true,
    markdown: true,
  },
}
