# 阶段 14 Prompt：工作流引擎迁移至 LogicFlow（全量重构）✅ **已完成**

> 用途：记录工作流引擎从 Vue Flow 迁移至 LogicFlow 的完整过程和技术方案。
> **当前状态**：迁移已完成，工作流引擎现在基于 LogicFlow 实现。

---

## 一、项目背景

- **项目名称**：全景智能 OA 协同办公平台（企业级 OA / 人事协同中台）
- **当前状态**：阶段 0～13 已完成，包括 Monorepo 基建、Vue Query、动态表单引擎、工作流引擎、业务模块、性能优化、代码质量、功能增强、DevOps、文档与表格引擎。
- **问题背景**：当前工作流引擎基于 `@vue-flow/core` 实现，但其内部状态机与 Vue 3 的深层 Proxy 响应式产生了严重冲突，导致：
  - 拖拽失效（浏览器拦截 dataTransfer）
  - 响应式断裂（节点位置更新不同步）
  - 死循环问题（watch 与事件循环）
- **本轮目标**：**彻底废弃 Vue Flow，全量迁移至原生 JS 驱动的 LogicFlow**，利用其框架无关特性，解耦图形渲染状态与业务表单数据。

---

## 二、技术选型对比

| 特性 | Vue Flow | LogicFlow | 迁移收益 |
|------|----------|-----------|----------|
| 框架依赖 | Vue 3 强耦合 | 框架无关 | ✅ 解耦响应式 |
| 状态管理 | 内部响应式状态 | 独立实例 | ✅ 避免死循环 |
| 拖拽实现 | 原生 HTML5 | DndPanel 插件 | ✅ 官方接管 |
| 节点渲染 | Vue 组件 | SVG + HTML 节点 | ⚠️ 需适配 |
| API 设计 | Composition API | 命令式 API | ⚠️ 需重构 |

---

## 三、迁移范围

### 受影响的文件

```
apps/web/
├── package.json                          ← Phase 1 (依赖替换)
└── src/components/workflow/
    ├── index.ts                          ← Phase 1 (导出更新)
    ├── WorkflowCanvas.vue                ← Phase 2 (彻底重写)
    ├── NodeConfigPanel.vue               ← 保持不变 (配置面板独立)
    └── nodes/
        ├── StartNode.vue                 ← Phase 4 (适配或废弃)
        ├── ApprovalNode.vue              ← Phase 4 (适配或废弃)
        ├── CcNode.vue                    ← Phase 4 (适配或废弃)
        ├── ConditionNode.vue             ← Phase 4 (适配或废弃)
        └── EndNode.vue                   ← Phase 4 (适配或废弃)
└── src/views/workflow/
    ├── WorkflowEditor.vue                ← Phase 3 (拖拽逻辑修改)
    └── components/
        ├── ToolbarAside.vue              ← Phase 3 (DndPanel 集成)
        ├── EditorHeader.vue              ← 保持不变
        └── index.ts                      ← 保持不变
```

### 保持不变的部分

- `apps/web/src/types/workflow.ts` - 业务数据结构不变
- `apps/web/src/components/workflow/NodeConfigPanel.vue` - 配置面板独立于图形库
- `apps/web/src/views/workflow/composables/useWorkflowEditor.ts` - 组合式函数基本不变

---

## 四、执行阶段 (Phases)

### Phase 1: 依赖替换与基础设施搭建

**目标**: 完成依赖切换，建立 LogicFlow 基础环境

#### 修改文件

| 文件 | 操作 |
|------|------|
| `apps/web/package.json` | 移除 `@vue-flow/*` 相关依赖，添加 `@logicflow/core` 和 `@logicflow/extension` |
| `apps/web/src/components/workflow/index.ts` | 更新导出，移除 Vue Flow 相关导出 |

#### 依赖变更

```json
// 移除
- "@vue-flow/core": "^1.x"
- "@vue-flow/background": "^1.x"
- "@vue-flow/controls": "^1.x"
- "@vue-flow/minimap": "^1.x"

// 添加
+ "@logicflow/core": "^1.2.0"
+ "@logicflow/extension": "^1.2.0"
```

#### 关键决策

- LogicFlow 实例使用 `shallowRef` 或普通变量 `let lf` 存储，避免 Vue 深度代理
- 不立即删除旧节点组件，保持代码可回滚

---

### Phase 2: WorkflowCanvas 核心重构

**目标**: 重写画布组件，使用 LogicFlow 原生 API 实现

#### 修改文件

| 文件 | 操作 |
|------|------|
| `apps/web/src/components/workflow/WorkflowCanvas.vue` | **彻底重写** |

#### 核心重构点

##### 2.1 状态存储改造

```typescript
// ❌ 旧方式 (Vue Flow)
const { addNodes, removeNodes, findNode, getNodes, getEdges } = useVueFlow()

// ✅ 新方式 (LogicFlow)
let lf: LogicFlow | null = null  // 普通变量，不被响应式代理
const containerRef = ref<HTMLElement | null>(null)
```

##### 2.2 数据适配器 (Adapter)

在组件内部实现双向转换，保持外部业务数据结构不变：

```typescript
// WorkflowDefinition → LogicFlow GraphData
function toLogicFlowData(definition: WorkflowDefinition): GraphData {
  return {
    nodes: definition.nodes.map(node => ({
      id: node.id,
      type: node.type,
      x: node.position?.x || 0,
      y: node.position?.y || 0,
      text: node.name,
      properties: { ...node }  // 保留完整业务数据
    })),
    edges: definition.edges.map(edge => ({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      text: edge.label,
      properties: { ...edge }
    }))
  }
}

// LogicFlow GraphData → WorkflowDefinition
function toWorkflowDefinition(graphData: GraphData): WorkflowDefinition {
  return {
    id: '',
    name: '',
    status: 'draft',
    nodes: graphData.nodes.map(node => {
      // 注意：LogicFlow 导出的 node.text 可能是字符串，也可能是带有 value 属性的对象
      const textValue = typeof node.text === 'string' ? node.text : node.text?.value
      return {
        id: node.id,
        type: node.type as WorkflowNodeType,
        name: textValue || '',
        position: { x: node.x || 0, y: node.y || 0 },
        ...node.properties
      }
    }),
    edges: graphData.edges.map(edge => {
      const textValue = typeof edge.text === 'string' ? edge.text : edge.text?.value
      return {
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: textValue || '',
        ...edge.properties
      }
    })
  }
}
```

> **注意**：LogicFlow 导出的 `node.text` 可能是字符串，也可能是带有 `value` 属性的对象，Adapter 需要做好兼容处理 `typeof node.text === 'string' ? node.text : node.text?.value`。

##### 2.3 生命周期管理

```typescript
onMounted(() => {
  lf = new LogicFlow({
    container: containerRef.value!,
    width: containerRef.value!.clientWidth,
    height: containerRef.value!.clientHeight,
    grid: {
      visible: true,
      type: 'dot',
      size: 20
    },
    style: {
      rect: {
        rx: 6,
        ry: 6
      }
    },
    stopScrollZoom: false,
    stopMoveGraph: false
  })

  // 渲染初始数据
  const graphData = toLogicFlowData(props.definition)
  lf.render(graphData)

  // 绑定事件
  lf.on('node:click', handleNodeClick)
  lf.on('edge:click', handleEdgeClick)
  lf.on('node:dragend', handleNodeDragEnd)
  lf.on('edge:add', handleEdgeAdd)
  lf.on('edge:delete', handleEdgeDelete)
})

onBeforeUnmount(() => {
  lf?.destroy()
  lf = null
})
```

##### 2.4 事件映射表

| Vue Flow 事件 | LogicFlow 事件 | 说明 |
|--------------|----------------|------|
| `onConnect` | `edge:add` | 添加连线 |
| `onNodeClick` | `node:click` | 节点点击 |
| `onEdgeClick` | `edge:click` | 边点击 |
| `onNodeDragStop` | `node:dragend` | 拖拽结束 |
| `@nodes-change` | `node:dragend` + `getData()` | 位置变化 |
| `@edges-change` | `edge:add` / `edge:delete` | 边变化 |
| `@nodeDrop` | `node:add` | 节点添加 |

##### 2.5 对外暴露方法

```typescript
defineExpose({
  addNode(node: WorkflowNode) {
    if (props.readonly) return
    const lfNode = lf!.addNode({
      id: node.id,
      type: node.type,
      x: node.position?.x || 0,
      y: node.position?.y || 0,
      text: node.name
    })
  },

  deleteNode(nodeId: string) {
    if (props.readonly) return
    lf!.deleteNode(nodeId)
  },

  updateNode(node: WorkflowNode) {
    lf!.setProperties(node.id, { ...node })
  },

  getDefinition(): WorkflowDefinition {
    const graphData = lf!.getData()
    return toWorkflowDefinition(graphData)
  }
})
```

---

### Phase 3: 拖拽交互重构 (startDrag API 接管)

**目标**: 使用 LogicFlow 的 `startDrag` API 接管外部拖拽

#### 修改文件

| 文件 | 操作 |
|------|------|
| `apps/web/src/views/workflow/WorkflowEditor.vue` | 修改拖拽逻辑 |
| `apps/web/src/views/workflow/components/ToolbarAside.vue` | 修改拖拽事件绑定 |

#### 核心改造

##### 3.1 简化方案：直接使用 startDrag API

> **注意**：不需要在 Toolbar 实例化额外的 LF。直接保留原有的 HTML 按钮，把 `@dragstart` 替换为 `@mousedown`，并在事件里直接调用 `canvasRef.value.startDrag({ type: 'rect', text: '节点名', properties: {...} })` 即可。

```vue
<!-- ToolbarAside.vue -->
<template>
  <ElButton
    @mousedown="handleDragStart($event, 'start')"
  >
    发起节点
  </ElButton>
</template>

<script setup lang="ts">
// 在 WorkflowEditor.vue 中
function handleDragStart(event: MouseEvent, type: WorkflowNodeType) {
  const nodeConfig = {
    type: 'rect',
    text: getNodeTypeText(type),
    properties: { type }
  }
  canvasRef.value?.startDrag(nodeConfig)
}
</script>
```

**优势**：
- 无需额外的 LogicFlow 实例
- 无需 DndPanel 插件
- 代码更简洁，逻辑更直接

---

### Phase 4: 节点组件适配与清理

**目标**: 适配 LogicFlow 节点渲染方式，清理废弃代码

#### 修改文件

| 文件 | 操作 |
|------|------|
| `apps/web/src/components/workflow/nodes/*.vue` | 适配为 LogicFlow HTML 节点或暂时保留 |

#### 核心方案

##### 方案 A: 使用 LogicFlow 默认节点 (初期推荐)

直接使用 LogicFlow 的 `rect` 节点，通过 `setTheme` 自定义样式：

```typescript
lf.setTheme({
  rect: {
    rx: 8,
    ry: 8,
    stroke: '#409eff',
    fill: '#ecf5ff',
    strokeWidth: 2
  },
  text: {
    color: '#303133',
    fontSize: 12
  }
})

// 根据节点类型设置不同样式
function setNodeStyle(nodeId: string, type: WorkflowNodeType) {
  const styleMap: Record<string, any> = {
    start: { fill: '#667eea', stroke: '#667eea', color: '#fff' },
    approval: { fill: '#ecf5ff', stroke: '#409eff', color: '#303133' },
    cc: { fill: '#f0f9ff', stroke: '#67c23a', color: '#303133' },
    condition: { fill: '#fdf6ec', stroke: '#e6a23c', color: '#303133' },
    end: { fill: '#f4f4f5', stroke: '#909399', color: '#303133' }
  }

  lf!.setElementStyle(nodeId, styleMap[type])
}
```

**优点**：
- 简单快速，无兼容问题
- 性能更好（SVG 渲染）
- 样式统一易维护

**缺点**：
- 无法使用 Vue 组件的复杂交互
- 图标和自定义内容受限

##### 方案 B: 挂载 Vue 组件为 HTML 节点 (后期优化)

```typescript
import { HtmlNode, HtmlNodeModel } from '@logicflow/core'
import { createApp, h } from 'vue'
import ApprovalNode from './nodes/ApprovalNode.vue'

class VueHtmlNode extends HtmlNode {
  setHtml(root: HTMLElement) {
    const node = this.getModel()
    const data = node.properties as WorkflowNode

    // 使用 Vue createApp 挂载组件
    const app = createApp(() => h(ApprovalNode, {
      data: data,
      onClick: () => {
        this.props.graphModel.eventCenter.emit('node:click', { data })
      }
    }))

    app.mount(root)
  }
}

class VueHtmlNodeModel extends HtmlNodeModel {
  setAttributes() {
    this.width = 200
    this.height = 100
  }
}

lf.register({
  type: 'vue-html',
  view: VueHtmlNode,
  model: VueHtmlNodeModel
})
```

**优点**：
- 保留 Vue 组件的完整能力
- 可复用现有节点组件

**缺点**：
- 实现复杂，需要处理生命周期
- 性能开销较大

#### 推荐策略

**Phase 4 先使用方案 A**，确保核心功能跑通，后续再单独开分支做 HTML 节点美化。

---

### Phase 5: 测试验证与收尾

**目标**: 确保迁移后功能完整，无回归 Bug

#### 测试清单

| 测试项 | 验证点 | 预期结果 |
|--------|--------|----------|
| 流程加载 | 从后端加载流程定义 | 正确渲染所有节点和边 |
| 添加节点 | 从工具栏拖拽节点到画布 | 成功添加并显示 |
| 删除节点 | 选中节点按 Delete 删除 | 节点消失，连线移除 |
| 节点连线 | 从节点拖拽连接到另一个节点 | 成功创建边 |
| 节点配置 | 点击节点弹出配置面板 | 显示节点属性 |
| 配置保存 | 修改节点属性后保存 | 画布实时更新 |
| 流程保存 | 点击保存按钮 | 数据格式正确，后端接收成功 |
| 响应式更新 | 修改节点属性 | 画布实时更新 |
| 禁用状态 | readonly 模式 | 不可编辑，可查看 |

#### 验收标准

1. ✅ 所有 Phase 1-4 的功能正常
2. ✅ 无 `@vue-flow/*` 相关代码残留
3. ✅ TypeScript 类型检查通过
4. ✅ 控制台无报错
5. ✅ 流程保存/加载数据完整
6. ✅ 拖拽流畅，无浏览器拦截问题
7. ✅ 节点位置保存后正确还原

---

## 五、架构指导原则

### 1. 状态隔离

**核心原则**：LogicFlow 实例（`lf`）绝对不能被 Vue 的 `ref` 或 `reactive` 深度代理。

```typescript
// ✅ 正确方式
let lf: LogicFlow | null = null

// 或
const lfRef = shallowRef<LogicFlow | null>(null)

// ❌ 错误方式
const lfRef = ref<LogicFlow | null>(null)  // 会被深度代理
const lfState = reactive({ lf: null })     // 会被深度代理
```

### 2. 拖拽接管

**核心原则**：放弃原生 HTML5 的 `dragstart` 和 `drop` 手写逻辑，统一改用 LogicFlow 官方的 `DndPanel` 插件接管外部拖拽入场。

```typescript
// ❌ 移除手写的拖拽处理
onDragOver(event) { ... }
onDrop(event) { ... }

// ✅ 使用 DndPanel
import { DndPanel } from '@logicflow/extension'
lf.use(new DndPanel({ isCrossDnd: true }))
```

### 3. 数据适配器

**核心原则**：保持外部业务的 `WorkflowDefinition` 数据结构不变，在 `WorkflowCanvas.vue` 内部编写 Adapter，将其转换为 LogicFlow 需要的 `graphData`。

```typescript
// 业务层保持原有数据结构
interface WorkflowDefinition {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// 画布内部转换
function toLogicFlowData(def: WorkflowDefinition): GraphData {
  // 转换逻辑
}

function toWorkflowDefinition(data: GraphData): WorkflowDefinition {
  // 转换逻辑
}
```

---

## 六、预计工作量

| Phase | 预计时间 | 风险等级 |
|-------|----------|----------|
| Phase 1: 依赖替换 | 30 分钟 | 🟢 低 |
| Phase 2: 画布重构 | 2-3 小时 | 🟡 中 |
| Phase 3: 拖拽重构 | 1-2 小时 | 🟡 中 |
| Phase 4: 节点适配 | 1 小时 | 🟢 低 |
| Phase 5: 测试验证 | 1 小时 | 🟢 低 |
| **合计** | **5-7 小时** | - |

---

## 七、风险与应对

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| LogicFlow 功能不如 Vue Flow 丰富 | 中 | 优先保证核心功能，高级功能后续扩展 |
| HTML 节点挂载复杂 | 中 | Phase 4 先用默认节点，后续单独优化 |
| 数据格式不兼容 | 高 | 编写完善的 Adapter 转换层 |
| 拖拽体验差异 | 低 | 调整 DndPanel 配置参数优化 |
| 现有节点组件无法复用 | 中 | 先用默认样式，后续逐步替换 |

---

## 八、迁移完成标志

- [ ] `package.json` 中无 `@vue-flow/*` 依赖
- [ ] 代码中无 `@vue-flow/*` 导入
- [ ] 画布能正常加载、编辑、保存流程
- [ ] 所有节点类型可拖拽添加
- [ ] 节点连线功能正常
- [ ] 配置面板可正常编辑节点属性
- [ ] 流程保存后重新加载数据完整
- [ ] 控制台无报错和警告
- [ ] TypeScript 类型检查通过

---

## 九、执行步骤

请按照以下步骤执行迁移：

**第 1 步**：用不超过 10 行话复述你对本轮迁移任务的理解。

**第 2 步**：列出 5-8 条你将执行的具体步骤。

**第 3 步**：**只输出 Phase 1 的代码！然后立刻停止！** 询问我「Phase 1 是否运行成功？」。

**第 4 步及以后**：绝对禁止在没有我明确回复「继续」的情况下，输出 Phase 2 及以后的代码。每完成一个 Phase 后必须等待确认。

---

## 十、后续优化方向

迁移完成后，可考虑以下优化：

1. **自定义主题**：根据 Element Plus 主题定制 LogicFlow 节点样式
2. **HTML 节点**：使用方案 B 挂载 Vue 组件，实现复杂交互
3. **快照功能**：实现流程版本快照和回滚
4. **协同编辑**：集成 WebSocket 实现多人协同编辑
5. **性能优化**：大规模节点（100+）时的渲染优化

---

现在，请你从阅读并理解上述约束开始，先复述你对本轮迁移任务的理解，然后给出你的执行步骤，再开始真正修改代码。
