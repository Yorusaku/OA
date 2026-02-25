# HTTP 与 API

## HTTP 客户端

封装 Axios，统一处理请求响应拦截和错误处理。

**位置:** `apps/web/src/api/http.ts`

### 创建实例

```ts
import http from '@/api/http'

// 或使用导出方法
import { get, post, put, del } from '@/api/http'
```

### 请求方法

```ts
// GET 请求
get<T>(url: string, config?: AxiosRequestConfig): Promise<T>

// POST 请求
post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>

// PUT 请求
put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>

// DELETE 请求
del<T>(url: string, config?: AxiosRequestConfig): Promise<T>
```

### 使用示例

```ts
import { get, post } from '@/api/http'

// GET 请求
const users = await get<User[]>('/users')

// POST 请求
const result = await post('/users', { name: 'John' })
```

### 拦截器

**请求拦截器:**
- 自动添加 `Authorization: Bearer <token>` 头

**响应拦截器:**
- 统一处理业务错误（code !== 200）
- 401 自动跳转登录页
- 其他错误显示 ElMessage 提示

---

## 业务 API

### 审批 API

**位置:** `apps/web/src/api/approval.ts`

| 方法 | 说明 | 参数 |
|------|------|------|
| `getApprovalList` | 获取审批列表 | `PageParams & { status?: string }` |
| `getApprovalDetail` | 获取审批详情 | `id: string` |
| `submitApproval` | 提交审批 | `data: Omit<ApprovalRecord, ...>` |
| `getWorkbenchStats` | 获取工作台统计 | - |

**示例:**
```ts
import { getApprovalList, getApprovalDetail } from '@/api/approval'

const list = await getApprovalList({ page: 1, pageSize: 10 })
const detail = await getApprovalDetail('123')
```

---

### 工作流 API

**位置:** `apps/web/src/api/workflow.ts`

| 方法 | 说明 | 参数 |
|------|------|------|
| `getWorkflowDefinitions` | 获取流程列表 | `PageParams` |
| `getWorkflowDefinition` | 获取流程详情 | `id: string` |
| `createWorkflowDefinition` | 创建流程 | `WorkflowDefinition` |
| `updateWorkflowDefinition` | 更新流程 | `id, data` |
| `deleteWorkflowDefinition` | 删除流程 | `id: string` |
| `getFormSchemas` | 获取表单 Schema | - |

---

### 部门 API

**位置:** `apps/web/src/api/dept.ts`

| 方法 | 说明 |
|------|------|
| `getDeptTree` | 获取部门树 |
| `getDeptList` | 获取部门列表（扁平化） |

---

### 字典 API

**位置:** `apps/web/src/api/dict.ts`

| 方法 | 说明 |
|------|------|
| `getDictByType` | 根据类型获取字典 |
| `getAllDict` | 获取所有字典 |

---

## 类型定义

**位置:** `apps/web/src/api/types.ts`

### ApiResponse

API 统一响应结构。

```ts
interface ApiResponse<T = any> {
  code: number       // 200 表示成功
  message: string    // 响应消息
  data: T            // 响应数据
}
```

### PageParams

分页请求参数。

```ts
interface PageParams {
  page: number       // 页码（从 1 开始）
  pageSize: number   // 每页数量
}
```

### PageResult

分页响应结果。

```ts
interface PageResult<T> {
  list: T[]          // 数据列表
  total: number      // 总记录数
  page: number       // 当前页码
  pageSize: number   // 每页数量
}
```

### 业务类型

```ts
// 字典项
interface DictionaryItem {
  id: string
  dictType: string
  dictCode: string
  dictLabel: string
  dictValue: string
}

// 部门
interface Department {
  id: string
  name: string
  parentId?: string
  children?: Department[]
}

// 审批记录
interface ApprovalRecord {
  id: string
  title: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  applicant: string
  applyTime: string
}
```

---

## Query Keys

**位置:** `apps/web/src/api/queryKeys.ts`

统一管理 Vue Query 的 queryKey。

```ts
import { queryKeys } from '@/api/queryKeys'

// 使用示例
queryKeys.approval.list({ page: 1 })
// ['approval', 'list', { page: 1 }]

queryKeys.approval.detail('123')
// ['approval', 'detail', '123']
```

### Query Key 结构

| 模块 | Key |
|------|-----|
| 审批 | `approval.list`, `approval.detail`, `approval.stats` |
| 部门 | `dept.tree`, `dept.list` |
| 字典 | `dict.byType`, `dict.all` |
| 工作流 | `workflow.list`, `workflow.detail`, `workflow.formSchemas` |
