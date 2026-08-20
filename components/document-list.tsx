'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Document {
  id: string
  filename: string
  file_type: string
  file_size: number | null
  total_chunks: number | null
  status: string
  error_message: string | null
  created_at: string
}

interface DocumentListProps {
  widgetId: string
  refreshTrigger?: number
}

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '\u{1F4C4}', // 📄
  'text/plain': '\u{1F4DD}', // 📝
  'text/csv': '\u{1F4CA}', // 📊
  'application/vnd.ms-excel': '\u{1F4CA}', // 📊
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '\u{1F4DC}', // 📜
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  processing: { label: 'Memproses', color: 'bg-yellow-100 text-yellow-700' },
  ready: { label: 'Siap', color: 'bg-[#09923B]/15 text-[#07752f]' },
  error: { label: 'Error', color: 'bg-red-100 text-red-600' },
}

export default function DocumentList({ widgetId, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function loadDocuments() {
      setLoading(true)
      try {
        const response = await fetch(`/api/upload?widgetId=${widgetId}`)
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) {
            setDocuments(data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (widgetId) {
      loadDocuments()
    }

    return () => {
      cancelled = true
    }
  }, [widgetId, refreshTrigger])

  async function executeDelete(id: string) {
    try {
      const response = await fetch(`/api/upload?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
        toast.success('Dokumen berhasil dihapus!')
      } else {
        toast.error('Gagal menghapus dokumen')
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error('Terjadi kesalahan koneksi saat menghapus')
    }
  }

  function refreshDocuments() {
    setLoading(true)
    fetch(`/api/upload?widgetId=${widgetId}`)
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch((error) => console.error('Failed to fetch documents:', error))
      .finally(() => setLoading(false))
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-3 text-muted-foreground">
          <svg className="w-5 h-5 animate-spin text-[#4D0D0D]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Memuat dokumen...</span>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">Belum ada dokumen</p>
        <p className="text-xs mt-1">Upload file untuk memberikan pengetahuan ke chatbot</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Dokumen ({documents.length})</h4>
        <button
          onClick={refreshDocuments}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {documents.map((doc) => {
        const statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.processing

        return (
          <div
            key={doc.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-xl border border-border hover:border-[#09923B]/40 transition-colors"
          >
            {/* File Icon + Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-xl shrink-0">
                {FILE_ICONS[doc.file_type] || '\u{1F4C4}'}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="font-medium text-sm wrap-break-word min-w-0 flex-1">{doc.filename}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 whitespace-nowrap ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span className="whitespace-nowrap">{formatFileSize(doc.file_size)}</span>
                  {doc.total_chunks && <span className="whitespace-nowrap">{doc.total_chunks} chunks</span>}
                  <span className="whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                {doc.error_message && (
                  <p className="text-xs text-red-500 mt-1 wrap-break-word">{doc.error_message}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex sm:block self-end sm:self-auto">
              <button
                onClick={() => {
                  setDeleteConfirmId(doc.id)
                  setDeleteConfirmName(doc.filename)
                }}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Hapus"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}

      {/* Custom Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Hapus Dokumen?</h3>
            <p className="text-sm text-gray-500 mb-6">Apakah Anda yakin ingin menghapus dokumen <strong className="text-gray-700">&ldquo;{deleteConfirmName}&rdquo;</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => {
                  setDeleteConfirmId(null)
                  setDeleteConfirmName('')
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all focus:outline-none"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  const id = deleteConfirmId
                  setDeleteConfirmId(null)
                  setDeleteConfirmName('')
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
    </div>
  )
}

