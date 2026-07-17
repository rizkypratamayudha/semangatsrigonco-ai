'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import CreateWidgetForm from '@/components/create-widget-form'
import WidgetPreview from '@/components/widget-preview'
import UploadWidget from '@/components/upload-widget'
import DocumentList from '@/components/document-list'
import toast from 'react-hot-toast'

interface Widget {
  id: string
  name: string
  welcome_message: string | null
  prompt: string | null
  primary_color: string | null
  created_at: string
}

type SortBy = 'newest' | 'oldest' | 'name'

export default function WidgetList({ userId }: { userId: string }) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([])
  const [previewWidget, setPreviewWidget] = useState<Widget | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [embedGuideWidget, setEmbedGuideWidget] = useState<Widget | null>(null)
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null)
  const [refreshTriggers, setRefreshTriggers] = useState<Record<string, number>>({})

  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function fetchWidgets() {
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (error) {
          console.error('Fetch widgets error:', error)
        }
        setWidgets(data || [])
        setLoading(false)
      }
    }

    fetchWidgets()

    return () => {
      cancelled = true
    }
  }, [userId, supabase])

  async function refetchWidgets() {
    const { data, error } = await supabase
      .from('widgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Refetch widgets error:', error)
    }
    setWidgets(data || [])
  }

  const filteredWidgets = useMemo(() => {
    let result = [...widgets]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.welcome_message?.toLowerCase().includes(query) ||
          w.prompt?.toLowerCase().includes(query)
      )
    }

    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return result
  }, [widgets, searchQuery, sortBy])

  async function handleDelete(id: string) {
    setDeleteConfirmId(id)
  }

  async function handleBulkDelete() {
    setBulkDeleteConfirm(true)
  }

  async function executeDelete(id: string) {
    const { error } = await supabase.from('widgets').delete().eq('id', id)

    if (!error) {
      setWidgets((prev) => prev.filter((w) => w.id !== id))
      setSelectedWidgets((prev) => prev.filter((wid) => wid !== id))
      toast.success('Widget berhasil dihapus!')
    } else {
      toast.error('Gagal menghapus widget: ' + error.message)
    }
  }

  async function executeBulkDelete() {
    const { error } = await supabase.from('widgets').delete().in('id', selectedWidgets)

    if (!error) {
      setWidgets((prev) => prev.filter((w) => !selectedWidgets.includes(w.id)))
      setSelectedWidgets([])
      toast.success('Widget terpilih berhasil dihapus!')
    } else {
      toast.error('Gagal menghapus beberapa widget: ' + error.message)
    }
  }

  async function handleDuplicate(widget: Widget) {
    try {
      // 1. Fetch user's tier
      const { data: userData } = await supabase
        .from('users')
        .select('tier')
        .eq('id', userId)
        .maybeSingle()

      const userTier = userData?.tier || 'free'
      const widgetLimit = userTier === 'free' ? 1 : userTier === 'pro' ? 2 : 3

      // 2. Check widget limit
      if (widgets.length >= widgetLimit) {
        toast.error(`Batas jumlah widget tercapai. Akun ${userTier.toUpperCase()} Anda hanya diizinkan memiliki maksimal ${widgetLimit} widget. Silakan upgrade plan Anda untuk menambah kuota!`)
        return
      }

      // 3. Insert duplicate to Supabase
      const { data: newWidget, error: insertError } = await supabase
        .from('widgets')
        .insert({
          name: `${widget.name} (Copy)`,
          welcome_message: widget.welcome_message,
          prompt: widget.prompt,
          primary_color: widget.primary_color,
          user_id: userId,
        })
        .select()
        .single()

      if (insertError) {
        toast.error('Gagal menduplikasi widget: ' + insertError.message)
        return
      }

      if (newWidget) {
        setWidgets((prev) => [newWidget, ...prev])
        toast.success('Widget berhasil diduplikasi!')
      }
    } catch (err) {
      console.error('Failed to duplicate widget:', err)
      toast.error('Terjadi kesalahan saat menduplikasi widget.')
    }
  }

  function handleCopyEmbed(widget: Widget) {
    const embedCode = `<script src="${window.location.origin}/api/widget/${widget.id}" async></script>`
    navigator.clipboard.writeText(embedCode)
    setCopiedId(widget.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleWidgetCreated(widget: Widget) {
    console.log('Widget created, refetching...', widget)
    setWidgets((prev) => [widget, ...prev])
    setShowCreateForm(false)
    // Also re-fetch to ensure data consistency
    refetchWidgets()
  }

  function toggleSelectAll() {
    if (selectedWidgets.length === filteredWidgets.length) {
      setSelectedWidgets([])
    } else {
      setSelectedWidgets(filteredWidgets.map((w) => w.id))
    }
  }

  function toggleSelectWidget(id: string) {
    if (selectedWidgets.includes(id)) {
      setSelectedWidgets(selectedWidgets.filter((wid) => wid !== id))
    } else {
      setSelectedWidgets([...selectedWidgets, id])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Memuat widget...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Sidebar - Search & Filters */}
      <div className="w-full lg:w-72 lg:flex-shrink-0">
        <div className="lg:sticky lg:top-6 space-y-6">
          {/* Search */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Cari Widget
            </h3>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama widget..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Sort */}
          <div className="bg-white rounded-2xl border border-border p-5 hidden sm:block">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Urutkan
            </h3>
            <div className="space-y-2">
              {[
                { value: 'newest', label: 'Terbaru' },
                { value: 'oldest', label: 'Terlama' },
                { value: 'name', label: 'Nama A-Z' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    sortBy === option.value ? 'bg-green-50 border border-green-200' : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name="sortBy"
                    value={option.value}
                    checked={sortBy === option.value}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-border p-5 hidden sm:block">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Statistik
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                <span className="text-sm text-muted-foreground">Total Widget</span>
                <span className="font-bold text-lg">{widgets.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <span className="text-sm text-green-700">Aktif</span>
                <span className="font-bold text-lg text-green-700">{widgets.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <span className="text-sm text-blue-700">Terpilih</span>
                <span className="font-bold text-lg text-blue-700">{selectedWidgets.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 min-w-0">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {selectedWidgets.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus ({selectedWidgets.length})
              </button>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={selectedWidgets.length === filteredWidgets.length && filteredWidgets.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              Pilih Semua
            </label>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            id="tour-create-widget"
            className="inline-flex items-center gap-2 px-5 py-2.5 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            {showCreateForm ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Batal
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Buat Widget
              </>
            )}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Widget Baru</h3>
                <p className="text-sm text-muted-foreground">Buat chatbot AI baru</p>
              </div>
            </div>
            <CreateWidgetForm userId={userId} onCreated={handleWidgetCreated} />
          </div>
        )}

        {/* Widget List */}
        {filteredWidgets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            {searchQuery ? (
              <>
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Tidak Ditemukan</h3>
                <p className="text-muted-foreground">
                  Tidak ada widget yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Belum Ada Widget</h3>
                <p className="text-muted-foreground mb-6">
                  Buat chatbot AI pertama Anda untuk mulai melayani pelanggan
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Buat Widget Sekarang
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWidgets.map((widget, index) => {
              const isFirst = index === 0
              return (
                <div
                  key={widget.id}
                  id={isFirst ? 'tour-widget-card' : undefined}
                  className={`bg-white rounded-2xl border transition-all hover:shadow-md ${
                    selectedWidgets.includes(widget.id) ? 'border-green-500 ring-2 ring-green-100' : 'border-border'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedWidgets.includes(widget.id)}
                        onChange={() => toggleSelectWidget(widget.id)}
                        className="w-5 h-5 mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />

                      {/* Widget Icon */}
                      <div
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: widget.primary_color || '#25D366' }}
                      >
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>

                      {/* Widget Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{widget.name}</h3>
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Aktif
                          </span>
                        </div>

                        {widget.welcome_message && (
                          <p className="text-sm text-muted-foreground mb-2 truncate">
                            &ldquo;{widget.welcome_message}&rdquo;
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(widget.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <div
                              className="w-3 h-3 rounded-full border border-gray-200"
                              style={{ backgroundColor: widget.primary_color || '#25D366' }}
                            />
                            {widget.primary_color || '#25D366'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button
                          onClick={() => setExpandedWidgetId(expandedWidgetId === widget.id ? null : widget.id)}
                          id={isFirst ? 'tour-doc-manage' : undefined}
                          className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold select-none border ${
                            expandedWidgetId === widget.id
                              ? 'bg-green-600 text-white border-green-600 shadow-sm hover:bg-green-700'
                              : 'text-muted-foreground bg-white border-gray-200 hover:text-green-600 hover:bg-green-50/50 hover:border-green-200'
                          }`}
                          title="Kelola Knowledge Base / Dokumen RAG"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {expandedWidgetId === widget.id ? 'Tutup Dokumen' : 'Kelola Dokumen'}
                        </button>
                        <button
                          onClick={() => setPreviewWidget(widget)}
                          id={isFirst ? 'tour-preview-widget' : undefined}
                          className="p-2.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Preview"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEmbedGuideWidget(widget)}
                          id={isFirst ? 'tour-copy-embed' : undefined}
                          className="p-2.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                          title="Kode Embed / Integrasi"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDuplicate(widget)}
                          className="p-2.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                          title="Duplikat"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(widget.id)}
                          className="p-2.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Hapus"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                  </div>

                  {/* Prompt Preview */}
                  {widget.prompt && (
                    <div className="mt-4 ml-0 sm:ml-14 p-3 bg-muted rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">Instruksi AI</p>
                      <p className="text-sm text-foreground/80 line-clamp-2">{widget.prompt}</p>
                    </div>
                  )}

                  {/* Expanded Document Management Section */}
                  {expandedWidgetId === widget.id && (
                    <div className="mt-5 pt-5 border-t border-border animate-in fade-in slide-in-from-top duration-300">
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* Upload Widget */}
                        <div className="lg:col-span-2 bg-gray-50/40 p-5 rounded-2xl border border-dashed border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                            <svg className="w-4.5 h-4.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Unggah Dokumen Baru
                          </h4>
                          <UploadWidget
                            widgetId={widget.id}
                            onUploadComplete={() => {
                              setRefreshTriggers((prev) => ({
                                ...prev,
                                [widget.id]: (prev[widget.id] || 0) + 1,
                              }))
                            }}
                          />
                        </div>
                        {/* Document List */}
                        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[220px]">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                            <svg className="w-4.5 h-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Daftar Dokumen
                          </h4>
                          <DocumentList
                            widgetId={widget.id}
                            refreshTrigger={refreshTriggers[widget.id] || 0}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewWidget && (
        <WidgetPreview
          widget={previewWidget}
          onClose={() => setPreviewWidget(null)}
        />
      )}

      {/* Custom Confirmation Modals */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Hapus Widget?</h3>
            <p className="text-sm text-gray-500 mb-6">Apakah Anda yakin ingin menghapus widget ini? Semua dokumen RAG dan konfigurasi terkait widget ini akan ikut terhapus.</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all focus:outline-none"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  const id = deleteConfirmId
                  setDeleteConfirmId(null)
                  await executeDelete(id)
                }}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold shadow-lg transition-all focus:outline-none"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Hapus Beberapa Widget?</h3>
            <p className="text-sm text-gray-500 mb-6">Apakah Anda yakin ingin menghapus {selectedWidgets.length} widget terpilih? Semua data terkait widget-widget tersebut akan dihapus secara permanen.</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all focus:outline-none"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  setBulkDeleteConfirm(false)
                  await executeBulkDelete()
                }}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold shadow-lg transition-all focus:outline-none"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Guide Modal */}
      {embedGuideWidget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEmbedGuideWidget(null)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-lg w-full border border-gray-100 flex flex-col gap-4 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Panduan Integrasi Website</h3>
                  <p className="text-xs text-muted-foreground">Widget: {embedGuideWidget.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setEmbedGuideWidget(null)}
                className="w-8 h-8 hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 my-2">
              <p className="text-sm text-gray-600 leading-relaxed">
                Salin kode skrip di bawah ini dan pasang ke website Anda untuk menampilkan widget chatbot secara langsung di pojok kanan bawah.
              </p>

              {/* Code block with copy button */}
              <div className="relative bg-gray-900 text-gray-100 p-4 rounded-2xl border border-gray-800 font-mono text-xs overflow-x-auto select-all pr-12 group">
                <button
                  onClick={() => {
                    const embedCode = `<script src="${window.location.origin}/api/widget/${embedGuideWidget.id}" async></script>`
                    navigator.clipboard.writeText(embedCode)
                    toast.success('Kode embed berhasil disalin!')
                  }}
                  className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white p-2 rounded-lg border border-white/10 transition-colors flex items-center justify-center cursor-pointer"
                  title="Salin Kode"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
                <span>{`<script src="${window.location.origin}/api/widget/${embedGuideWidget.id}" async></script>`}</span>
              </div>

              {/* Steps */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-sm text-gray-800">Langkah Pemasangan:</h4>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-50 text-green-700 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-green-100">
                    1
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Klik ikon salin di atas untuk menyalin tag skrip integrasi chatbot Anda.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-50 text-green-700 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-green-100">
                    2
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Buka file HTML utama website Anda (atau di bagian Custom HTML / Footer script pada CMS seperti WordPress, Webflow, atau Wix).
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-50 text-green-700 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-green-100">
                    3
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Tempel (*paste*) kode tersebut tepat di atas tag penutup <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono text-[10px]">&lt;/body&gt;</code> file HTML Anda.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setEmbedGuideWidget(null)}
                className="px-6 py-2.5 gradient-bg hover:opacity-90 text-white rounded-xl text-sm font-semibold shadow-lg transition-all focus:outline-none"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
