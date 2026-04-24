import type { Router } from 'vue-router'

/**
 * P1 prework:
 * Keep a whitelist of Element Plus components required by dynamic-form/workflow.
 * This file does not switch to on-demand registration yet.
 */
export const ELEMENT_COMPONENT_WHITELIST = [
  'ElForm',
  'ElFormItem',
  'ElInput',
  'ElInputNumber',
  'ElSelect',
  'ElOption',
  'ElDatePicker',
  'ElTable',
  'ElTableColumn',
  'ElButton',
]

const preloadOnceCache = new Set<string>()
const DYNAMIC_FORM_PRELOAD_PREFIXES = [
  '/approval/launch',
  '/approval/detail',
  '/demo/dynamic-form',
  '/form',
]

function shouldPreloadDynamicForm(path: string) {
  return DYNAMIC_FORM_PRELOAD_PREFIXES.some(prefix => path.startsWith(prefix))
}

async function preloadDynamicFormRuntime() {
  if (preloadOnceCache.has('dynamic-form'))
    return
  preloadOnceCache.add('dynamic-form')
  await Promise.allSettled([
    import('@/components/dynamic-form/DynamicForm.vue'),
    import('element-plus/es/components/form/style/css'),
    import('element-plus/es/components/form-item/style/css'),
    import('element-plus/es/components/table/style/css'),
    import('element-plus/es/components/table-column/style/css'),
  ])
}

async function preloadWorkflowRuntime() {
  if (preloadOnceCache.has('workflow'))
    return
  preloadOnceCache.add('workflow')
  await Promise.allSettled([
    import('@/components/workflow/WorkflowCanvas.vue'),
    import('@logicflow/core/dist/index.css'),
    import('@logicflow/extension/lib/style/index.css'),
  ])
}

export function setupRuntimePreload(router: Router) {
  router.afterEach((to) => {
    const path = to.path || ''
    if (shouldPreloadDynamicForm(path)) {
      void preloadDynamicFormRuntime()
    }
    if (path.startsWith('/workflow')) {
      void preloadWorkflowRuntime()
    }
  })
}
