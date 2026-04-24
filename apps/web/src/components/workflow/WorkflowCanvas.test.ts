import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WorkflowCanvas from './WorkflowCanvas.vue'

const logicFlowInstances: any[] = []

vi.mock('@logicflow/core', () => {
  class LogicFlowMock {
    events: Record<string, Function> = {}
    graphData: any = { nodes: [], edges: [] }
    dnd = {
      startDrag: vi.fn(),
    }

    constructor() {
      logicFlowInstances.push(this)
    }

    on(event: string, cb: Function) {
      this.events[event] = cb
    }

    use() {}

    render(data: any) {
      this.graphData = data
    }

    getGraphData() {
      return this.graphData
    }

    addNode(node: any) {
      this.graphData.nodes.push(node)
    }

    deleteNode(id: string) {
      this.graphData.nodes = this.graphData.nodes.filter((n: any) => n.id !== id)
      this.graphData.edges = this.graphData.edges.filter((e: any) => e.sourceNodeId !== id && e.targetNodeId !== id)
    }

    updateText() {}
    setProperties() {}
    moveNode() {}
    updateEditConfig() {}
    destroy() {}
  }

  return { default: LogicFlowMock }
})

vi.mock('@logicflow/extension', () => ({
  Control: {},
  DndPanel: {},
  Menu: {},
  MiniMap: {},
  SelectionSelect: {},
}))

describe('WorkflowCanvas', () => {
  it('exposes workflow canvas methods and emits nodeSelect/nodeDrop contracts', async () => {
    const wrapper = mount(WorkflowCanvas, {
      props: {
        definition: {
          id: 'wf-1',
          name: 'test',
          status: 'draft',
          nodes: [],
          edges: [],
        },
      },
    })

    const vm = wrapper.vm as any
    expect(typeof vm.addNode).toBe('function')
    expect(typeof vm.startDrag).toBe('function')
    expect(typeof vm.getDefinition).toBe('function')
    expect(typeof vm.deleteNode).toBe('function')
    expect(typeof vm.updateNode).toBe('function')

    const lf = logicFlowInstances[0]
    expect(lf).toBeTruthy()

    lf.events['node:click']?.({ data: { id: 'node-1' } })
    lf.events['node:dnd-add']?.({ data: { x: 100, y: 200, properties: { type: 'approval' } } })

    expect(wrapper.emitted('nodeSelect')?.[0]).toEqual(['node-1'])
    expect(wrapper.emitted('nodeDrop')?.[0]).toEqual(['approval', 100, 200])
  })
})
