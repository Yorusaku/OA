import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { onMounted, onUnmounted, ref, watch } from 'vue'

export function useECharts(
  containerRef: Ref<HTMLElement | null>,
  options: Ref<EChartsOption>,
) {
  let chartInstance: echarts.ECharts | null = null

  function initChart() {
    if (!containerRef.value)
      return
    chartInstance = echarts.init(containerRef.value)
    updateChart()
  }

  function updateChart() {
    if (!chartInstance)
      return
    chartInstance.setOption(options.value, true)
  }

  function resizeChart() {
    chartInstance?.resize()
  }

  onMounted(() => {
    initChart()
    window.addEventListener('resize', resizeChart)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', resizeChart)
    chartInstance?.dispose()
  })

  watch(options, () => {
    updateChart()
  }, { deep: true })

  return {
    chartInstance,
    resizeChart,
    updateChart,
  }
}
