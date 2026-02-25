/**
 * 文档引擎使用示例
 *
 * 本文件展示如何在审批流程中集成文档与表格引擎
 */

// ==================== 示例 1: 财务数据 Excel 导入 ====================
// 使用场景：批量导入报销单、发票数据

/*
<script setup lang="ts">
import { ExcelImporter } from '@/components/document'
import type { ExcelValidationRule } from '@/types/document'
import { useSubmitReimbursements } from '@/composables/useReimbursement'

// 定义验证规则
const validationRules: ExcelValidationRule[] = [
  { field: 'amount', required: true, type: 'number', message: '金额必填且为数字' },
  { field: 'date', required: true, type: 'date', message: '日期必填' },
  { field: 'category', required: true, message: '费用类别必填' },
  { field: 'description', required: false, max: 200, message: '描述最多 200 字' },
]

const submitMutation = useSubmitReimbursements()

async function handleImportComplete(data: any[]) {
  // 导入完成后提交数据
  await submitMutation.mutateAsync({ reimbursements: data })
}
</script>

<template>
  <ElDialog title="批量导入报销单" width="800px">
    <ExcelImporter
      :validation-rules="validationRules"
      :auto-validate="true"
      :max-file-size="20"
      @complete="handleImportComplete"
    />
  </ElDialog>
</template>
*/

// ==================== 示例 2: 审批数据 Excel 导出 ====================
// 使用场景：导出审批记录、财务报表

/*
<script setup lang="ts">
import { ExcelExporter } from '@/components/document'
import type { ExportColumnConfig } from '@/types/document'
import { useApprovalList } from '@/composables/useApproval'

const { data: approvals } = useApprovalList({ page: 1, size: 100 })

// 定义导出列
const columns: ExportColumnConfig[] = [
  { key: 'id', label: '申请编号', width: 15 },
  { key: 'applicant', label: '申请人', width: 12 },
  { key: 'department', label: '部门', width: 15 },
  { key: 'type', label: '审批类型', width: 12 },
  { key: 'amount', label: '金额', width: 10, format: (v) => `¥${v.toFixed(2)}` },
  { key: 'status', label: '状态', width: 10 },
  { key: 'createdAt', label: '申请时间', width: 18, format: (v) => new Date(v).toLocaleString() },
]
</script>

<template>
  <ExcelExporter
    :data="approvals || []"
    :columns="columns"
    filename="审批记录.xlsx"
    sheet-name="审批数据"
    button-type="success"
    button-text="导出 Excel"
  />
</template>
*/

// ==================== 示例 3: 电子发票 PDF 预览 ====================
// 使用场景：查看电子发票、审批单 PDF

/*
<script setup lang="ts">
import { DocumentPreview } from '@/components/document'
import { ref } from 'vue'

const invoiceUrl = ref('https://example.com/invoice/123.pdf')
const showDialog = ref(false)
</script>

<template>
  <ElButton type="primary" @click="showDialog = true">
    查看发票
  </ElButton>

  <ElDialog v-model="showDialog" title="电子发票预览" width="900px" top="5vh">
    <DocumentPreview
      :source="invoiceUrl"
      type="pdf"
      :pdf-config="{
        showToolbar: true,
        showThumbnails: true,
        enablePrint: true,
        enableDownload: true,
      }"
    />
  </ElDialog>
</template>
*/

// ==================== 示例 4: 审批单 PDF 预览 ====================
// 使用场景：查看已审批通过的单据

/*
<script setup lang="ts">
import { PdfViewer } from '@/components/document'
import { usePdfViewer } from '@/composables/usePdfViewer'
import { ref, onMounted } from 'vue'

const containerRef = ref<HTMLElement | null>(null)
const pdfViewer = usePdfViewer({
  initialPage: 1,
  showToolbar: true,
  showThumbnails: false,
})

onMounted(async () => {
  // 加载审批单 PDF
  await pdfViewer.loadPdf(new URL('/api/approval/123/pdf', window.location.href))
})
</script>

<template>
  <div class="approval-sheet-preview">
    <PdfViewer
      ref="pdfViewer"
      :config="{
        defaultScale: 1.2,
        enablePrint: true,
        enableDownload: true,
      }"
    />
  </div>
</template>
*/

// ==================== 示例 5: 统一文档预览（自动识别类型） ====================
// 使用场景：附件预览、文档库

/*
<script setup lang="ts">
import { DocumentPreview } from '@/components/document'
import { ref } from 'vue'

interface Attachment {
  id: string
  name: string
  url: string
  type?: 'excel' | 'pdf'
}

const attachments = ref<Attachment[]>([
  { id: '1', name: '财务报表.xlsx', url: '/files/report.xlsx' },
  { id: '2', name: '合同.pdf', url: '/files/contract.pdf' },
])

const previewSource = ref<string | null>(null)
const previewVisible = ref(false)

function openPreview(attachment: Attachment) {
  previewSource.value = attachment.url
  previewVisible.value = true
}
</script>

<template>
  <!-- 附件列表 -->
  <div class="attachment-list">
    <div
      v-for="att in attachments"
      :key="att.id"
      class="attachment-item"
      @click="openPreview(att)"
    >
      <el-icon><Document /></el-icon>
      <span>{{ att.name }}</span>
    </div>
  </div>

  <!-- 统一预览对话框 -->
  <ElDialog
    v-model="previewVisible"
    title="文档预览"
    width="1000px"
    top="5vh"
  >
    <DocumentPreview
      v-if="previewSource"
      :source="previewSource"
      auto-load
    />
  </ElDialog>
</template>
*/

// ==================== 示例 6: 字段映射导入 ====================
// 使用场景：导入外部系统数据，需要字段映射

/*
<script setup lang="ts">
import { ExcelImporter, ExcelFieldMapper } from '@/components/document'
import { ref } from 'vue'

const showMapper = ref(false)
const excelData = ref<Record<string, any[]>>({})

// 目标系统字段
const targetSchema = [
  { key: 'employeeId', label: '员工编号', required: true },
  { key: 'employeeName', label: '姓名', required: true },
  { key: 'department', label: '部门', required: true },
  { key: 'position', label: '职位', required: false },
  { key: 'hireDate', label: '入职日期', required: true, type: 'date' },
  { key: 'salary', label: '薪资', required: false, type: 'number' },
]

async function handleFileChange(file: File) {
  // 文件解析完成后显示字段映射
  showMapper.value = true
}
</script>

<template>
  <ExcelImporter
    :parse-options="{ maxRows: 10000 }"
    @change="handleFileChange"
    @complete="(data) => excelData = data"
  />

  <ElDialog
    v-model="showMapper"
    title="字段映射"
    width="600px"
  >
    <ExcelFieldMapper
      :columns="excelData.columns"
      :target-schema="targetSchema"
      @mapped="handleMappingComplete"
    />
  </ElDialog>
</template>
*/

// ==================== 示例 7: 在审批详情页集成 PDF 预览 ====================
// 使用场景：审批详情中查看附件

/*
<script setup lang="ts">
import { DocumentPreview } from '@/components/document'
import { useRoute } from 'vue-router'
import { computed, ref } from 'vue'

const route = useRoute()

// 假设有发票附件列表
const attachments = computed(() => [
  { name: '电子发票.pdf', url: `/api/approval/${route.params.id}/invoice` },
  { name: '审批单.pdf', url: `/api/approval/${route.params.id}/sheet` },
])

const currentPreview = ref<string | null>(null)
const previewVisible = ref(false)
</script>

<template>
  <ElCard title="附件">
    <div class="attachment-list">
      <el-button
        v-for="(att, index) in attachments"
        :key="index"
        type="primary"
        link
        @click="() => {
          currentPreview = att.url
          previewVisible = true
        }"
      >
        <el-icon><Document /></el-icon>
        {{ att.name }}
      </el-button>
    </div>
  </ElCard>

  <ElDialog
    v-model="previewVisible"
    title="附件预览"
    width="1000px"
    top="5vh"
  >
    <DocumentPreview
      v-if="currentPreview"
      :source="currentPreview"
      type="pdf"
      :pdf-config="{
        showToolbar: true,
        showThumbnails: true,
      }"
    />
  </ElDialog>
</template>
*/

export {}
