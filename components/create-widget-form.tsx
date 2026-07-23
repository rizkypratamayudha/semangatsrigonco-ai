'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Widget {
  id: string
  name: string
  welcome_message: string | null
  prompt: string | null
  primary_color: string | null
  created_at: string
}

interface CreateWidgetFormProps {
  userId: string
  onCreated: (widget: Widget) => void
}

export default function CreateWidgetForm({ userId, onCreated }: CreateWidgetFormProps) {
  const [name, setName] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [prompt, setPrompt] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#25D366')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sugQuestion1, setSugQuestion1] = useState('')
  const [sugQuestion2, setSugQuestion2] = useState('')
  const [sugQuestion3, setSugQuestion3] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (!name.trim()) {
      toast.error('Nama widget wajib diisi')
      setLoading(false)
      return
    }

    const suggestedQuestions = [sugQuestion1.trim(), sugQuestion2.trim(), sugQuestion3.trim()].filter(Boolean)

    try {
      const response = await fetch('/api/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          welcome_message: welcomeMessage.trim() || null,
          prompt: prompt.trim() || null,
          primary_color: primaryColor,
          suggested_questions: suggestedQuestions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Gagal membuat widget')
        setLoading(false)
        return
      }

      console.log('Widget created:', data)
      toast.success('Widget berhasil dibuat!')
      onCreated(data as Widget)
      setName('')
      setWelcomeMessage('')
      setPrompt('')
      setPrimaryColor('#25D366')
      setSugQuestion1('')
      setSugQuestion2('')
      setSugQuestion3('')
    } catch (err) {
      console.error('Insert error:', err)
      toast.error('Terjadi kesalahan koneksi saat membuat widget')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} id="tour-create-form" className="space-y-5">

      <div className="grid md:grid-cols-2 gap-5">
        {/* Nama Widget */}
        <div id="tour-form-name">
          <label className="block text-sm font-semibold mb-2">
            Nama Widget <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Customer Support Bot"
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Warna Utama */}
        <div id="tour-form-color">
          <label className="block text-sm font-semibold mb-2">Warna Utama</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-12 rounded-xl border border-border cursor-pointer"
            />
            <div className="flex-1">
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pesan Sambutan */}
      <div id="tour-form-welcome">
        <label className="block text-sm font-semibold mb-2">Pesan Sambutan</label>
        <input
          type="text"
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="Contoh: Halo! Ada yang bisa dibantu? 👋"
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Pesan yang muncul saat pertama kali user membuka chat</p>
      </div>

      {/* Prompt AI */}
      <div id="tour-form-prompt">
        <label className="block text-sm font-semibold mb-2">Instruksi AI (Prompt)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Contoh: Kamu adalah customer service yang ramah dan profesional. Jawab pertanyaan pelanggan tentang produk kami dengan singkat dan jelas..."
          rows={4}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Instruksi untuk AI tentang bagaimana harus merespon</p>
      </div>

      {/* Pertanyaan Saran */}
      <div>
        <label className="block text-sm font-semibold mb-2">Pertanyaan Saran (Maksimal 3)</label>
        <div className="space-y-3">
          <input
            type="text"
            value={sugQuestion1}
            onChange={(e) => setSugQuestion1(e.target.value)}
            placeholder="Saran Pertanyaan 1 (misal: Berapa harga paket layanan?)"
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all text-sm"
          />
          <input
            type="text"
            value={sugQuestion2}
            onChange={(e) => setSugQuestion2(e.target.value)}
            placeholder="Saran Pertanyaan 2 (misal: Apakah ada garansi / free trial?)"
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all text-sm"
          />
          <input
            type="text"
            value={sugQuestion3}
            onChange={(e) => setSugQuestion3(e.target.value)}
            placeholder="Saran Pertanyaan 3 (misal: Bagaimana cara mendaftar?)"
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent transition-all text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Pertanyaan cepat yang dapat diklik oleh pengguna saat membuka chat pertama kali</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          id="tour-form-submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#4D0D0D] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Membuat...
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
        <button
          type="button"
          onClick={() => {
            setName('')
            setWelcomeMessage('')
            setPrompt('')
            setPrimaryColor('#25D366')
            setSugQuestion1('')
            setSugQuestion2('')
            setSugQuestion3('')
            setError(null)
          }}
          className="px-6 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  )
}

