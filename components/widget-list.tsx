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
  suggested_questions?: string[]
  api_token?: string | null
  allowed_domains?: string[]
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

  // Edit widget states
  const [editWidget, setEditWidget] = useState<Widget | null>(null)
  const [editName, setEditName] = useState('')
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [editPrimaryColor, setEditPrimaryColor] = useState('')
  const [editAllowedDomains, setEditAllowedDomains] = useState('')
  const [regenerateToken, setRegenerateToken] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function fetchWidgets() {
      try {
        const res = await fetch('/api/widgets')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setWidgets(Array.isArray(data) ? data : [])
          }
        }
      } catch (error) {
        console.error('Fetch widgets error:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchWidgets()

    return () => {
      cancelled = true
    }
  }, [userId])

  async function refetchWidgets() {
    try {
      const res = await fetch('/api/widgets')
      if (res.ok) {
        const data = await res.json()
        setWidgets(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Refetch widgets error:', error)
    }
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
    try {
      const res = await fetch(`/api/widgets?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setWidgets((prev) => prev.filter((w) => w.id !== id))
        setSelectedWidgets((prev) => prev.filter((wid) => wid !== id))
        toast.success('Widget berhasil dihapus!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus widget')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi saat menghapus widget')
    }
  }

  async function executeBulkDelete() {
    try {
      let successCount = 0
      for (const id of selectedWidgets) {
        const res = await fetch(`/api/widgets?id=${id}`, { method: 'DELETE' })
        if (res.ok) successCount++
      }
      setWidgets((prev) => prev.filter((w) => !selectedWidgets.includes(w.id)))
      setSelectedWidgets([])
      toast.success(`${successCount} widget terpilih berhasil dihapus!`)
    } catch {
      toast.error('Terjadi kesalahan saat menghapus widget terpilih')
    }
  }

  async function handleDuplicate(widget: Widget) {
    if (widgets.length >= 1) {
      toast.error('Setiap akun email hanya diperbolehkan membuat maksimal 1 widget.')
      return
    }

    try {
      const res = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${widget.name} (Copy)`,
          welcome_message: widget.welcome_message,
          prompt: widget.prompt,
          primary_color: widget.primary_color,
          suggested_questions: widget.suggested_questions,
        }),
      })

      if (res.ok) {
        const newWidget = await res.json()
        setWidgets((prev) => [newWidget, ...prev])
        toast.success('Widget berhasil diduplikasi!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menduplikasi widget')
      }
    } catch (err) {
      console.error('Failed to duplicate widget:', err)
      toast.error('Terjadi kesalahan saat menduplikasi widget.')
    }
  }

  function handleCopyEmbed(widget: Widget) {
    const tokenPart = widget.api_token ? `?token=${widget.api_token}` : ''
    const embedCode = `<script src="${window.location.origin}/api/widget/${widget.id}${tokenPart}" async></script>`
    navigator.clipboard.writeText(embedCode)
    setCopiedId(widget.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleEditClick(widget: Widget) {
    setEditWidget(widget)
    setEditName(widget.name)
    setEditWelcomeMessage(widget.welcome_message || '')
    setEditPrompt(widget.prompt || '')
    setEditPrimaryColor(widget.primary_color || '#25D366')
    setEditAllowedDomains((widget.allowed_domains || []).join('\n'))
    setRegenerateToken(false)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editWidget) return
    setEditLoading(true)

    try {
      const res = await fetch('/api/widgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editWidget.id,
          name: editName.trim(),
          welcome_message: editWelcomeMessage.trim() || null,
          prompt: editPrompt.trim() || null,
          primary_color: editPrimaryColor,
          suggested_questions: [],
          allowed_domains: editAllowedDomains.split('\n').map(d => d.trim()).filter(Boolean),
          regenerate_token: regenerateToken
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setWidgets((prev) => prev.map((w) => (w.id === editWidget.id ? data : w)))
        toast.success('Widget berhasil diperbarui!')
        setEditWidget(null)
      } else {
        toast.error(data.error || 'Gagal memperbarui widget')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi saat menyimpan perubahan')
    } finally {
      setEditLoading(false)
    }
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
          <svg className="w-6 h-6 animate-spin text-[#4D0D0D]" fill="none" viewBox="0 0 24 24">
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
      <div className="w-full lg:w-72 lg:shrink-0">
        <div className="lg:sticky lg:top-6 space-y-6">
          {/* Search */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#4D0D0D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent text-sm"
              />
              <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Sort */}
          <div className="bg-white rounded-2xl border border-border p-5 hidden sm:block">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#09923B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    sortBy === option.value ? 'bg-[#09923B]/10 border border-[#09923B]/30' : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name="sortBy"
                    value={option.value}
                    checked={sortBy === option.value}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-4 h-4 text-[#09923B] focus:ring-[#09923B]"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-border p-5 hidden sm:block">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#4D0D0D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Statistik
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                <span className="text-sm text-muted-foreground">Total Widget</span>
                <span className="font-bold text-lg">{widgets.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#09923B]/10 rounded-xl">
                <span className="text-sm text-[#09923B]">Aktif</span>
                <span className="font-bold text-lg text-[#09923B]">{widgets.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#4D0D0D]/10 rounded-xl">
                <span className="text-sm text-[#4D0D0D]">Terpilih</span>
                <span className="font-bold text-lg text-[#4D0D0D]">{selectedWidgets.length}</span>
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
                className="w-4 h-4 rounded border-gray-300 text-[#09923B] focus:ring-[#09923B]"
              />
              Pilih Semua
            </label>
          </div>

          <button
            onClick={() => {
              if (!showCreateForm && widgets.length >= 1) {
                toast.error('Setiap akun email hanya diperbolehkan membuat maksimal 1 widget.')
                return
              }
              setShowCreateForm(!showCreateForm)
            }}
            id="tour-create-widget"
            className={`inline-flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl transition-all ${
              widgets.length >= 1 && !showCreateForm
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-[#4D0D0D] text-white hover:opacity-90'
            }`}
            title={widgets.length >= 1 && !showCreateForm ? 'Setiap akun email hanya diperbolehkan membuat maksimal 1 widget' : undefined}
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
                {widgets.length >= 1 ? 'Batas Widget Terpenuhi (1/1)' : 'Buat Widget'}
              </>
            )}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#4D0D0D] rounded-xl flex items-center justify-center">
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
                <div className="w-20 h-20 bg-[#4D0D0D] rounded-2xl flex items-center justify-center mx-auto mb-6">
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#4D0D0D] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
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
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            {filteredWidgets.map((widget, index) => {
              const isFirst = index === 0
              return (
                <div
                  key={widget.id}
                  id={isFirst ? 'tour-widget-card' : undefined}
                  className={`min-w-0 bg-white rounded-2xl border transition-all hover:shadow-md ${
                    selectedWidgets.includes(widget.id) ? 'border-[#09923B] ring-2 ring-[#09923B]/20' : 'border-border'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      {/* Top row: checkbox + icon + info (always visible) */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedWidgets.includes(widget.id)}
                          onChange={() => toggleSelectWidget(widget.id)}
                          className="w-5 h-5 mt-1 rounded border-gray-300 text-[#09923B] focus:ring-[#09923B] shrink-0"
                        />

                        {/* Widget Icon */}
                        <div
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shrink-0 border border-gray-100 shadow-sm"
                          style={{ backgroundColor: widget.primary_color || '#25D366' }}
                        >
                          <img
                            src="/logo%20chatbot-bg%20transparan.png"
                            alt={widget.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Widget Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <h3 className="font-semibold text-base sm:text-lg truncate">{widget.name}</h3>
                            <span className="px-2.5 py-1 bg-[#09923B]/15 text-[#07752f] text-xs font-medium rounded-full whitespace-nowrap shrink-0">
                              Aktif
                            </span>
                          </div>

                          {widget.welcome_message && (
                            <p className="text-sm text-muted-foreground mb-1 sm:mb-2 line-clamp-2">
                              &ldquo;{widget.welcome_message}&rdquo;
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(widget.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <div
                                className="w-3 h-3 rounded-full border border-gray-200 shrink-0"
                                style={{ backgroundColor: widget.primary_color || '#25D366' }}
                              />
                              <span className="truncate max-w-25">{widget.primary_color || '#25D366'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions - separate row on mobile */}
                      <div className="flex items-center justify-start sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
                        <button
                          onClick={() => setExpandedWidgetId(expandedWidgetId === widget.id ? null : widget.id)}
                          id={isFirst ? 'tour-doc-manage' : undefined}
                          className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold select-none border ${
                            expandedWidgetId === widget.id
                              ? 'bg-[#09923B] text-white border-[#09923B] shadow-sm hover:bg-[#07752f]'
                              : 'text-muted-foreground bg-white border-gray-200 hover:text-[#09923B] hover:bg-[#09923B]/10 hover:border-[#09923B]/30'
                          }`}
                          title="Kelola Knowledge Base / Dokumen RAG"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {expandedWidgetId === widget.id ? 'Tutup Dokumen' : 'Kelola Dokumen'}
                        </button>
                        <button
                          onClick={() => handleEditClick(widget)}
                          className="p-2.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Pengaturan / Edit Widget"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
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
                          className="p-2.5 text-muted-foreground hover:text-[#09923B] hover:bg-[#09923B]/10 rounded-xl transition-colors"
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
                    <div className="mt-3 sm:mt-4 ml-0 sm:ml-14 p-3 bg-muted rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">Instruksi AI</p>
                      <p className="text-sm text-foreground/80 line-clamp-3 sm:line-clamp-4 wrap-anywhere">{widget.prompt}</p>
                    </div>
                  )}

                  {/* Expanded Document Management Section */}
                  {expandedWidgetId === widget.id && (
                    <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-border animate-in fade-in slide-in-from-top duration-300">
                      <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                        {/* Upload Widget */}
                        <div className="min-w-0 bg-gray-50/40 p-4 sm:p-5 rounded-2xl border border-dashed border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                            <svg className="w-4.5 h-4.5 text-[#09923B] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5 shrink-0">
                            <svg className="w-4.5 h-4.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Daftar Dokumen
                          </h4>
                          <div className="min-h-0 max-h-105 overflow-y-auto overscroll-contain pr-1">
                            <DocumentList
                              widgetId={widget.id}
                              refreshTrigger={refreshTriggers[widget.id] || 0}
                            />
                          </div>
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
                <div className="w-10 h-10 bg-[#09923B]/15 rounded-xl flex items-center justify-center text-[#09923B]">
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
                <span>{`<script src="${window.location.origin}/api/widget/${embedGuideWidget.id}${embedGuideWidget.api_token ? `?token=${embedGuideWidget.api_token}` : ''}" async></script>`}</span>
              </div>

              {/* Steps */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-sm text-gray-800">Langkah Pemasangan:</h4>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#09923B]/10 text-[#07752f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#09923B]/20">
                    1
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Klik ikon salin di atas untuk menyalin tag skrip integrasi chatbot Anda.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#09923B]/10 text-[#07752f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#09923B]/20">
                    2
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Buka file HTML utama website Anda (atau di bagian Custom HTML / Footer script pada CMS seperti WordPress, Webflow, atau Wix).
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#09923B]/10 text-[#07752f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#09923B]/20">
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
                className="px-6 py-2.5 bg-[#4D0D0D] hover:opacity-90 text-white rounded-xl text-sm font-semibold shadow-lg transition-all focus:outline-none"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editWidget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setEditWidget(null)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-lg w-full border border-gray-100 flex flex-col animate-in fade-in zoom-in duration-200 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800">Edit Pengaturan Widget</h3>
              <button 
                onClick={() => setEditWidget(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Nama Widget *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Warna Utama</label>
                  <input
                    type="text"
                    value={editPrimaryColor}
                    onChange={(e) => setEditPrimaryColor(e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Warna</label>
                  <input
                    type="color"
                    value={editPrimaryColor}
                    onChange={(e) => setEditPrimaryColor(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Pesan Sambutan</label>
                <input
                  type="text"
                  value={editWelcomeMessage}
                  onChange={(e) => setEditWelcomeMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600">Instruksi AI (Prompt)</label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Security Section */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h4 className="font-semibold text-sm text-gray-800 mb-3">Keamanan Widget</h4>
                
                <div className="mb-3">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">Allowed Domains (Domain yang Diizinkan)</label>
                  <p className="text-[10px] text-gray-500 mb-2">Pisahkan dengan baris baru (Enter). Kosongkan untuk mengizinkan semua domain (Tidak Disarankan).</p>
                  <textarea
                    value={editAllowedDomains}
                    onChange={(e) => setEditAllowedDomains(e.target.value)}
                    rows={3}
                    placeholder="https://website-saya.com&#10;http://localhost:3000"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all resize-none font-mono"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">API Token</label>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-700 truncate">
                      {editWidget?.api_token || 'Belum ada token'}
                    </code>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input 
                      type="checkbox" 
                      checked={regenerateToken}
                      onChange={(e) => setRegenerateToken(e.target.checked)}
                      className="rounded border-gray-300 text-[#09923B] focus:ring-[#09923B]"
                    />
                    <span className="text-xs text-red-600 font-medium">Regenerate Token (Token lama akan hangus)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditWidget(null)}
                  className="flex-1 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all focus:outline-none cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-6 py-2.5 bg-[#09923B] hover:bg-[#07752f] text-white rounded-xl text-sm font-semibold shadow-lg transition-all focus:outline-none flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editLoading && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



