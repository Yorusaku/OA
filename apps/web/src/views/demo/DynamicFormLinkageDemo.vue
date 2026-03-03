<script setup lang="ts">
/**
 * DynamicFormLinkageDemo - 动态表单联动校验演示页面
 * 用于测试 requiredWhen/visibleWhen/disabledWhen 功能
 */
import { ref } from 'vue'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'
import type { FormSchema } from '@/types/form-schema'

// ==================== Schema 定义 ====================
const leaveSchema: FormSchema = {
  labelWidth: '120px',
  fields: [
    // 请假类型（条件触发字段）
    {
      key: 'leaveType',
      label: '请假类型',
      type: 'select',
      required: true,
      options: [
        { label: '事假', value: 'personal' },
        { label: '病假', value: 'sick' },
        { label: '年假', value: 'annual' },
        { label: '产假', value: 'maternity' },
      ],
      placeholder: '请选择请假类型',
    },

    // 请假天数（条件触发字段）
    {
      key: 'leaveDays',
      label: '请假天数',
      type: 'number',
      required: true,
      min: 0.5,
      max: 30,
      placeholder: '请输入请假天数',
    },

    // ========================================
    // 联动必填测试：hospitalCert
    // ========================================
    {
      key: 'hospitalCert',
      label: '医院证明',
      type: 'upload',
      linkage: {
        requiredWhen: {
          field: 'leaveType',
          operator: 'eq',
          value: 'sick',
        },
      },
      placeholder: '请上传医院证明（病假必填）',
    },

    // ========================================
    // 联动必填测试：handoverPerson
    // ========================================
    {
      key: 'handoverPerson',
      label: '工作交接人',
      type: 'input',
      linkage: {
        requiredWhen: {
          field: 'leaveDays',
          operator: 'gt',
          value: 3,
        },
      },
      placeholder: '请输入交接人姓名（请假>3天必填）',
    },

    // ========================================
    // 联动必填测试：maternityCert
    // ========================================
    {
      key: 'maternityCert',
      label: '生育证明',
      type: 'upload',
      linkage: {
        requiredWhen: [
          {
            field: 'leaveType',
            operator: 'eq',
            value: 'maternity',
          },
          {
            field: 'leaveType',
            operator: 'eq',
            value: 'sick',
          },
        ],
      },
      placeholder: '请上传相关证明（产假或病假必填）',
    },

    // ========================================
    // 联动禁用测试：isManager
    // ========================================
    {
      key: 'isManager',
      label: '是否经理',
      type: 'switch',
      defaultValue: false,
    },

    {
      key: 'budget',
      label: '预算审批',
      type: 'number',
      linkage: {
        disabledWhen: {
          field: 'isManager',
          operator: 'eq',
          value: false,
        },
      },
      placeholder: '请输入预算（非经理禁用）',
    },

    // ========================================
    // 联动显示测试：isMarried
    // ========================================
    {
      key: 'isMarried',
      label: '是否已婚',
      type: 'radio',
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },

    {
      key: 'spouseName',
      label: '配偶姓名',
      type: 'input',
      linkage: {
        visibleWhen: {
          field: 'isMarried',
          operator: 'eq',
          value: true,
        },
      },
      placeholder: '请输入配偶姓名（已婚显示）',
    },

    // ========================================
    // 基础字段（无联动）
    // ========================================
    {
      key: 'reason',
      label: '请假事由',
      type: 'textarea',
      required: true,
      placeholder: '请输入请假原因',
    },
  ],
}

// ==================== 表单值 ====================
const formData = ref<Record<string, any>>({})

// ==================== 事件处理 ====================
const handleSubmit = (values: Record<string, any>) => {
  console.log('表单提交:', values)
  // 这里可以添加实际的提交逻辑
}
</script>

<template>
  <div class="linkage-demo p-6 max-w-4xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-800">
        动态表单联动校验演示
      </h1>
      <p class="text-gray-500 mt-2">
        测试 requiredWhen（联动必填）、visibleWhen（联动显示）、disabledWhen（联动禁用）
      </p>
    </div>

    <!-- 动态表单 -->
    <DynamicForm
      v-model="formData"
      :schema="leaveSchema"
      :show-submit="true"
      @submit="handleSubmit"
    />
  </div>
</template>

<style scoped>
.linkage-demo {
  min-height: calc(100vh - 120px);
}
</style>
