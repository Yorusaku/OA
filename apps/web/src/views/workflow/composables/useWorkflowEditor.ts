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
  const draggingType = ref<WorkflowNode['type'] | null>(null)

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
  }

  function handleDragStart(event: DragEvent, type: WorkflowNode['type']) {
    draggingType.value = type
    if (event.dataTransfer) {
      event.dataTransfer.setData('node-type', type)
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  function handleNodeDrop(type: WorkflowNode['type'], position: { x: number, y: number }) {
    const newNode: WorkflowNode = {
      id: generateId(type),
      type,
      name: getDefaultNodeName(type),
      description: '',
      handler: type === 'approval' || type === 'cc' ? { type: 'role', mode: 'or' } : undefined,
      position,
      enabled: true,
    }

    definition.value.nodes = [...definition.value.nodes, newNode]
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
    definition.value.nodes = definition.value.nodes.filter(n => n.id !== nodeId)
    definition.value.edges = definition.value.edges.filter(
      e => e.source !== nodeId && e.target !== nodeId,
    )
    selectedNode.value = undefined
    ElMessage.success('节点已删除')
  }

  function handleNodeUpdate(updatedNode: WorkflowNode) {
    const index = definition.value.nodes.findIndex(n => n.id === updatedNode.id)
    if (index !== -1) {
      definition.value.nodes = definition.value.nodes.map((n, i) =>
        i === index ? { ...updatedNode } : n
      )
      selectedNode.value = { ...updatedNode }
      ElMessage.success('配置已保存')
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
