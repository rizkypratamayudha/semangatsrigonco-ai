'use client'

import { useState, useEffect } from 'react'
import UploadWidget from '@/components/upload-widget'
import DocumentList from '@/components/document-list'

interface Widget {
  id: string
  name: string
}

interface DocumentManagerProps {
  userId: string
}

export default function DocumentManager({ userId }: DocumentManagerProps) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    async function loadWidgets() {
      try {
        const response = await fetch('/api/widgets')
        if (response.ok) {
          const data = await response.json()
          setWidgets(data)
          if (data.length > 0 && !selectedWidgetId) {
            setSelectedWidgetId(data[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch widgets:', error)
      }
    }
    loadWidgets()
  }, [userId, selectedWidgetId])

  function handleUploadComplete() {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#4D0D0D] rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold">Knowledge Base (RAG)</h2>
          <p className="text-sm text-muted-foreground">Upload dokumen untuk memberikan pengetahuan ke chatbot</p>
        </div>
      </div>

      {/* Widget Selector */}
      {widgets.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Pilih Widget</label>
          <select
            value={selectedWidgetId}
            onChange={(e) => setSelectedWidgetId(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent"
          >
            {widgets.map((widget) => (
              <option key={widget.id} value={widget.id}>
                {widget.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-2">
            Dokumen akan digunakan oleh widget yang dipilih
          </p>
        </div>
      )}

      {/* Upload Section */}
      {selectedWidgetId && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Upload Dokumen</h3>
          <UploadWidget
            widgetId={selectedWidgetId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      )}

      {/* Document List */}
      {selectedWidgetId && (
        <div>
          <DocumentList
            widgetId={selectedWidgetId}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {widgets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="font-medium mb-2">Belum ada widget</p>
          <p className="text-sm">Buat widget terlebih dahulu sebelum upload dokumen</p>
        </div>
      )}
    </div>
  )
}

