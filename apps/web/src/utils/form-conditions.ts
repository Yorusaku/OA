export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'includes' | 'exists'

export interface Condition {
  field: string
  operator?: ConditionOperator
  value?: any
}

export function checkCondition(
  condition: Condition,
  formValues: Record<string, any>,
): boolean {
  const { field, operator = 'eq', value } = condition
  const fieldValue = formValues[field]

  switch (operator) {
    case 'eq':
      return fieldValue === value
    case 'ne':
      return fieldValue !== value
    case 'gt':
      return Number(fieldValue) > Number(value)
    case 'gte':
      return Number(fieldValue) >= Number(value)
    case 'lt':
      return Number(fieldValue) < Number(value)
    case 'lte':
      return Number(fieldValue) <= Number(value)
    case 'in':
      return Array.isArray(value) ? value.includes(fieldValue) : false
    case 'includes':
      return Array.isArray(fieldValue) ? fieldValue.includes(value) : String(fieldValue)?.includes(value)
    case 'exists':
      return value ? fieldValue != null && fieldValue !== '' : fieldValue == null || fieldValue === ''
    default:
      return fieldValue === value
  }
}

export function checkConditions(
  conditions: any | any[] | undefined,
  formValues: Record<string, any>,
): boolean {
  if (!conditions)
    return false
  const conditionList = Array.isArray(conditions) ? conditions : [conditions]
  return conditionList.some(cond => checkCondition(cond, formValues))
}

export function getConditionFields(conditions: any | any[] | undefined): string[] {
  if (!conditions)
    return []
  const conditionList = Array.isArray(conditions) ? conditions : [conditions]
  const fields: string[] = []

  conditionList.forEach((cond) => {
    if (cond?.field) {
      fields.push(cond.field)
    }
  })

  return fields
}
