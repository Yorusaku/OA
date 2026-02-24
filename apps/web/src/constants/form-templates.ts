import type { FormSchema } from '@/types/form-schema'

export interface FormTemplate {
  id: string
  name: string
  description: string
  schema: FormSchema
}

export const FORM_TEMPLATES: Record<string, FormTemplate> = {
  leave: {
    id: 'leave',
    name: '请假申请',
    description: '员工请假申请单',
    schema: {
      fields: [
        {
          key: 'leaveType',
          label: '请假类型',
          type: 'select',
          required: true,
          options: [
            { label: '事假', value: 'personal' },
            { label: '病假', value: 'sick' },
            { label: '年假', value: 'annual' },
            { label: '婚假', value: 'marriage' },
          ],
        },
        {
          key: 'startDate',
          label: '开始日期',
          type: 'date',
          required: true,
        },
        {
          key: 'endDate',
          label: '结束日期',
          type: 'date',
          required: true,
        },
        {
          key: 'days',
          label: '请假天数',
          type: 'number',
          required: true,
        },
        {
          key: 'reason',
          label: '请假原因',
          type: 'textarea',
          required: true,
        },
      ],
    },
  },
}
