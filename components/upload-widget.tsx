'use client'

import { useState, useRef } from 'react'
import toast from 'react-hot-toast'

interface UploadWidgetProps {
  widgetId: string
  onUploadComplete?: () => void
}

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export default function UploadWidget({ widgetId, onUploadComplete }: UploadWidgetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await uploadFile(files[0])
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  async function uploadFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format file tidak didukung. Gunakan PDF, TXT, CSV, atau DOCX.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar. Maksimal 10MB.')
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('widgetId', widgetId)

      setProgress(30)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload gagal')
      }

      setProgress(100)
      toast.success(`File "${file.name}" berhasil diupload! ${data.chunks} chunks dibuat.`)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onUploadComplete?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-border hover:border-green-400 hover:bg-green-50/50'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.csv,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center
            ${isDragging ? 'bg-green-100' : 'bg-muted'}
            transition-colors
          `}>
            {uploading ? (
              <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>

          <div>
            <p className="text-lg font-semibold mb-1">
              {uploading ? 'Mengupload...' : 'Drag & drop file di sini'}
            </p>
            <p className="text-sm text-muted-foreground">
              atau <span className="text-green-600 font-medium">klik untuk browse</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['PDF', 'TXT', 'CSV', 'DOCX'].map((type) => (
              <span key={type} className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                {type}
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">Maksimal 10MB</p>
        </div>

        {/* Progress Bar */}
        {uploading && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-2xl overflow-hidden">
            <div
              className="h-full gradient-bg transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
