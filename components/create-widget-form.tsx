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

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (!name.trim()) {
      toast.error('Nama widget wajib diisi')
      setLoading(false)
      return
    }

    // Fetch user's plan tier to restrict widget count
    const { data: userData } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single()

    const userTier = userData?.tier || 'free'

    const { count } = await supabase
      .from('widgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const widgetLimit = userTier === 'free' ? 1 : userTier === 'pro' ? 2 : 3

    if (count !== null && count >= widgetLimit) {
      toast.error(`Batas jumlah widget tercapai. Akun ${userTier.toUpperCase()} Anda hanya diizinkan membuat maksimal ${widgetLimit} widget. Silakan upgrade plan Anda untuk menambah kuota!`)
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('widgets')
      .insert({
        name: name.trim(),
        welcome_message: welcomeMessage.trim() || null,
        prompt: prompt.trim() || null,
        primary_color: primaryColor,
        user_id: userId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      toast.error(insertError.message)
      setLoading(false)
      return
    }

    if (!data) {
      toast.error('Gagal membuat widget - data tidak dikembalikan')
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
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="grid md:grid-cols-2 gap-5">
        {/* Nama Widget */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Nama Widget <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Customer Support Bot"
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Warna Utama */}
        <div>
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
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pesan Sambutan */}
      <div>
        <label className="block text-sm font-semibold mb-2">Pesan Sambutan</label>
        <input
          type="text"
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="Contoh: Halo! Ada yang bisa dibantu? 👋"
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Pesan yang muncul saat pertama kali user membuka chat</p>
      </div>

      {/* Prompt AI */}
      <div>
        <label className="block text-sm font-semibold mb-2">Instruksi AI (Prompt)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Contoh: Kamu adalah customer service yang ramah dan profesional. Jawab pertanyaan pelanggan tentang produk kami dengan singkat dan jelas..."
          rows={4}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Instruksi untuk AI tentang bagaimana harus merespon</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
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
