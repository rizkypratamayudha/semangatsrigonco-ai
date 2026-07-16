'use client'

import dynamic from 'next/dynamic'
import type { EChartsOption } from 'echarts'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

interface DashboardChartsProps {
  sparklineData: number[]
}

export default function DashboardCharts({ sparklineData }: DashboardChartsProps) {
  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  // Build labels for last 7 days
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return dayLabels[d.getDay()]
  })

  const hasData = sparklineData.some((v) => v > 0)

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#f9fafb', fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `<div style="padding:4px 10px"><div style="color:#9ca3af;margin-bottom:2px">${p.name}</div><div style="font-weight:600">${p.value} percakapan</div></div>`
      },
    },
    grid: { left: 8, right: 8, top: 16, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 12, fontWeight: 'bold' as const },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      minInterval: 1,
      min: 0,
    },
    series: [
      {
        name: 'Percakapan',
        type: 'line',
        data: sparklineData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: '#16a34a', width: 3 },
        itemStyle: { color: '#16a34a', borderColor: '#fff', borderWidth: 2.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22,163,74,0.22)' },
              { offset: 1, color: 'rgba(22,163,74,0.01)' },
            ],
          },
        },
      },
    ],
  }

  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">Belum ada percakapan dalam 7 hari terakhir</p>
        <p className="text-xs text-muted-foreground/60">Data akan muncul setelah widget dipasang di website Anda</p>
      </div>
    )
  }

  return <ReactECharts option={option} style={{ height: '192px' }} />
}
