import type { ComputedRef, Ref } from 'vue'
import type { FormFieldSchema } from '@/types/form-schema'
import { computed, watch } from 'vue'
import { checkConditions, getConditionFields } from '@oa/utils'

export interface UseLinkageValidatorProps {
  field: Ref<FormFieldSchema | null>
  formValues: Ref<Record<string, any>>
}

export interface UseLinkageValidatorReturn {
  isRequired: Ref<boolean>
  isDisabled: Ref<boolean>
  isVisible: Ref<boolean>
  linkageFields: ComputedRef<string[]>
  validationRules: ComputedRef<any[]>
}

export function shouldFieldShow(
  field: FormFieldSchema,
  formValues: Record<string, any>,
): boolean {
  if (!field.linkage?.visibleWhen)
    return true
  return checkConditions(field.linkage.visibleWhen, formValues)
}

export function shouldFieldDisable(
  field: FormFieldSchema,
  formValues: Record<string, any>,
): boolean {
  if (!field.linkage?.disabledWhen)
    return false
  return checkConditions(field.linkage.disabledWhen, formValues)
}

export function getLinkageFields(field: FormFieldSchema): string[] {
  const fields: string[] = []
  if (field.linkage?.requiredWhen)
    fields.push(...getConditionFields(field.linkage.requiredWhen))
  if (field.linkage?.visibleWhen)
    fields.push(...getConditionFields(field.linkage.visibleWhen))
  if (field.linkage?.disabledWhen)
    fields.push(...getConditionFields(field.linkage.disabledWhen))
  return fields
}

export function useLinkageValidator(props: UseLinkageValidatorProps): UseLinkageValidatorReturn {
  const { field, formValues } = props

  const isRequired = computed(() => {
    if (!field.value)
      return false
    if (field.value.required)
      return true
    if (field.value.linkage?.requiredWhen)
      return checkConditions(field.value.linkage.requiredWhen, formValues.value)
    return false
  })

  const isDisabled = computed(() => {
    if (!field.value)
      return false
    if (field.value.disabled)
      return true
    if (field.value.linkage?.disabledWhen)
      return checkConditions(field.value.linkage.disabledWhen, formValues.value)
    return false
  })

  const isVisible = computed(() => {
    if (!field.value)
      return false
    if (!field.value.linkage?.visibleWhen)
      return true
    return checkConditions(field.value.linkage.visibleWhen, formValues.value)
  })

  const linkageFields = computed(() => {
    if (!field.value)
      return []
    return getLinkageFields(field.value)
  })

  const validationRules = computed(() => {
    if (!field.value)
      return []

    const rules: any[] = []
    const schemaRules = field.value.rules
    const ruleList = schemaRules
      ? (Array.isArray(schemaRules) ? schemaRules : [schemaRules])
      : []

    ruleList.forEach((rule) => {
      if (rule.required) {
        rules.push({
          required: true,
          message: rule.message || `${field.value!.label}是必填项`,
          trigger: rule.trigger || 'blur',
        })
      }
      if (rule.min !== undefined) {
        rules.push({
          min: rule.min,
          message: rule.message || `${field.value!.label}长度不能小于${rule.min}`,
          trigger: rule.trigger || 'blur',
        })
      }
      if (rule.max !== undefined) {
        rules.push({
          max: rule.max,
          message: rule.message || `${field.value!.label}长度不能大于${rule.max}`,
          trigger: rule.trigger || 'blur',
        })
      }
      if (rule.pattern) {
        rules.push({
          pattern: rule.pattern,
          message: rule.message || `${field.value!.label}格式不正确`,
          trigger: rule.trigger || 'blur',
        })
      }
    })

    if (isRequired.value && !rules.some(rule => rule.required === true)) {
      rules.push({
        required: true,
        message: `${field.value.label}是必填项`,
        trigger: 'blur',
      })
    }

    return rules
  })

  watch(
    () => linkageFields.value.map(name => formValues.value?.[name]),
    () => {
      // keep dependency graph explicit for reactive linkage recalculation
    },
  )

  return {
    isRequired,
    isDisabled,
    isVisible,
    linkageFields,
    validationRules,
  }
}
