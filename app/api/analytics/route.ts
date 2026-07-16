import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse timeRange from query params
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'
    const days = timeRange === '90d' ? 90 : timeRange === '30d' ? 30 : 7

    // Get user's widgets
    const { data: widgets } = await supabase
      .from('widgets')
      .select('id')
      .eq('user_id', user.id)

    const widgetIds = widgets?.map((w) => w.id) || []

    if (widgetIds.length === 0) {
      return NextResponse.json({
        stats: {
          totalConversations: 0,
          totalMessages: 0,
          activeConversations: 0,
          avgMessagesPerConversation: 0,
        },
        dailyStats: [],
        recentActivity: [],
        topWidgets: [],
      })
    }

    // Date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateISO = startDate.toISOString()

    // Get all conversations for user's widgets within the time range
    const { data: conversations, error: convsError } = await supabase
      .from('conversations')
      .select('id, widget_id, status, created_at, message_count')
      .in('widget_id', widgetIds)
      .gte('created_at', startDateISO)

    if (convsError) {
      return NextResponse.json({ error: convsError.message }, { status: 500 })
    }

    const totalConversations = conversations?.length || 0
    const activeConversations = conversations?.filter((c) => c.status === 'active').length || 0
    const totalMessages = conversations?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0
    const avgMessages = totalConversations > 0 ? totalMessages / totalConversations : 0

    // Daily stats for the selected range
    const dailyMap = new Map<string, { conversations: number; messages: number }>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyMap.set(key, { conversations: 0, messages: 0 })
    }

    conversations?.forEach((c) => {
      const key = c.created_at.split('T')[0]
      const existing = dailyMap.get(key)
      if (existing) {
        existing.conversations++
        existing.messages += c.message_count || 0
      }
    })

    const dailyStats = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }))

    // Recent activity (limit 10, ordered by created_at desc)
    const recentConversations = [...(conversations || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

    const recentWidgetIds = [...new Set(recentConversations.map((c) => c.widget_id))]
    const { data: recentWidgets } = await supabase
      .from('widgets')
      .select('id, name')
      .in('id', recentWidgetIds)

    const widgetNameMap = new Map(recentWidgets?.map((w) => [w.id, w.name]) || [])

    const recentActivity = recentConversations.map((c) => ({
      id: c.id,
      widgetName: widgetNameMap.get(c.widget_id) || 'Unknown',
      messageCount: c.message_count,
      createdAt: c.created_at,
    }))

    // Top widgets by conversation count
    const widgetCountMap = new Map<string, number>()
    conversations?.forEach((c) => {
      widgetCountMap.set(c.widget_id, (widgetCountMap.get(c.widget_id) || 0) + 1)
    })

    const topWidgetIds = Array.from(widgetCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    let topWidgetsList: { id: string; name: string; conversations: number }[] = []
    if (topWidgetIds.length > 0) {
      const { data: topWidgets } = await supabase
        .from('widgets')
        .select('id, name')
        .in('id', topWidgetIds)

      topWidgetsList = topWidgets?.map((w) => ({
        id: w.id,
        name: w.name,
        conversations: widgetCountMap.get(w.id) || 0,
      })).sort((a, b) => b.conversations - a.conversations) || []
    }

    return NextResponse.json({
      stats: {
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        activeConversations: activeConversations || 0,
        avgMessagesPerConversation: Math.round(avgMessages * 10) / 10,
      },
      dailyStats,
      recentActivity,
      topWidgets: topWidgetsList,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
