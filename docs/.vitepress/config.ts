import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '全景智能 OA',
  description: '全景智能 OA 协同办公平台文档站',
  base: '/OA/',
  srcDir: './',
  outDir: '../docs-dist',
  lang: 'zh-CN',
  ignoreDeadLinks: [
    'localhostLinks',
    /^\/e:\//i,
    /^http:\/\/localhost:5173(?:\/approval\/detail\/leave-001)?$/i,
    /PROJECT_DOCUMENTATION/i,
    /ADR-001-R001-refactor-results/i,
    /\.\.\/\.\.\/README$/i,
    /approval\/detail\/_______________/i,
  ],
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '开发指南', link: '/development' },
      { text: '架构文档', link: '/architecture' },
      { text: '说明', link: '/README' },
    ],
    sidebar: [
      {
        text: '项目文档',
        items: [
          { text: '文档首页', link: '/' },
          { text: '架构文档', link: '/architecture' },
          { text: '开发指南', link: '/development' },
          { text: '文档说明', link: '/README' },
        ],
      },
      {
        text: '指南',
        items: [
          { text: '介绍', link: '/guide/' },
          { text: '安装指南', link: '/guide/installation' },
        ],
      },
      {
        text: 'API 说明',
        items: [
          { text: 'API 首页', link: '/api/' },
          { text: 'Composables', link: '/api/composables' },
          { text: 'Stores', link: '/api/stores' },
          { text: 'HTTP', link: '/api/http' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/oa' },
    ],
    footer: {
      message: '仅用于学习、演示与项目说明',
      copyright: 'Copyright © 2026 全景智能 OA',
    },
  },
  markdown: {
    lineNumbers: true,
  },
})
