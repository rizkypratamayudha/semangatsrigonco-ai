'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      toast.error(error.message || 'Gagal mengirim email reset password')
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-green-50 to-white">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Reset Password</h1>
          <p className="text-white/90 text-lg max-w-md">
            Masukkan email Anda dan kami akan mengirimkan link untuk mengatur ulang password Anda.
          </p>
          <div className="mt-10 bg-white/10 rounded-2xl p-5 max-w-sm mx-auto text-left space-y-3">
            {['Cek folder Inbox email Anda', 'Klik link yang dikirim', 'Buat password baru yang kuat'].map((tip, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-white/90 text-sm">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">ChatToko</span>
          </div>

          {!sent ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Lupa Password?</h2>
                <p className="text-muted-foreground">Masukkan email Anda untuk menerima link reset password</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="nama@email.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 gradient-bg text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Mengirim...
                    </>
                  ) : (
                    'Kirim Link Reset Password'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success state */
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3">Email Terkirim!</h2>
              <p className="text-muted-foreground mb-2">
                Kami telah mengirimkan link reset password ke:
              </p>
              <p className="font-semibold text-green-700 mb-6 bg-green-50 px-4 py-2 rounded-xl inline-block">
                {email}
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Cek folder <span className="font-semibold">Inbox</span> atau <span className="font-semibold">Spam</span> Anda. Link berlaku selama <span className="font-semibold">1 jam</span>.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline"
              >
                Kirim ulang ke email lain
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-muted-foreground text-sm">
            Ingat password Anda?{' '}
            <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold transition-colors">
              Kembali ke Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
