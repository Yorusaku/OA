import type { App } from 'vue'
import formCreate from '@form-create/element-ui'
import install from '@form-create/element-ui/auto-import'
import { ElDatePicker, ElTimePicker } from 'element-plus'

/**
 * setupFormCreate - form-create 插件初始化
 * @description 注册 form-create 引擎并自动导入 Element Plus 组件
 * @param app - Vue 应用实例
 */
export function setupFormCreate(app: App) {
  install(formCreate)
  
  app.use(formCreate)
  
  formCreate.component('datePicker', ElDatePicker)
  formCreate.component('timePicker', ElTimePicker)
}
