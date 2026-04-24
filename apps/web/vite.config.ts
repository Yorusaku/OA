import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', '@vueuse/core'],
      dts: 'src/auto-imports.d.ts',
      resolvers: [ElementPlusResolver({ importStyle: false })],
    }),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [ElementPlusResolver({ importStyle: false })],
    }),
  ],
  build: {
    // 性能优化配置
    target: 'es2015',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 手动代码分割
        manualChunks(id) {
          if (!id.includes('node_modules'))
            return

          if (id.includes('@logicflow/core') || id.includes('@logicflow/extension'))
            return 'vendor-logicflow'
          if (id.includes('echarts'))
            return 'vendor-echarts'
          if (id.includes('pdfjs-dist') || id.includes('xlsx'))
            return 'vendor-docs'
          if (id.includes('msw'))
            return 'vendor-mock'
          if (id.includes('element-plus') || id.includes('@element-plus'))
            return 'vendor-element'
          if (id.includes('@form-create'))
            return 'vendor-form-create'
          if (id.includes('@tanstack/vue-query') || id.includes('@tanstack/query-core'))
            return 'vendor-query'
          if (id.includes('@vueuse/core') || id.includes('@vueuse/shared'))
            return 'vendor-vueuse'
          if (id.includes('axios'))
            return 'vendor-network'
          if (id.includes('lodash-es'))
            return 'vendor-lodash'
          if (id.includes('nanoid') || id.includes('comlink'))
            return 'vendor-helpers'
          if (
            id.includes('/vue/') ||
            id.includes('vue-router') ||
            id.includes('pinia')
          ) {
            return 'vendor-framework'
          }
          return 'vendor-misc'
        },
        // 输出文件命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      '@vueuse/core',
      'element-plus',
      'axios',
    ],
    exclude: [
      '@logicflow/core',
      '@logicflow/extension',
    ],
  },
})
