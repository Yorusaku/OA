/**
 * useFormDataSync - 表单数据同步 Composable (已废弃)
 * 现在直接使用 fApi.setValue 来设置表单值
 */
import { ref, type Ref } from 'vue'

// ==================== 核心函数 ====================
/**
 * 返回空 formData (不再使用)
 * @param fApi - form-create 的 API ref
 * @returns 空 formData 对象
 */
export function useFormDataSync(fApi: Ref<any>) {
  const formData = ref<Record<string, any>>({}) as Ref<Record<string, any>>
  
  // 不再使用 formData,直接通过 fApi.setValue 设置值
  return {
    formData,
  }
}
