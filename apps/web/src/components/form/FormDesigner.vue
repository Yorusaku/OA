<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { ElMessage } from 'element-plus'
import { designerToFormSchema } from '@/composables/useFormSchemaAdapter'
import type { FormSchema, DesignerConfig } from '@/composables/useFormSchemaAdapter'

// ==================== 状态 ====================
// 使用 defineAsyncComponent 懒加载 Designer
const FormDesigner = ref<Record<string, unknown> | null>(null)

const isLoading = ref(true)
const designerConfig = ref<DesignerConfig>({
  rule: [],
  option: {
    labelWidth: '100px',
    submitBtn: false,
    resetBtn: false,
  },
})

// ==================== 生命周期 ====================
onMounted(async () => {
  try {
    // 动态导入 @form-create/designer
    const mod = await import('@form-create/designer/dist/designer.cjs.js')
    FormDesigner.value = mod.default || mod
    isLoading.value = false
  } catch (err) {
    console.error('Failed to load FormDesigner:', err)
    isLoading.value = false
    ElMessage.error('表单设计器加载失败，请刷新重试')
  }
})

// ==================== 方法 ====================
/**
 * 保存表单配置
 */
const handleSave = (): void => {
  if (!FormDesigner.value) {
    ElMessage.warning('设计器尚未加载完成，请稍候再试')
    return
  }

  try {
    // 从 designer 实例中提取配置
    const config = FormDesigner.value.getValue?.() as DesignerConfig | undefined

    if (!config || !Array.isArray(config.rule)) {
      ElMessage.warning('暂无表单配置，请先拖拽组件')
      return
    }

    // 使用 Adapter 转换为系统标准格式
    const schema = designerToFormSchema(config)

    // 输出到控制台（后续会挂载到 workflow）
    console.log('Form Schema:', JSON.stringify(schema, null, 2))

    // 触发 save 事件
    emit('save', schema)

    // 成功提示
    ElMessage.success({
      message: '表单配置保存成功',
      duration: 2000,
    })
  } catch (err) {
    console.error('保存失败:', err)
    ElMessage.error('保存失败，请检查配置')
  }
}

/**
 * 清空画布
 */
const handleClear = (): void => {
  if (!FormDesigner.value) return

  FormDesigner.value.reset?.()
  ElMessage.success('画布已清空')
}

/**
 * 预览表单
 */
const handlePreview = (): void => {
  if (!FormDesigner.value) {
    ElMessage.warning('设计器尚未加载完成')
    return
  }

  try {
    const config = FormDesigner.value.getValue?.() as DesignerConfig | undefined
    if (!config) {
      ElMessage.warning('暂无表单配置')
      return
    }

    const schema = designerToFormSchema(config)

    // 弹出预览窗口（模拟）
    const previewContent = JSON.stringify(schema, null, 2)
    window.open('', '_blank')?.document.write(`<pre>${previewContent}</pre>`)

    ElMessage.success('表单预览已打开')
  } catch (err) {
    ElMessage.error('预览失败')
  }
}

// ==================== 事件 ====================
const emit = defineEmits<{
  (e: 'save', schema: FormSchema): void
}>()
</script>

<template>
  <div class="form-designer">
    <!-- 顶部操作栏 -->
    <div class="form-designer__header">
      <div class="form-designer__title">
        <i class="el-icon el-icon-edit"></i>
        <span>表单设计器</span>
      </div>
      <div class="form-designer__actions">
        <el-tooltip content="预览表单" placement="bottom">
          <el-button
            type="info"
            size="small"
            :icon="() => h('eye')"
            @click="handlePreview"
          />
        </el-tooltip>
        
        <el-tooltip content="清空画布" placement="bottom">
          <el-button
            type="warning"
            size="small"
            :icon="() => h('delete')"
            @click="handleClear"
          />
        </el-tooltip>
        
        <el-tooltip content="保存表单" placement="bottom">
          <el-button
            type="primary"
            size="small"
            :icon="() => h('check')"
            @click="handleSave"
          />
        </el-tooltip>
      </div>
    </div>
    
    <!-- 主内容区（加载中状态） -->
    <div v-loading="isLoading" class="form-designer__content">
      <template v-if="isLoading">
        <div class="form-designer__loading">
          <el-skeleton :rows="8" />
        </div>
      </template>
      
      <template v-else-if="FormDesigner">
        <!-- Designer 组件 -->
        <FcDesigner
          ref="designerRef"
          :rule="designerConfig.rule"
          :option="designerConfig.option"
          class="fc-designer"
        />
      </template>
      
      <template v-else>
        <!-- 加载失败 -->
        <div class="form-designer__error">
          <el-empty description="设计器加载失败，请刷新重试" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="postcss">
.form-designer {
  @apply flex flex-col h-full bg-white rounded-lg shadow-sm;

  &__header {
    @apply flex items-center justify-between px-4 py-3 border-b border-gray-200;

    &__title {
      @apply flex items-center text-lg font-semibold text-gray-800;

      .el-icon {
        @apply mr-2 text-gray-600;
      }
    }

    &__actions {
      @apply flex items-center gap-2;
    }
  }

  &__content {
    @apply flex-1 overflow-hidden relative p-4;
  }

  &__loading,
  &__error {
    @apply h-full w-full flex items-center justify-center;
  }
}

/* 全局样式覆盖（非 scoped） */
.fc-designer {
  height: 100% !important;
  
  :deep(.fc-d-body) {
    height: 100% !important;
  }
}
</style>
