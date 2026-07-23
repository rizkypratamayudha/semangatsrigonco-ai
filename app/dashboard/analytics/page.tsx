'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import type { EChartsOption } from 'echarts'

// Dynamically import ECharts to avoid SSR issues
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

type TimeRange = '7d' | '30d' | '90d'

interface AnalyticsData {
  stats: {
    totalConversations: number
    totalMessages: number
    activeConversations: number
    avgMessagesPerConversation: number
  }
  dailyStats: Array<{
    date: string
    conversations: number
    messages: number
  }>
  recentActivity: Array<{
    id: string
    widgetName: string
    messageCount: number
    createdAt: string
  }>
  topWidgets: Array<{
    id: string;
    name: string;
    conversations: number;
  }>
  topQuestions?: Array<{
    question: string;
    count: number;
  }>
  topKeywords?: Array<{
    keyword: string;
    count: number;
  }>
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics?timeRange=${timeRange}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [timeRange])

  const stats = data?.stats || {
    totalConversations: 0,
    totalMessages: 0,
    activeConversations: 0,
    avgMessagesPerConversation: 0,
  }

  const dailyStats = data?.dailyStats || []
  const recentActivity = data?.recentActivity || []
  const topWidgets = data?.topWidgets || []
  const topQuestions = data?.topQuestions || []
  const topKeywords = data?.topKeywords || []
  const rangeLabel = timeRange === '7d' ? '7 hari' : timeRange === '30d' ? '30 hari' : '90 hari'

  // Format date labels for x-axis
  const dateLabels = dailyStats.map((d) => {
    const date = new Date(d.date)
    if (timeRange === '7d') {
      return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][date.getDay()]
    }
    return `${date.getDate()}/${date.getMonth() + 1}`
  })

  // ECharts: Conversation Area Chart
  const conversationsChartOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#f9fafb', fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `<div style="padding:4px 8px"><div style="color:#9ca3af;margin-bottom:2px">${p.name}</div><div style="font-weight:600">${p.value} percakapan</div></div>`
      },
    },
    grid: { left: 16, right: 16, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: dateLabels,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      minInterval: 1,
    },
    series: [
      {
        name: 'Percakapan',
        type: 'line',
        data: dailyStats.map((d) => d.conversations),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#09923B', width: 2.5 },
        itemStyle: { color: '#09923B', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(9,146,59,0.25)' },
              { offset: 1, color: 'rgba(9,146,59,0.02)' },
            ],
          },
        },
      },
    ],
  }

  // ECharts: Messages Bar Chart
  const messagesChartOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#f9fafb', fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `<div style="padding:4px 8px"><div style="color:#9ca3af;margin-bottom:2px">${p.name}</div><div style="font-weight:600">${p.value} pesan</div></div>`
      },
    },
    grid: { left: 16, right: 16, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: dateLabels,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      minInterval: 1,
    },
    series: [
      {
        name: 'Pesan',
        type: 'bar',
        data: dailyStats.map((d) => d.messages),
        barMaxWidth: 36,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#4D0D0D' },
              { offset: 1, color: '#6b1a1a' },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: {
          itemStyle: { color: '#3a0a0a' },
        },
      },
    ],
  }

  // ECharts: Top Widgets Horizontal Bar
  const topWidgetsChartOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#f9fafb', fontSize: 12 },
      axisPointer: { type: 'none' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `<div style="padding:4px 8px"><b>${p.name}</b><br/>${p.value} percakapan</div>`
      },
    },
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
      axisLabel: { color: '#9ca3af', fontSize: 10 },
      minInterval: 1,
    },
    yAxis: {
      type: 'category',
      data: [...topWidgets].reverse().map((w) => w.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#374151',
        fontSize: 12,
        fontWeight: 'bold' as const,
        width: 120,
        overflow: 'truncate' as const,
      },
    },
    series: [
      {
        type: 'bar',
        data: [...topWidgets].reverse().map((w) => w.conversations),
        barMaxWidth: 28,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#09923B' },
              { offset: 1, color: '#07752f' },
            ],
          },
          borderRadius: [0, 6, 6, 0],
        },
        label: {
          show: true,
          position: 'right' as const,
          color: '#6b7280',
          fontSize: 11,
          fontWeight: 'bold' as const,
        },
      },
    ],
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <svg className="w-10 h-10 animate-spin text-[#4D0D0D]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Memuat analytics...</span>
        </div>
      </div>
    )
  }

  const EmptyChart = ({ label }: { label: string }) => (
    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
      <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">Belum ada {label} dalam {rangeLabel} terakhir</p>
    </div>
  )

  const hasConvData = dailyStats.some((d) => d.conversations > 0)
  const hasMsgData = dailyStats.some((d) => d.messages > 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">Pantau performa chatbot Anda secara real-time</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-border p-1 shadow-sm">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-[#4D0D0D] text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {range === '7d' ? '7 Hari' : range === '30d' ? '30 Hari' : '90 Hari'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div id="tour-analytics-summary" className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            label: 'Total Percakapan',
            value: stats.totalConversations,
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
            bg: 'bg-[#4D0D0D]/10',
            color: 'text-[#4D0D0D]',
            sub: `${rangeLabel} terakhir`,
          },
          {
            label: 'Total Pesan',
            value: stats.totalMessages,
            icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
            bg: 'bg-[#09923B]/15',
            color: 'text-[#09923B]',
            sub: `${rangeLabel} terakhir`,
          },
          {
            label: 'Percakapan Aktif',
            value: stats.activeConversations,
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            bg: 'bg-[#09923B]/10',
            color: 'text-[#09923B]',
            sub: 'Saat ini',
          },
          {
            label: 'Avg Pesan/Percakapan',
            value: stats.avgMessagesPerConversation,
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            bg: 'bg-[#4D0D0D]/10',
            color: 'text-[#4D0D0D]',
            sub: 'Rata-rata',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-2xl border border-border hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${card.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
              <span className={`text-xs font-medium px-2 py-1 ${card.bg} ${card.color} rounded-lg`}>{card.sub}</span>
            </div>
            <div className="text-3xl font-bold mb-1">{card.value}</div>
            <div className="text-sm text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Conversations Line Chart */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Percakapan</h3>
              <p className="text-xs text-muted-foreground">{rangeLabel} terakhir</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#09923B] font-medium bg-[#09923B]/10 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 bg-[#09923B] rounded-full" />
              Aktif
            </div>
          </div>
          {!hasConvData ? (
            <EmptyChart label="percakapan" />
          ) : (
            <ReactECharts option={conversationsChartOption} style={{ height: '256px' }} />
          )}
        </div>

        {/* Messages Bar Chart */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Pesan</h3>
              <p className="text-xs text-muted-foreground">{rangeLabel} terakhir</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#4D0D0D] font-medium bg-[#4D0D0D]/10 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 bg-[#4D0D0D] rounded-full" />
              Semua pesan
            </div>
          </div>
          {!hasMsgData ? (
            <EmptyChart label="pesan" />
          ) : (
            <ReactECharts option={messagesChartOption} style={{ height: '256px' }} />
          )}
        </div>
      </div>

      {/* Popular Inquiries Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top Questions */}
        <div id="tour-analytics-popular" className="bg-white rounded-2xl border border-border p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Pertanyaan Terpopuler</h3>
            <p className="text-xs text-muted-foreground mb-4">Pertanyaan paling sering ditanyakan oleh pengunjung ({rangeLabel} terakhir)</p>
            {topQuestions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Belum ada pertanyaan terekam</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topQuestions.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-muted/50 rounded-xl hover:bg-muted transition-colors border border-border/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#09923B]/10 text-[#07752f] border border-[#09923B]/20 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-foreground truncate">&ldquo;{item.question}&rdquo;</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[#09923B]/15 text-[#07752f] shadow-sm">
                      {item.count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Keywords */}
        <div id="tour-analytics-keywords" className="bg-white rounded-2xl border border-border p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Kata Kunci Terpopuler</h3>
            <p className="text-xs text-muted-foreground mb-4">Topik yang paling sering dibahas oleh pengunjung ({rangeLabel} terakhir)</p>
            {topKeywords.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Belum ada topik terekam</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {topKeywords.map((item: any, idx: number) => {
                  const style = idx === 0 
                    ? 'bg-[#09923B] text-white border-[#09923B]' 
                    : idx < 3 
                      ? 'bg-[#09923B]/10 text-[#07752f] border-[#09923B]/30' 
                      : 'bg-muted text-muted-foreground border-border/40';
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border shadow-sm transition-all hover:scale-105 ${style}`}
                    >
                      🏷️ {item.keyword}
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${idx === 0 ? 'bg-white text-[#07752f]' : 'bg-[#09923B]/15 text-[#07752f]'}`}>
                        {item.count}
                      </span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Widgets Chart */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-1">Widget Terpopuler</h3>
          <p className="text-xs text-muted-foreground mb-4">{rangeLabel} terakhir</p>
          {topWidgets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm">Belum ada data</p>
            </div>
          ) : (
            <ReactECharts option={topWidgetsChartOption} style={{ height: '220px' }} />
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-border p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Aktivitas Terbaru</h3>
              <p className="text-xs text-muted-foreground">{rangeLabel} terakhir</p>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Belum ada aktivitas dalam {rangeLabel} terakhir</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-65 overflow-y-auto">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted transition-colors">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      Percakapan baru dari Widget <span className="font-semibold">&ldquo;{activity.widgetName}&rdquo;</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.messageCount} pesan &middot; {getTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Baru saja'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`

  return date.toLocaleDateString('id-ID')
}




