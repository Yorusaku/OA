import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowStatus } from '@/types/workflow'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFormSchemas, useSaveWorkflow, useWorkflowDetail } from '@/composables/useWorkflow'
import { createDefaultNodes, generateId, getDefaultNodeName, getDefaultPosition } from '../utils'

export function useWorkflowEditor(workflowId: string) {
  const router = useRouter()

  const isNew = computed(() => workflowId === 'new')

  const canvasRef = ref<InstanceType<typeof import('@/components/workflow/WorkflowCanvas.vue').default> | null>(null)

  const workflowName = ref('')
  const workflowDescription = ref('')
  const workflowStatus = ref<WorkflowStatus>('draft')
  const selectedNode = ref<WorkflowNode | undefined>()

  const definition = ref<WorkflowDefinition>({
    id: '',
    name: '',
    description: '',
    status: 'draft',
    nodes: [],
    edges: [],
  })

  const { data: workflowData } = useWorkflowDetail(isNew.value ? '' : workflowId)
  const { data: formSchemas } = useFormSchemas()
  const saveMutation = useSaveWorkflow()

  watch(
    workflowData,
    (data) => {
      console.log('📊 workflowData changed:', data)
      if (data) {
        console.log('📋 Data nodes count:', data.nodes?.length)
        console.log('📋 Data nodes:', data.nodes)
        definition.value = JSON.parse(JSON.stringify(data))
        workflowName.value = data.name || ''
        workflowDescription.value = data.description || ''
        workflowStatus.value = data.status || 'draft'
        console.log('✅ definition.value updated, nodes count:', definition.value.nodes.length)
        console.log('✅ definition.value.nodes:', definition.value.nodes)
      }
    },
    { immediate: true },
  )

  watch(
    () => isNew.value,
    (val) => {
      console.log('🔄 isNew changed:', val, 'nodes length:', definition.value.nodes.length)
      if (val && definition.value.nodes.length === 0) {
        const defaultNodes = createDefaultNodes()
        definition.value.nodes = defaultNodes
        console.log('✅ Created default nodes:', defaultNodes)
      }
    },
    { immediate: true },
  )

  function handleAddNode(type: WorkflowNode['type']) {
    const newNode: WorkflowNode = {
      id: generateId(type),
      type,
      name: getDefaultNodeName(type),
      description: '',
      handler: type === 'approval' || type === 'cc' ? { type: 'role', mode: 'or' } : undefined,
      position: getDefaultPosition(definition.value.nodes),
      enabled: true,
    }

    definition.value.nodes = [...definition.value.nodes, newNode]
    console.log('✅ handleAddNode: Adding node', newNode)
    canvasRef.value?.addNode(newNode)
  }

  function handleDragStart(event: MouseEvent, type: WorkflowNode['type']) {
    // 阻止默认事件，防止浏览器拦截
    event.preventDefault()
    
    console.log('🖐️ handleDragStart called with type:', type)
    console.log('🖐️ canvasRef.value:', canvasRef.value)

    // 使用 LogicFlow 的 startDrag API 接管拖拽
    const nodeConfig = {
      type: 'rect',
      text: getDefaultNodeName(type),
      properties: {
        type,
        name: getDefaultNodeName(type),
        description: '',
        handler: type === 'approval' || type === 'cc' ? { type: 'role', mode: 'or' } : undefined,
        enabled: true
      }
    }
    
    if (!canvasRef.value) {
      console.error('❌ canvasRef.value is null')
      return
    }
    
    console.log('🖐️ Calling startDrag with:', nodeConfig)
    canvasRef.value.startDrag(nodeConfig)
  }

  function handleNodeDrop(type: WorkflowNode['type'], position: { x: number, y: number }) {
    // LogicFlow 的 startDrag 会自动处理节点添加，这里只需要更新本地数据
    // 注意：此时节点已经被添加到画布，我们只需要同步数据
    console.log('📍 handleNodeDrop: Node dropped at', position, 'type:', type)
    
    // 从画布获取最新的节点数据
    const newDefinition = canvasRef.value?.getDefinition()
    if (newDefinition) {
      // 找到最新添加的节点（通过比较数量）
      const lastNode = newDefinition.nodes[newDefinition.nodes.length - 1]
      if (lastNode && !definition.value.nodes.find(n => n.id === lastNode.id)) {
        definition.value.nodes = [...definition.value.nodes, lastNode]
        console.log('✅ handleNodeDrop: Node synced', lastNode)
      }
    }
  }

  function handleNodeChange(nodes: WorkflowNode[]) {
    definition.value.nodes = nodes
  }

  function handleEdgeChange(edges: WorkflowEdge[]) {
    definition.value.edges = edges
  }

  function handleNodeSelect(node: WorkflowNode) {
    selectedNode.value = node
  }

  function handleNodeDelete(nodeId: string) {
  // 1. 更新本地定义数据
  definition.value.nodes = definition.value.nodes.filter(n => n.id !== nodeId)
  definition.value.edges = definition.value.edges.filter(
    e => e.source !== nodeId && e.target !== nodeId,
  )
  selectedNode.value = undefined
  ElMessage.success('节点已删除')
  
  // 2. 修复：主动通知画布将这个 DOM 销毁
  canvasRef.value?.deleteNode(nodeId)
}

function handleNodeUpdate(updatedNode: WorkflowNode) {
  const index = definition.value.nodes.findIndex(n => n.id === updatedNode.id)
  if (index !== -1) {
    definition.value.nodes[index] = updatedNode
    selectedNode.value = { ...updatedNode }

    if (canvasRef.value) {
      console.log('🔄 正在通知 Canvas 更新节点...')
      canvasRef.value.updateNode(updatedNode)
    } else {
      console.error('❌ canvasRef 为空，无法调用画布更新！')
    }
  }
}

  async function handleSave() {
    if (!workflowName.value.trim()) {
      ElMessage.warning('请输入流程名称')
      return
    }

    const hasStart = definition.value.nodes.some(n => n.type === 'start')
    if (!hasStart) {
      ElMessage.warning('流程必须包含一个发起节点')
      return
    }

    try {
      const data: WorkflowDefinition = {
        ...definition.value,
        id: isNew.value ? '' : workflowId,
        name: workflowName.value,
        description: workflowDescription.value,
        status: workflowStatus.value,
      }

      await saveMutation.save(data)
      ElMessage.success('保存成功')

      if (isNew.value && data.id) {
        router.push(`/workflow/editor/${data.id}`)
      }
    }
    catch {
      ElMessage.error('保存失败')
    }
  }

  function handleBack() {
    router.push('/workflow/list')
  }

  watch(
    () => isNew.value,
    (val) => {
      if (val && definition.value.nodes.length === 0) {
        definition.value.nodes = createDefaultNodes()
      }
    },
    { immediate: true },
  )

  return {
    isNew,
    canvasRef,
    workflowName,
    workflowDescription,
    workflowStatus,
    selectedNode,
    definition,
    formSchemas,
    saveMutation,
    handleAddNode,
    handleDragStart,
    handleNodeDrop,
    handleNodeChange,
    handleEdgeChange,
    handleNodeSelect,
    handleNodeDelete,
    handleNodeUpdate,
    handleSave,
    handleBack,
  }
}
