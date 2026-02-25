import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '全景智能 OA',
  description: '全景智能 OA 协同办公平台 API 文档',
  base: '/OA/',
  srcDir: './',
  outDir: '../docs-dist',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: '架构', link: '/architecture' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          items: [
            { text: '介绍', link: '/guide/' },
            { text: '安装', link: '/guide/installation' }
          ]
        }
      ],
      '/api/': [
        {
          text: '核心模块',
          items: [
            { text: 'Composables', link: '/api/composables' },
            { text: 'Stores', link: '/api/stores' }
          ]
        },
        {
          text: 'API 模块',
          items: [
            { text: 'HTTP 与 API', link: '/api/http' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/oa' }
    ],
    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright © 2024-present 全景智能 OA'
    }
  },
  markdown: {
    lineNumbers: true
  }
})
