import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: [
    '**/node_modules',
    '**/dist',
    '**/coverage',
    '**/*.d.ts',
    '**/auto-imports.d.ts',
    '**/components.d.ts',
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
})
