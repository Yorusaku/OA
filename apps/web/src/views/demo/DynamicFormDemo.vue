<script setup lang="ts">
import type { FormSchema } from '@/types/form-schema'
import { ElCard, ElMessage } from 'element-plus'
/**
 * 动态表单 Demo 页面
 * 展示请假申请单的联动校验场景
 */
import { ref } from 'vue'
import DynamicForm from '@/components/dynamic-form/DynamicForm.vue'

// ==================== 表单 Schema 定义 ====================
/**
 * 请假申请单 Schema
 * 包含两个联动校验场景：
 * 1. 选择"病假"时，"医院证明"字段变为必填
 * 2. 请假天数 > 3 天时，"交接人"字段变为必填
 */
const leaveFormSchema: FormSchema = {
  fields: [
    {
      key: 'applicantName',
      label: '申请人',
      type: 'input',
      placeholder: '请输入申请人姓名',
      required: true,
      span: 12,
      rules: {
        min: 2,
        max: 10,
        message: '姓名长度为 2-10 个字符',
      },
    },
    {
      key: 'department',
      label: '部门',
      type: 'select',
      placeholder: '请选择部门',
      required: true,
      span: 12,
      options: [
        { label: '技术部', value: 'tech' },
        { label: '产品部', value: 'product' },
        { label: '运营部', value: 'operation' },
        { label: '人事部', value: 'hr' },
        { label: '财务部', value: 'finance' },
      ],
    },
    {
      key: 'leaveType',
      label: '请假类型',
      type: 'select',
      placeholder: '请选择请假类型',
      required: true,
      span: 12,
      description: '选择病假时需要上传医院证明',
      options: [
        { label: '事假', value: 'personal' },
        { label: '病假', value: 'sick' },
        { label: '年假', value: 'annual' },
        { label: '调休', value: 'compensatory' },
        { label: '婚假', value: 'marriage' },
        { label: '产假', value: 'maternity' },
      ],
      // 联动：当选择病假时，hospitalCert 字段变为必填
      linkage: {
        requiredWhen: { field: 'leaveType', operator: 'eq', value: 'sick' },
      },
    },
    {
      key: 'startDate',
      label: '开始日期',
      type: 'date',
      placeholder: '请选择开始日期',
      required: true,
      span: 12,
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      key: 'endDate',
      label: '结束日期',
      type: 'date',
      placeholder: '请选择结束日期',
      required: true,
      span: 12,
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      key: 'days',
      label: '请假天数',
      type: 'number',
      placeholder: '请输入请假天数',
      required: true,
      span: 12,
      description: '超过 3 天需要指定工作交接人',
      rules: {
        min: 0.5,
        max: 30,
      },
      // 联动：当请假天数 > 3 时，handover 字段变为必填
      linkage: {
        requiredWhen: { field: 'days', operator: 'gt', value: 3 },
      },
    },
    {
      key: 'reason',
      label: '请假事由',
      type: 'textarea',
      placeholder: '请详细描述请假事由',
      required: true,
      span: 24,
      rules: {
        min: 10,
        max: 500,
        message: '事由描述至少 10 个字',
      },
    },
    {
      key: 'hospitalCert',
      label: '医院证明',
      type: 'upload',
      placeholder: '请上传医院证明',
      span: 24,
      // 联动必填：当请假类型为病假时必填
      linkage: {
        visibleWhen: { field: 'leaveType', operator: 'eq', value: 'sick' },
        requiredWhen: { field: 'leaveType', operator: 'eq', value: 'sick' },
      },
      componentProps: {
        action: '/api/upload',
        limit: 3,
        tip: '仅当请假类型为病假时需要上传',
      },
    },
    {
      key: 'handover',
      label: '工作交接人',
      type: 'input',
      placeholder: '请输入工作交接人姓名',
      span: 12,
      description: '请假超过 3 天时必填',
      // 联动必填：当请假天数 > 3 时必填
      linkage: {
        requiredWhen: { field: 'days', operator: 'gt', value: 3 },
      },
    },
    {
      key: 'handoverNote',
      label: '交接说明',
      type: 'textarea',
      placeholder: '请描述需要交接的工作内容',
      span: 24,
      // 联动显示：当有交接人时显示
      linkage: {
        visibleWhen: { field: 'handover', operator: 'exists', value: true },
      },
    },
    {
      key: 'emergencyContact',
      label: '紧急联系人',
      type: 'input',
      placeholder: '请输入紧急联系人',
      span: 12,
    },
    {
      key: 'emergencyPhone',
      label: '紧急联系电话',
      type: 'input',
      placeholder: '请输入联系电话',
      span: 12,
      rules: {
        pattern: '^1[3-9]\\d{9}$',
        message: '请输入正确的手机号码',
      },
    },
  ],
  labelWidth: '120px',
  gutter: 20,
  submitButton: { text: '提交申请' },
  cancelButton: { text: '重置' },
}

// ==================== 表单数据 ====================
const formData = ref({
  applicantName: '',
  department: '',
  leaveType: '',
  startDate: '',
  endDate: '',
  days: 0,
  reason: '',
  hospitalCert: null,
  handover: '',
  handoverNote: '',
  emergencyContact: '',
  emergencyPhone: '',
})

// ==================== 事件处理 ====================
/**
 * 表单提交
 */
function handleSubmit(values: Record<string, any>) {
  console.log('表单提交数据:', values)
  ElMessage.success('提交成功！请查看控制台输出')
}

/**
 * 表单重置
 */
function handleReset() {
  console.log('表单已重置')
  ElMessage.info('表单已重置')
}

/**
 * 校验失败
 */
function handleInvalid(errors: Record<string, string>) {
  console.log('校验失败:', errors)
  const firstError = Object.values(errors)[0]
  ElMessage.error(firstError || '表单校验失败')
}
</script>

<template>
  <div class="dynamic-form-demo">
    <ElCard>
      <template #header>
        <div class="card-header">
          <h2>📋 动态表单引擎 Demo - 请假申请单</h2>
          <p class="description">
            演示基于 JSON Schema + Element Plus 表单验证的动态表单渲染与联动校验
          </p>
        </div>
      </template>

      <!-- 联动校验说明 -->
      <div class="demo-tips">
        <h4>🔗 联动校验场景：</h4>
        <ul>
          <li>选择 <strong>「病假」</strong> 后，<strong>「医院证明」</strong> 字段变为必填</li>
          <li>请假天数 <strong>> 3 天</strong> 时，<strong>「工作交接人」</strong> 字段变为必填</li>
          <li>填写交接人后，<strong>「交接说明」</strong> 字段自动显示</li>
        </ul>
      </div>

      <!-- 动态表单 -->
      <DynamicForm
        ref="formRef"
        v-model="formData"
        :schema="leaveFormSchema"
        show-submit
        show-cancel
        @submit="handleSubmit"
        @reset="handleReset"
        @invalid="handleInvalid"
      />

      <!-- 实时数据预览 -->
      <div class="data-preview">
        <h4>📊 实时表单数据：</h4>
        <pre>{{ JSON.stringify(formData, null, 2) }}</pre>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.dynamic-form-demo {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.card-header .description {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.demo-tips {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 24px;
}

.demo-tips h4 {
  margin: 0 0 8px 0;
  color: #67c23a;
  font-size: 14px;
}

.demo-tips ul {
  margin: 0;
  padding-left: 20px;
}

.demo-tips li {
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
}

.data-preview {
  margin-top: 24px;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 16px;
}

.data-preview h4 {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.data-preview pre {
  margin: 0;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  color: #303133;
  max-height: 300px;
  overflow: auto;
}
</style>
