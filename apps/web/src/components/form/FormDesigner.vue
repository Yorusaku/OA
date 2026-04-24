<script setup lang="ts">
import type { FormSchema } from '@/types/form-schema'
import type { DesignerConfig } from '@/composables/useFormSchemaAdapter'
import { h, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { designerToFormSchema } from '@/composables/useFormSchemaAdapter'

interface DesignerInstance {
  getValue?: () => DesignerConfig
  reset?: () => void
}

const emit = defineEmits<{
  (e: 'save', schema: FormSchema): void
}>()

const isLoading = ref(true)
const designerComponent = ref<any>(null)
const designerRef = ref<DesignerInstance | null>(null)
const designerConfig = ref<DesignerConfig>({
  rule: [],
  option: {
    labelWidth: '100px',
    submitBtn: false,
    resetBtn: false,
  },
})

onMounted(async () => {
  try {
    const mod = await import('@form-create/designer/dist/designer.cjs.js')
    designerComponent.value = mod.default || mod
  }
  catch (error) {
    console.error(error)
    ElMessage.error('表单设计器加载失败')
  }
  finally {
    isLoading.value = false
  }
})

const handleSave = (): void => {
  const config = designerRef.value?.getValue?.()
  if (!config || !Array.isArray(config.rule)) {
    ElMessage.warning('暂无可保存的表单配置')
    return
  }
  const schema = designerToFormSchema(config)
  emit('save', schema)
  ElMessage.success('保存成功')
}

const handleClear = (): void => {
  designerRef.value?.reset?.()
  ElMessage.success('画布已清空')
}

const handlePreview = (): void => {
  const config = designerRef.value?.getValue?.()
  if (!config) {
    ElMessage.warning('暂无可预览的表单配置')
    return
  }
  const schema = designerToFormSchema(config)
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(`<pre>${JSON.stringify(schema, null, 2)}</pre>`)
  }
}
</script>

<template>
  <div class="form-designer">
    <div class="form-designer__header">
      <div class="form-designer__title">表单设计器</div>
      <div class="form-designer__actions">
        <el-button type="info" size="small" :icon="() => h('span', '预')" @click="handlePreview" />
        <el-button type="warning" size="small" :icon="() => h('span', '清')" @click="handleClear" />
        <el-button type="primary" size="small" :icon="() => h('span', '存')" @click="handleSave" />
      </div>
    </div>

    <div v-loading="isLoading" class="form-designer__content">
      <component
        :is="designerComponent || 'div'"
        v-if="designerComponent"
        ref="designerRef"
        :rule="designerConfig.rule"
        :option="designerConfig.option"
      />
      <el-empty v-else-if="!isLoading" description="设计器加载失败" />
    </div>
  </div>
</template>

<style scoped lang="postcss">
.form-designer {
  @apply flex flex-col h-full bg-white rounded-lg shadow-sm;
}

.form-designer__header {
  @apply flex items-center justify-between px-4 py-3 border-b border-gray-200;
}

.form-designer__title {
  @apply text-lg font-semibold text-gray-800;
}

.form-designer__actions {
  @apply flex items-center gap-2;
}

.form-designer__content {
  @apply flex-1 overflow-hidden relative p-4;
}
</style>
