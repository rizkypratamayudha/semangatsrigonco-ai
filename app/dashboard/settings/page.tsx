'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type SettingsTab = 'profile' | 'security' | 'notifications'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [chatNotifications, setChatNotifications] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setFullName(authUser.user_metadata?.full_name || '')
        setEmail(authUser.email || '')
      }
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const settings = await response.json()
          setEmailNotifications(settings.emailNotifications)
          setChatNotifications(settings.chatNotifications)
          setWeeklyReport(settings.weeklyReport)
          setMarketingEmails(settings.marketingEmails)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
      setLoading(false)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleProfileSave() {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Profil berhasil diperbarui')
      } else {
        toast.error(data.error || 'Gagal memperbarui profil')
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    }
    setSaving(false)
  }

  async function handlePasswordSave() {
    setSaving(true)
    if (newPassword !== confirmPassword) {
      toast.error('Password tidak cocok')
      setSaving(false)
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password harus minimal 6 karakter')
      setSaving(false)
      return
    }
    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Password berhasil diperbarui')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Gagal memperbarui password')
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    }
    setSaving(false)
  }

  async function handleNotificationsSave() {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications, chatNotifications, weeklyReport, marketingEmails, theme: 'light', language: 'id' }),
      })
      if (response.ok) {
        toast.success('Pengaturan notifikasi tersimpan')
      } else {
        toast.error('Gagal menyimpan pengaturan')
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    }
    setSaving(false)
  }

  const tabs: { id: SettingsTab; label: string; iconPath: string }[] = [
    { id: 'profile', label: 'Profil', iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'security', label: 'Keamanan', iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'notifications', label: 'Notifikasi', iconPath: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <svg className="w-10 h-10 animate-spin text-[#09923B]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Memuat pengaturan...</span>
        </div>
      </div>
    )
  }

  const avatarLetter = (fullName || email).charAt(0).toUpperCase()

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola profil dan preferensi akun Anda</p>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        {/* Mobile Tabs - Horizontal Scroll */}
        <div className="md:hidden flex overflow-x-auto border-b border-border p-2 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#4D0D0D] text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.iconPath} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-135">
          {/* Desktop Left Navigation */}
          <div className="hidden md:flex w-56 border-r border-border p-4 flex-col">
            <nav className="space-y-1 flex-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#4D0D0D] text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.iconPath} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
            {/* User mini card at bottom of sidebar */}
            <div className="mt-auto pt-4 border-t border-border">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 bg-[#4D0D0D] rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {avatarLetter}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{fullName || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 p-4 md:p-8">

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex items-center gap-5 mb-8 p-5 bg-[#09923B]/10 rounded-2xl border border-[#09923B]/20">
                  <div className="w-20 h-20 bg-[#4D0D0D] rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md shrink-0">
                    {avatarLetter}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{fullName || 'Pengguna'}</h2>
                    <p className="text-muted-foreground text-sm">{email}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Nama Lengkap</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent text-sm transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent text-sm transition-shadow"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Perubahan email memerlukan verifikasi ulang.</p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleProfileSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#4D0D0D] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {saving ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Simpan Perubahan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-bold mb-6">Keamanan Akun</h2>
                <div className="space-y-5">
                  <div className="p-6 bg-muted rounded-2xl border border-border/50">
                    <h3 className="font-semibold mb-1">Ubah Password</h3>
                    <p className="text-sm text-muted-foreground mb-5">Perbarui password akun Anda secara berkala untuk menjaga keamanan.</p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5">Password Baru</label>
                        <div className="relative">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full px-4 py-3 pr-12 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showNewPw ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {newPassword && (
                          <div className="mt-2 flex gap-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  newPassword.length >= level * 3
                                    ? level <= 2 ? 'bg-orange-400' : 'bg-[#09923B]'
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-2 self-center">
                              {newPassword.length < 6 ? 'Lemah' : newPassword.length < 10 ? 'Cukup' : 'Kuat'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1.5">Konfirmasi Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            className={`w-full px-4 py-3 pr-12 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#09923B] focus:border-transparent text-sm transition-colors ${
                              confirmPassword && confirmPassword !== newPassword
                                ? 'border-red-300 bg-red-50/40'
                                : 'border-border'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPw ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {confirmPassword && confirmPassword !== newPassword && (
                          <p className="text-xs text-red-500 mt-1.5">Password tidak cocok</p>
                        )}
                      </div>

                      <button
                        onClick={handlePasswordSave}
                        disabled={saving || !newPassword || !confirmPassword}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#4D0D0D] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                      >
                        {saving ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Menyimpan...
                          </>
                        ) : 'Perbarui Password'}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-muted rounded-2xl border border-border/50 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Tambahkan lapisan keamanan ekstra ke akun Anda</p>
                    </div>
                    <span className="shrink-0 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Segera Hadir</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold">Pengaturan Notifikasi</h2>
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full border border-gray-200">
                    Coming Soon
                  </span>
                </div>
                <div className="space-y-3 opacity-50 pointer-events-none">
                  {[
                    { label: 'Email Notifikasi', description: 'Terima notifikasi penting melalui email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                    { label: 'Chat Notifikasi', description: 'Terima notifikasi saat ada chat baru masuk', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
                    { label: 'Laporan Mingguan', description: 'Terima ringkasan performa chatbot setiap minggu', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                    { label: 'Email Marketing', description: 'Terima info update produk dan tips penggunaan', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-border/50 shrink-0">
                          <svg className="w-4.5 h-4.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{item.label}</h3>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <div className="w-12 h-6 bg-gray-200 rounded-full relative shrink-0 ml-4">
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">Fitur notifikasi akan segera hadir. Nantikan pembaruan selanjutnya!</p>
              </div>
            )}



          </div>
        </div>
      </div>
    </div>
  )
}

