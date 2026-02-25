/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Design Tokens - 与 Element Plus 主题变量映射
      colors: {
        // 主色 - 对应 --el-color-primary
        'primary': {
          'DEFAULT': 'rgb(var(--el-color-primary-rgb, 64 158 255) / <alpha-value>)',
          'light-3': 'rgb(var(--el-color-primary-light-3-rgb, 135 188 255) / <alpha-value>)',
          'light-5': 'rgb(var(--el-color-primary-light-5-rgb, 169 205 255) / <alpha-value>)',
          'light-7': 'rgb(var(--el-color-primary-light-7-rgb, 204 223 255) / <alpha-value>)',
          'light-8': 'rgb(var(--el-color-primary-light-8-rgb, 221 235 255) / <alpha-value>)',
          'light-9': 'rgb(var(--el-color-primary-light-9-rgb, 238 245 255) / <alpha-value>)',
          'dark-2': 'rgb(var(--el-color-primary-dark-2-rgb, 0 129 230) / <alpha-value>)',
        },
        // 功能色
        'success': 'rgb(var(--el-color-success-rgb, 103 194 58) / <alpha-value>)',
        'warning': 'rgb(var(--el-color-warning-rgb, 230 162 60) / <alpha-value>)',
        'danger': 'rgb(var(--el-color-danger-rgb, 245 108 108) / <alpha-value>)',
        'error': 'rgb(var(--el-color-error-rgb, 245 108 108) / <alpha-value>)',
        'info': 'rgb(var(--el-color-info-rgb, 144 147 153) / <alpha-value>)',
        // 中性色
        'text-primary': 'var(--el-text-color-primary, #303133)',
        'text-regular': 'var(--el-text-color-regular, #606266)',
        'text-secondary': 'var(--el-text-color-secondary, #909399)',
        'text-placeholder': 'var(--el-text-color-placeholder, #C0C4CC)',
        // 背景色
        'bg-page': 'var(--el-bg-color-page, #f5f7fa)',
        'bg': 'var(--el-bg-color, #ffffff)',
        'bg-overlay': 'var(--el-bg-color-overlay, #ffffff)',
        // 边框
        'border': 'var(--el-border-color, #DCDFE6)',
        'border-light': 'var(--el-border-color-light, #E4E7ED)',
        'border-lighter': 'var(--el-border-color-lighter, #EBEEF5)',
        'border-extra-light': 'var(--el-border-color-extra-light, #F2F6FC)',
      },
      borderRadius: {
        // 圆角 - 对应 Element Plus 变量
        'none': '0',
        'sm': 'var(--el-border-radius-small, 2px)',
        'DEFAULT': 'var(--el-border-radius-base, 4px)',
        'lg': 'var(--el-border-radius-round, 20px)',
        'xl': 'var(--el-border-radius-circle, 50%)',
        '2xl': 'var(--el-radius-round, 16px)',
      },
      boxShadow: {
        // 阴影
        light: 'var(--el-box-shadow-light, 0 2px 12px 0 rgba(0,0,0,0.1))',
        DEFAULT: 'var(--el-box-shadow, 0 2px 4px rgba(0,0,0,0.12), 0 0 6px rgba(0,0,0,0.04))',
        dark: 'var(--el-box-shadow-dark, 0 2px 12px 0 rgba(0,0,0,0.2))',
      },
      spacing: {
        // 间距
        auto: 'auto',
        px: '1px',
        0: '0',
        0.5: 'var(--el-spacing-xs, 0.125rem)',
        1: 'var(--el-spacing-sm, 0.25rem)',
        2: 'var(--el-spacing-base, 0.5rem)',
        3: 'var(--el-spacing-md, 0.75rem)',
        4: 'var(--el-spacing-lg, 1rem)',
        5: 'var(--el-spacing-xl, 1.25rem)',
        6: 'var(--el-spacing-xxl, 1.5rem)',
      },
      fontSize: {
        // 字体大小
        'xs': 'var(--el-font-size-extra-small, 0.75rem)',
        'sm': 'var(--el-font-size-small, 0.875rem)',
        'base': 'var(--el-font-size-base, 1rem)',
        'lg': 'var(--el-font-size-medium, 1.125rem)',
        'xl': 'var(--el-font-size-large, 1.25rem)',
        '2xl': 'var(--el-font-size-extra-large, 1.5rem)',
      },
    },
  },
  plugins: [],
}

export default config
