/**
 * @file useECharts.ts
 * @description ECharts 图表组合式函数
 * 封装图表初始化、更新、销毁等核心逻辑
 */

import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

/**
 * ECharts 图表 Hook
 * @param containerRef - 图表容器元素引用
 * @param optionsRef - 图表配置项引用
 * @returns 图表实例和控制方法
 * @usage
 * ```ts
 * const chartRef = ref(null)
 * const options = ref({...})
 * const { chartInstance, updateChart } = useECharts(chartRef, options)
 * ```
 */
export function useECharts(
  containerRef: Ref<HTMLElement | null>,
  optionsRef: Ref<EChartsOption>,
) {
  let chartInstance: echarts.ECharts | null = null

  /**
   * 初始化图表
   */
  function initChart() {
    if (!containerRef.value)
      return
    chartInstance = echarts.init(containerRef.value)
    updateChart()
  }

  /**
   * 更新图表配置
   */
  function updateChart() {
    if (!chartInstance)
      return
    chartInstance.setOption(optionsRef.value, true)
  }

  /**
   * 图表尺寸调整
   */
  function resizeChart() {
    chartInstance?.resize()
  }

  // 组件挂载时初始化
  onMounted(() => {
    initChart()
    window.addEventListener('resize', resizeChart)
  })

  // 组件卸载时清理
  onUnmounted(() => {
    window.removeEventListener('resize', resizeChart)
    chartInstance?.dispose()
  })

  // 监听配置变化，自动更新图表
  watch(optionsRef, () => {
    updateChart()
  }, { deep: true })

  return {
    chartInstance,
    resizeChart,
    updateChart,
  }
}
