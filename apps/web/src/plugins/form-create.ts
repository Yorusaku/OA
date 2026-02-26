import type { App } from 'vue'
import formCreate from '@form-create/element-ui'

/**
 * 🚀 form-create 白名单组件
 * 提取动态表单在运行时用到，但在静态模板中未声明的核心组件
 * 注意：JS 组件需要白名单注册，CSS 已在 main.ts 中全量引入
 */
import {
  ElRow,
  ElCol,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElTimePicker,
  ElRadio,
  ElRadioGroup,
  ElCheckbox,
  ElCheckboxGroup,
  ElSwitch,
  ElSlider,
  ElRate,
  ElColorPicker,
  ElUpload,
  ElForm,
  ElFormItem,
  ElButton
} from 'element-plus'

// 白名单组件列表
const whitelistComponents = [
  ElRow,
  ElCol,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElTimePicker,
  ElRadio,
  ElRadioGroup,
  ElCheckbox,
  ElCheckboxGroup,
  ElSwitch,
  ElSlider,
  ElRate,
  ElColorPicker,
  ElUpload,
  ElForm,
  ElFormItem,
  ElButton
]

/**
 * setupFormCreate - form-create 插件初始化
 * @description 注册动态表单所需的白名单组件和 form-create 引擎
 * @param app - Vue 应用实例
 */
export function setupFormCreate(app: App) {
  // 1. 批量注册白名单组件
  whitelistComponents.forEach((comp) => {
    app.use(comp)
  })

  // 2. 挂载 form-create 引擎
  app.use(formCreate)
}
