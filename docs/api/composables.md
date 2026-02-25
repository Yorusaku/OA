# Composables API

组合式函数（Composables）是基于 Vue 3 Composition API 的逻辑复用模式。

## 审批相关

### useApprovalList

获取审批列表。

```ts
function useApprovalList(params: MaybeRef<PageParams & { status?: string }>)
```

**参数:**
- `params` - 查询参数（页码、页数、状态）

**返回:**
- `data` - 审批列表数据
- `isLoading` - 加载状态
- `error` - 错误信息

**示例:**
```ts
const { data, isLoading } = useApprovalList({ page: 1, pageSize: 10 })
```

---

### useApprovalDetail

获取审批详情。

```ts
function useApprovalDetail(id: MaybeRef<string>)
```

**参数:**
- `id` - 审批 ID

**返回:**
- `data` - 审批详情
- `isLoading` - 加载状态

---

### useWorkbenchStats

获取工作台统计数据。

```ts
function useWorkbenchStats()
```

**返回:**
- `data` - 统计数据（待办、已办等）

---

### useSubmitApproval

提交审批。

```ts
function useSubmitApproval()
```

**返回:**
- `mutate` - 提交方法
- `isPending` - 提交中状态

**示例:**
```ts
const { mutate } = useSubmitApproval()
mutate(formData)
```

## 部门相关

### useDeptTree

获取部门树。

```ts
function useDeptTree()
```

**返回:**
- `data` - 部门树数据

---

### useDeptList

获取部门列表（扁平化）。

```ts
function useDeptList()
```

**返回:**
- `data` - 扁平化部门列表

## 字典相关

### useDictByType

根据类型获取字典数据。

```ts
function useDictByType(dictType: MaybeRef<string>)
```

**参数:**
- `dictType` - 字典类型（如 'gender', 'status'）

---

### useAllDict

获取所有字典数据。

```ts
function useAllDict()
```

## 工作流相关

### useWorkflowList

获取流程定义列表。

```ts
function useWorkflowList(params?: { page: number, pageSize: number })
```

---

### useWorkflowDetail

获取流程定义详情。

```ts
function useWorkflowDetail(id: string)
```

---

### useCreateWorkflow

创建流程定义。

```ts
function useCreateWorkflow()
```

---

### useUpdateWorkflow

更新流程定义。

```ts
function useUpdateWorkflow()
```

---

### useSaveWorkflow

保存流程定义（智能判断创建或更新）。

```ts
function useSaveWorkflow()
```

**示例:**
```ts
const { save, isPending } = useSaveWorkflow()
await save(workflowData)
```

## 工具相关

### useECharts

ECharts 图表 Hook。

```ts
function useECharts(containerRef: Ref<HTMLElement | null>, options: Ref<EChartsOption>)
```

**参数:**
- `containerRef` - 图表容器元素引用
- `options` - 图表配置项

**返回:**
- `chartInstance` - 图表实例
- `updateChart` - 更新图表方法
- `resizeChart` - 调整大小方法

---

### useNotification

通知中心 Hook。

```ts
function useNotification()
```

**返回:**
- `notifySuccess` - 成功通知
- `notifyError` - 错误通知
- `unreadCount` - 未读消息数

---

### useDynamicValidate

动态表单验证 Hook。

```ts
function useDynamicValidate(schemaFields: Ref<FormFieldSchema[]>, formValues: Ref<Record<string, any>>)
```

**返回:**
- `isFieldRequired` - 判断字段是否必填
- `isFieldVisible` - 判断字段是否可见
- `isFieldDisabled` - 判断字段是否禁用

---

### useExcelExport

Excel 导出 Hook。

```ts
function useExcelExport(options?: UseExcelExportOptions)
```

**返回:**
- `exportExcel` - 导出 Excel
- `downloadExcel` - 导出并下载
- `isExporting` - 导出中状态

---

### useExcelImport

Excel 导入 Hook。

```ts
function useExcelImport(options?: UseExcelImportOptions)
```

**返回:**
- `parseFile` - 解析文件
- `validateData` - 验证数据
- `isParsing` - 解析中状态

---

### usePdfViewer

PDF 查看器 Hook。

```ts
function usePdfViewer(options?: UsePdfViewerOptions)
```

**返回:**
- `loadPdf` - 加载 PDF
- `renderPage` - 渲染页面
- `currentPage` - 当前页码
- `totalPages` - 总页数

---

### useQueryErrorHandler

Vue Query 错误处理工具。

```ts
function handleQueryError(error: any, options?: ErrorHandlerOptions)
```

**参数:**
- `error` - 错误对象
- `options` - 处理选项（showMessage, showNotification 等）
