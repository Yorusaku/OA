import type { App, Component } from 'vue'
import {
  ElButton,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElColorPicker,
  ElCol,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElLoadingDirective,
  ElOption,
  ElOptionGroup,
  ElRadio,
  ElRadioGroup,
  ElRate,
  ElRow,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElUpload,
} from 'element-plus'

const ELEMENT_ON_DEMAND_COMPONENTS: Component[] = [
  ElButton,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElColorPicker,
  ElCol,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElOptionGroup,
  ElRadio,
  ElRadioGroup,
  ElRate,
  ElRow,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElUpload,
]

export async function setupElementPlus(app: App) {
  const fullMode = import.meta.env.VITE_ELEMENT_PLUS_MODE === 'full'

  if (fullMode) {
    const { default: ElementPlus } = await import('element-plus')
    app.use(ElementPlus)
    return
  }

  app.directive('loading', ElLoadingDirective)
  for (const component of ELEMENT_ON_DEMAND_COMPONENTS) {
    const name = (component as { name?: string }).name
    if (name)
      app.component(name, component)
  }
}
