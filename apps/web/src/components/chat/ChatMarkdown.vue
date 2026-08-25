<script setup lang="ts">
import hljs from 'highlight.js/lib/common'
import { marked } from 'marked'
import { computed } from 'vue'
import 'highlight.js/styles/github.css'

const props = defineProps<{
  content: string
}>()

marked.setOptions({
  gfm: true,
  breaks: true,
})

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = language === 'plaintext'
    ? hljs.highlightAuto(text).value
    : hljs.highlight(text, { language }).value
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}

function sanitize(html: string): string {
  if (typeof DOMParser === 'undefined')
    return html
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.querySelectorAll('script, iframe, object, embed, form').forEach(node => node.remove())
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith('on'))
        element.removeAttribute(attribute.name)
      if ((attribute.name === 'href' || attribute.name === 'src') && /^javascript:/i.test(attribute.value))
        element.removeAttribute(attribute.name)
    }
  })
  return document.body.innerHTML
}

const html = computed(() => sanitize(marked.parse(props.content || '', { renderer }) as string))
</script>

<template>
  <div class="chat-markdown" v-html="html" />
</template>

<style scoped>
.chat-markdown {
  color: #303133;
  line-height: 1.75;
  overflow-wrap: anywhere;
}

.chat-markdown :deep(p) {
  margin: 0 0 10px;
}

.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  padding-left: 22px;
  margin: 8px 0;
}

.chat-markdown :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 3px solid #409eff;
  background: #f5f7fa;
  color: #606266;
}

.chat-markdown :deep(pre) {
  margin: 10px 0;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  background: #f6f8fa;
}

.chat-markdown :deep(code:not(.hljs)) {
  padding: 2px 4px;
  border-radius: 4px;
  background: #f2f3f5;
  color: #c03639;
}

.chat-markdown :deep(a) {
  color: #409eff;
}
</style>
