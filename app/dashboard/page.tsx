import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DashboardCharts from '@/components/dashboard-charts'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch all stats in parallel
  const [widgetsResult, documentsResult, conversationsResult, recentConvsResult] = await Promise.all([
    supabase
      .from('widgets')
      .select('id, name, primary_color, created_at', { count: 'exact' })
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id),
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id),
    // Recent conversations in last 7 days grouped per day for mini sparkline
    supabase
      .from('conversations')
      .select('created_at')
      .eq('user_id', user!.id)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('created_at', { ascending: true }),
  ])

  const widgetCount = widgetsResult.count ?? 0
  const documentCount = documentsResult.count ?? 0
  const conversationCount = conversationsResult.count ?? 0
  const recentWidgets = widgetsResult.data ?? []

  // Build 7-day sparkline data
  const dailyMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dailyMap[d.toISOString().split('T')[0]] = 0
  }
  recentConvsResult.data?.forEach((c) => {
    const key = c.created_at.split('T')[0]
    if (key in dailyMap) dailyMap[key]++
  })
  const sparklineData = Object.values(dailyMap)

  const firstName = user?.email?.split('@')[0] ?? 'Pengguna'
  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat pagi'
    if (hour < 17) return 'Selamat siang'
    return 'Selamat malam'
  })()

  const stats = [
    {
      label: 'Widget Aktif',
      value: widgetCount,
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
      bg: 'bg-[#09923B]/10',
      iconBg: 'bg-[#09923B]/15',
      color: 'text-[#09923B]',
      badge: 'Semua aktif',
      href: '/dashboard/widgets',
    },
    {
      label: 'Dokumen',
      value: documentCount,
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      bg: 'bg-[#4D0D0D]/10',
      iconBg: 'bg-[#4D0D0D]/15',
      color: 'text-[#4D0D0D]',
      badge: 'Knowledge base',
      href: '/dashboard/widgets',
    },
    {
      label: 'Total Percakapan',
      value: conversationCount,
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      bg: 'bg-[#09923B]/10',
      iconBg: 'bg-[#09923B]/15',
      color: 'text-[#09923B]',
      badge: 'Semua waktu',
      href: '/dashboard/analytics',
    },
    {
      label: 'Pesan 7 Hari',
      value: sparklineData.reduce((a, b) => a + b, 0),
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      bg: 'bg-[#4D0D0D]/10',
      iconBg: 'bg-[#4D0D0D]/15',
      color: 'text-[#4D0D0D]',
      badge: '7 hari terakhir',
      href: '/dashboard/analytics',
    },
  ]

  return (
    <div className="pb-12">
      {/* Welcome Banner */}
      <div className="relative mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-[#4D0D0D] via-[#4D0D0D] to-[#6b1a1a] p-8 shadow-lg">
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-10 -right-10 w-56 h-56 bg-white/10 rounded-full" />
          <div className="absolute -bottom-16 -left-8 w-72 h-72 bg-white/5 rounded-full" />
          <div className="absolute top-8 right-40 w-20 h-20 bg-white/10 rounded-full" />
        </div>
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">{greeting},</p>
            <h1 className="text-3xl font-bold text-white mb-2 capitalize">{firstName} 👋</h1>
            <p className="text-white/70 text-sm max-w-md">
              Semua sistem berjalan normal. Anda memiliki <span className="font-semibold text-white">{widgetCount} widget</span> chatbot aktif siap melayani pengunjung.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard/widgets"
              className="px-5 py-2.5 bg-white text-[#4D0D0D] rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all hover:scale-105"
            >
              + Buat Widget
            </Link>
            <Link
              href="/dashboard/analytics"
              className="px-5 py-2.5 bg-white/20 text-white border border-white/30 rounded-xl text-sm font-semibold hover:bg-white/30 transition-all"
            >
              Lihat Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`group bg-white p-6 rounded-2xl border border-border hover:shadow-md transition-all hover:-translate-y-0.5 block`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 ${stat.bg} ${stat.color} rounded-lg`}>
                {stat.badge}
              </span>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-[#09923B] transition-colors">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Charts + Quick Actions Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Sparkline chart - 7 day conversation trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Tren Percakapan</h2>
              <p className="text-xs text-muted-foreground">7 hari terakhir</p>
            </div>
            <Link href="/dashboard/analytics" className="text-xs text-[#09923B] font-medium hover:underline">
              Lihat detail →
            </Link>
          </div>
          <DashboardCharts sparklineData={sparklineData} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Aksi Cepat</h2>
          <div className="flex flex-col gap-3 flex-1">
            <Link
              href="/dashboard/widgets"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#09923B]/10 hover:bg-[#09923B]/20 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#09923B]/15 rounded-xl flex items-center justify-center group-hover:bg-[#09923B]/25 transition-colors">
                <svg className="w-5 h-5 text-[#09923B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#09923B]">Buat Widget Baru</p>
                <p className="text-xs text-[#09923B]/70">Tambah chatbot AI baru</p>
              </div>
            </Link>
            <Link
              href="/dashboard/widgets"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#4D0D0D]/10 hover:bg-[#4D0D0D]/20 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#4D0D0D]/15 rounded-xl flex items-center justify-center group-hover:bg-[#4D0D0D]/25 transition-colors">
                <svg className="w-5 h-5 text-[#4D0D0D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#4D0D0D]">Upload Dokumen</p>
                <p className="text-xs text-[#4D0D0D]/70">Tambah ke knowledge base</p>
              </div>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#09923B]/10 hover:bg-[#09923B]/20 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#09923B]/15 rounded-xl flex items-center justify-center group-hover:bg-[#09923B]/25 transition-colors">
                <svg className="w-5 h-5 text-[#09923B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#09923B]">Lihat Analytics</p>
                <p className="text-xs text-[#09923B]/70">Pantau performa chatbot</p>
              </div>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#4D0D0D]/10 hover:bg-[#4D0D0D]/20 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#4D0D0D]/15 rounded-xl flex items-center justify-center group-hover:bg-[#4D0D0D]/25 transition-colors">
                <svg className="w-5 h-5 text-[#4D0D0D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#4D0D0D]">Pengaturan</p>
                <p className="text-xs text-[#4D0D0D]/70">Konfigurasi akun & API</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* My Widgets Section */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Widget Saya</h2>
            <p className="text-xs text-muted-foreground">Semua chatbot yang Anda miliki</p>
          </div>
          <Link
            href="/dashboard/widgets"
            className="text-xs font-semibold text-[#09923B] hover:text-[#07752f] hover:underline transition-colors"
          >
            Kelola semua →
          </Link>
        </div>

        {recentWidgets.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-[#4D0D0D] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="font-semibold mb-1">Belum ada widget</p>
            <p className="text-sm text-muted-foreground mb-4">Buat chatbot AI pertama Anda sekarang</p>
            <Link
              href="/dashboard/widgets"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4D0D0D] text-white rounded-xl text-sm font-semibold hover:bg-[#3a0a0a] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buat Widget
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentWidgets.slice(0, 6).map((widget) => (
              <Link
                key={widget.id}
                href="/dashboard/widgets"
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-[#09923B]/30 hover:bg-[#09923B]/5 transition-all group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: widget.primary_color || '#25D366' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate group-hover:text-[#09923B] transition-colors">{widget.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-[#09923B] rounded-full" />
                    <span className="text-xs text-muted-foreground">Aktif</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-muted-foreground/40 group-hover:text-[#09923B] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
            {recentWidgets.length > 6 && (
              <Link
                href="/dashboard/widgets"
                className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 hover:border-[#09923B]/50 hover:bg-[#09923B]/5 transition-all text-sm text-muted-foreground hover:text-[#09923B] font-medium"
              >
                +{recentWidgets.length - 6} widget lainnya →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
