<script setup lang="ts">
import { Warning } from '@element-plus/icons-vue'
import { onErrorCaptured, ref } from 'vue'

const props = withDefaults(defineProps<{
  fallback?: string
  onError?: (error: Error) => void
}>(), {
  fallback: '抱歉，出现了一些问题',
})

const emit = defineEmits<{
  retry: []
  reset: []
}>()

const hasError = ref(false)
const errorMessage = ref(props.fallback)
const errorInfo = ref<Error | null>(null)

onErrorCaptured((error) => {
  hasError.value = true
  errorInfo.value = error
  errorMessage.value = error.message || props.fallback
  console.error('Error captured by ErrorBoundary:', error)
  if (props.onError) {
    props.onError(error)
  }
  return false
})

function handleRetry() {
  hasError.value = false
  errorInfo.value = null
  errorMessage.value = props.fallback
  emit('retry')
}

function handleReset() {
  hasError.value = false
  errorInfo.value = null
  errorMessage.value = props.fallback
  emit('reset')
}

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
