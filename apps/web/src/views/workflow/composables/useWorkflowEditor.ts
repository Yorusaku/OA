import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowNodeType, WorkflowStatus } from '@/types/workflow'
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

  watch(workflowData, (data) => {
    if (!data)
      return
    definition.value = JSON.parse(JSON.stringify(data))
    workflowName.value = data.name || ''
    workflowDescription.value = data.description || ''
    workflowStatus.value = data.status || 'draft'
  }, { immediate: true })

  watch(isNew, (val) => {
    if (val && definition.value.nodes.length === 0) {
      definition.value.nodes = createDefaultNodes()
    }
  }, { immediate: true })

  function handleAddNode(type: WorkflowNodeType) {
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
    canvasRef.value?.addNode(newNode)
  }

  function handleDragStart(event: MouseEvent, type: WorkflowNodeType) {
    event.preventDefault()
    canvasRef.value?.startDrag({
      type: 'rect',
      text: getDefaultNodeName(type),
      properties: {
        type,
        name: getDefaultNodeName(type),
        description: '',
        handler: type === 'approval' || type === 'cc' ? { type: 'role', mode: 'or' } : undefined,
        enabled: true,
      },
    })
  }

  function handleNodeDrop(_type: WorkflowNodeType, _x: number, _y: number) {
    const newDefinition = canvasRef.value?.getDefinition()
    if (newDefinition) {
      definition.value.nodes = newDefinition.nodes
      definition.value.edges = newDefinition.edges
    }
  }

  function handleNodeChange(nodes: WorkflowNode[]) {
    definition.value.nodes = nodes
  }

  function handleEdgeChange(edges: WorkflowEdge[]) {
    definition.value.edges = edges
  }

  function handleNodeSelect(nodeId: string) {
    selectedNode.value = definition.value.nodes.find(n => n.id === nodeId)
  }

  function handleNodeDelete(nodeId: string) {
    definition.value.nodes = definition.value.nodes.filter(n => n.id !== nodeId)
    definition.value.edges = definition.value.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    selectedNode.value = undefined
    canvasRef.value?.deleteNode(nodeId)
    ElMessage.success('节点已删除')
  }

  function handleNodeUpdate(updatedNode: WorkflowNode) {
    const index = definition.value.nodes.findIndex(n => n.id === updatedNode.id)
    if (index === -1)
      return
    definition.value.nodes[index] = updatedNode
    selectedNode.value = { ...updatedNode }
    canvasRef.value?.updateNode(updatedNode)
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
      const saved = await saveMutation.save(data)
      ElMessage.success('保存成功')
      if (isNew.value && saved?.id) {
        router.push(`/workflow/editor/${saved.id}`)
      }
    }
    catch {
      ElMessage.error('保存失败')
    }
  }

  function handleBack() {
    router.push('/workflow/list')
  }

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
