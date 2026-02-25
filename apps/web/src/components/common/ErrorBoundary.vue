<script setup lang="ts">
/**
 * @file ErrorBoundary.vue
 * @description 错误边界组件
 * 捕获子组件错误并显示友好的错误提示
 * @usage 包裹可能出错的组件，当错误发生时显示重试界面
 */

import { Warning } from '@element-plus/icons-vue'
import { onErrorCaptured, ref } from 'vue'

const props = withDefaults(defineProps<{
  /** 自定义错误提示文本 */
  fallback?: string
  /** 错误回调函数 */
  onError?: (error: Error) => void
}>(), {
  fallback: '抱歉，出现了一些问题',
})

const emit = defineEmits<{
  /** 重试事件 */
  retry: []
  /** 重置事件 */
  reset: []
}>()

/** 是否发生错误 */
const hasError = ref(false)
/** 错误消息 */
const errorMessage = ref(props.fallback)
/** 错误详情 */
const errorInfo = ref<Error | null>(null)

/**
 * 捕获子组件错误
 * @param error - 错误对象
 */
onErrorCaptured((error) => {
  hasError.value = true
  errorInfo.value = error
  errorMessage.value = error.message || props.fallback
  console.error('Error captured by ErrorBoundary:', error)
  if (props.onError) {
    props.onError(error)
  }
  return false // 阻止错误继续向上传播
})

/**
 * 重试处理
 */
function handleRetry() {
  hasError.value = false
  errorInfo.value = null
  errorMessage.value = props.fallback
  emit('retry')
}

/**
 * 重置处理
 */
function handleReset() {
  hasError.value = false
  errorInfo.value = null
  errorMessage.value = props.fallback
  emit('reset')
}

// 暴露方法给父组件
defineExpose({
  reset: handleReset,
})
</script>

<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-container">
      <el-icon class="error-icon" :size="64">
        <Warning />
      </el-icon>
      <h2 class="error-title">
        抱歉，出现了一些问题
      </h2>
      <p class="error-message">
        {{ errorMessage }}
      </p>
      <div class="error-actions">
        <el-button type="primary" @click="handleRetry">
          重试
        </el-button>
        <el-button @click="handleReset">
          重置
        </el-button>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped lang="scss">
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
}

.error-container {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  color: #f56c6c;
  margin-bottom: 24px;
}

.error-title {
  font-size: 24px;
  color: #303133;
  margin-bottom: 16px;
}

.error-message {
  font-size: 14px;
  color: #606266;
  margin-bottom: 32px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
