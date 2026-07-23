'use client'

import { useState, useEffect } from 'react'
import UploadWidget from '@/components/upload-widget'
import DocumentList from '@/components/document-list'

interface Widget {
  id: string
  name: string
}

export default function DocumentsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadWidgets() {
      try {
        const response = await fetch('/api/widgets')
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) {
            setWidgets(data)
            if (data.length > 0 && !selectedWidgetId) {
              setSelectedWidgetId(data[0].id)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch widgets:', error)
      }
    }

    loadWidgets()

    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleUploadComplete() {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dokumen</h1>
          <p className="text-muted-foreground">Upload dan kelola dokumen untuk knowledge base chatbot</p>
        </div>
        {widgets.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Widget:</label>
            <select
              value={selectedWidgetId}
              onChange={(e) => setSelectedWidgetId(e.target.value)}
              className="px-4 py-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent min-w-[200px]"
            >
              {widgets.map((widget) => (
                <option key={widget.id} value={widget.id}>
                  {widget.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {widgets.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Belum Ada Widget</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Buat widget terlebih dahulu sebelum mengupload dokumen. Dokumen akan digunakan sebagai knowledge base untuk chatbot.
          </p>
          <a
            href="/dashboard/widgets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4D0D0D] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Widget Sekarang
          </a>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#4D0D0D] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Upload Dokumen</h2>
                  <p className="text-sm text-muted-foreground">Drag & drop atau klik untuk upload</p>
                </div>
              </div>
              {selectedWidgetId && (
                <UploadWidget
                  widgetId={selectedWidgetId}
                  onUploadComplete={handleUploadComplete}
                />
              )}
            </div>
          </div>

          {/* Document List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Dokumen</h3>
              </div>
              {selectedWidgetId && (
                <DocumentList
                  widgetId={selectedWidgetId}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

