import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Script from 'next/script'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const features = [
    {
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      title: 'Respon Instan dengan AI',
      desc: 'Chatbot berbasis Google Gemini AI menjawab pertanyaan pengunjung dalam hitungan detik, 24 jam sehari tanpa jeda.',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      title: 'Knowledge Base (RAG)',
      desc: 'Upload dokumen PDF, Word, atau teks — chatbot akan mempelajarinya dan menjawab berdasarkan isi dokumen Anda secara akurat.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      title: 'Kustomisasi Penuh',
      desc: 'Atur nama chatbot, pesan sambutan, warna brand, dan instruksi perilaku AI sesuai keperluan bisnis Anda.',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      title: 'Embed Satu Baris Kode',
      desc: 'Pasang chatbot ke website Anda hanya dengan satu baris tag script. Kompatibel dengan HTML, WordPress, Webflow, Wix, dan CMS apapun.',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      title: 'Analytics & Dashboard',
      desc: 'Pantau jumlah percakapan, pesan, dan performa chatbot dengan chart interaktif (ECharts) berdasarkan range 7, 30, atau 90 hari.',
      color: 'bg-teal-100 text-teal-600',
    },
    {
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      title: 'Aman & Multi-Widget',
      desc: 'Buat beberapa chatbot untuk departemen berbeda (Sales, Support, HR). Setiap widget punya knowledge base dan instruksi AI tersendiri.',
      color: 'bg-rose-100 text-rose-600',
    },
  ]

  const steps = [
    {
      num: '1',
      title: 'Daftar & Buat Widget',
      desc: 'Buat akun gratis dalam 30 detik. Lalu buat widget chatbot, isi nama, pesan sambutan, warna brand, dan instruksi AI-nya.',
    },
    {
      num: '2',
      title: 'Upload Dokumen',
      desc: 'Tambahkan file PDF, Word, atau dokumen teks sebagai knowledge base chatbot. AI akan mempelajari isi dokumen secara otomatis.',
    },
    {
      num: '3',
      title: 'Pasang ke Website',
      desc: 'Salin satu baris kode embed dari dashboard dan tempel di atas tag </body> website Anda. Chatbot langsung aktif!',
    },
  ]

  const pricingPlans = [
    {
      name: 'Free',
      price: 'Rp 0',
      period: '/bulan',
      highlight: false,
      badge: null,
      features: ['1 Widget chatbot', '50 pesan/bulan', '1 Dokumen (.pdf / .txt)', 'Analytics & Histori Chat', 'Embed ke website'],
      cta: 'Mulai Gratis',
      ctaHref: '/register',
      ctaStyle: 'border-2 border-border text-foreground hover:bg-muted',
    },
    {
      name: 'Pro',
      price: 'Rp 99K',
      period: '/bulan',
      highlight: true,
      badge: 'POPULER',
      features: ['2 Widget chatbot', '200 pesan/bulan', '3 Dokumen (.pdf / .txt)', 'Analytics & Histori Chat', 'Priority support'],
      cta: 'Pilih Paket Ini',
      ctaHref: '/register',
      ctaStyle: 'gradient-bg text-white hover:opacity-90',
    },
    {
      name: 'Enterprise',
      price: 'Rp 499K',
      period: '/bulan',
      highlight: false,
      badge: null,
      features: ['3 Widget chatbot', 'Pesan Unlimited', '6 Dokumen (Semua format)', 'Analytics & Histori Chat', 'Akses Semua Format Dokumen'],
      cta: 'Pilih Paket Ini',
      ctaHref: '/register',
      ctaStyle: 'border-2 border-border text-foreground hover:bg-muted',
    },
  ]

  const testimonials = [
    {
      text: '"Upload FAQ produk kami, langsung bisa jawab ribuan pertanyaan pelanggan otomatis. Setup 5 menit, hasilnya luar biasa!"',
      name: 'Ahmad R.',
      role: 'Toko Online Fashion',
      initial: 'A',
    },
    {
      text: '"Embed code-nya beneran satu baris! Sekarang pelanggan klinik kami bisa tanya jadwal dan harga kapan saja, tanpa nunggu CS kami online."',
      name: 'Sari W.',
      role: 'Klinik Kecantikan',
      initial: 'S',
    },
    {
      text: '"Dashboard analytics-nya membantu kami tahu topik apa yang paling sering ditanyakan pelanggan. Jadi tahu mana yang harus diperbaiki."',
      name: 'Budi H.',
      role: 'Electronics Store',
      initial: 'B',
    },
  ]

  const CheckIcon = () => (
    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-background">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-xl font-bold">ChatToko</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#fitur" className="text-muted-foreground hover:text-foreground transition-colors">Fitur</a>
              <a href="#cara-kerja" className="text-muted-foreground hover:text-foreground transition-colors">Cara Kerja</a>
              <a href="#harga" className="text-muted-foreground hover:text-foreground transition-colors">Harga</a>
              <a href="#testimoni" className="text-muted-foreground hover:text-foreground transition-colors">Testimoni</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Masuk
              </Link>
              <Link href="/register" className="px-5 py-2.5 gradient-bg rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4 relative overflow-hidden bg-gradient-to-b from-green-50/80 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-green-700">Powered by Google Gemini AI</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Chatbot AI untuk<br />
                Website Anda —
                <span className="gradient-text"> Aktif 24/7</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Buat chatbot AI yang belajar dari dokumen bisnis Anda. Upload PDF, atur instruksi, dan embed ke website dengan satu baris kode. Pelanggan terlayani, bahkan saat Anda tidur.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/register" className="px-8 py-4 gradient-bg rounded-xl text-white font-semibold text-center hover:opacity-90 transition-opacity shadow-md">
                  Mulai Gratis — Tanpa Kartu Kredit
                </Link>
                <a href="#cara-kerja" className="px-8 py-4 rounded-xl border-2 border-border text-foreground font-semibold text-center hover:bg-muted transition-colors">
                  Lihat Cara Kerja
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-5">
                {['Gratis selamanya (Free plan)', 'Setup 5 menit', 'Tanpa coding'].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-muted-foreground font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Chat Mockup */}
            <div className="hidden lg:block relative">
              <div className="bg-white rounded-3xl shadow-2xl border border-border overflow-hidden">
                {/* Chat Header */}
                <div className="gradient-bg p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Asisten Toko Saya</div>
                    <div className="text-xs text-white/80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                      Online 24/7
                    </div>
                  </div>
                </div>
                {/* Chat Messages */}
                <div className="p-5 space-y-4 min-h-[280px] bg-gray-50/60">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] shadow-sm border border-gray-100">
                      <p className="text-sm">Halo! 👋 Selamat datang di toko kami. Ada yang bisa saya bantu?</p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="gradient-bg rounded-2xl rounded-tr-none px-4 py-3 max-w-[80%] shadow-sm">
                      <p className="text-sm text-white">Apa saja fitur paket Pro-nya?</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] shadow-sm border border-gray-100">
                      <p className="text-sm mb-2">Paket Pro mencakup:</p>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 5 Widget chatbot</li>
                        <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 5.000 pesan/bulan</li>
                        <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 50 Dokumen knowledge base</li>
                        <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Analytics lanjutan</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['Cara daftar?', 'Mulai gratis dulu', 'Hubungi CS'].map((t) => (
                      <button key={t} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Input */}
                <div className="p-4 border-t border-border bg-white">
                  <div className="flex items-center gap-3">
                    <input type="text" placeholder="Ketik pertanyaan Anda..." className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm focus:outline-none" disabled />
                    <button className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-3 -right-4 bg-white rounded-2xl shadow-lg border border-border px-4 py-2.5 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">RAG Aktif</p>
                  <p className="text-[10px] text-muted-foreground">Belajar dari dokumen Anda</p>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-4 bg-white rounded-2xl shadow-lg border border-border px-4 py-2.5 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Embed 1 Baris</p>
                  <p className="text-[10px] text-muted-foreground">Pasang ke website mana saja</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-8 bg-white border-y border-border">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-5 font-medium">Dibangun di atas teknologi terpercaya</p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            {['Google Gemini AI', 'Supabase Vector DB', 'Next.js 15', 'RAG Architecture', 'ECharts Analytics'].map((t) => (
              <div key={t} className="text-sm font-bold text-gray-400 tracking-wide">{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-24 px-4 bg-gradient-to-b from-white to-green-50/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
              <span className="text-sm font-semibold text-green-700">Fitur Unggulan</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Kenapa Harus <span className="gradient-text">ChatToko</span>?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Platform lengkap untuk membuat, mengelola, dan menganalisis chatbot AI berbasis pengetahuan bisnis Anda
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {features.map((f) => (
              <div key={f.title} className="feature-card p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="cara-kerja" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
              <span className="text-sm font-semibold text-green-700">Cara Kerja</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">3 Langkah <span className="gradient-text">Mudah</span></h2>
            <p className="text-muted-foreground text-lg">Dari daftar hingga chatbot aktif, hanya butuh 5 menit</p>
          </div>
          {/* Desktop: step → arrow → step → arrow → step (5-col grid) */}
          <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-start">
            {steps.map((step, i) => (
              <React.Fragment key={step.num}>
                <div className="text-center px-6">
                  <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex items-start justify-center pt-8">
                    <svg className="w-10 h-8 text-green-300" fill="none" viewBox="0 0 40 32" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M0 16h28m0 0l-8-8m8 8l-8 8" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile: vertical stack */}
          <div className="flex flex-col gap-8 md:hidden">
            {steps.map((step, i) => (
              <div key={step.num} className="flex gap-4 items-start">
                <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold text-white shadow">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="mt-4 ml-1">
                      <svg className="w-4 h-6 text-green-300" fill="none" viewBox="0 0 16 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 0v16m0 0l-5-5m5 5l5-5" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-24 px-4 bg-gradient-to-b from-green-50/60 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
              <span className="text-sm font-semibold text-green-700">Harga Transparan</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pilih <span className="gradient-text">Paket</span> yang Tepat</h2>
            <p className="text-muted-foreground text-lg">Mulai gratis selamanya, upgrade sesuai kebutuhan bisnis Anda</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card rounded-2xl p-8 relative ${plan.highlight ? 'popular' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="gradient-bg px-5 py-1.5 rounded-full text-white text-xs font-bold shadow">{plan.badge}</span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold">{plan.price}</div>
                  <div className="text-muted-foreground text-sm">{plan.period}</div>
                </div>
                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-3 px-6 rounded-xl font-semibold transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimoni" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
              <span className="text-sm font-semibold text-green-700">Testimoni</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Kata Mereka tentang <span className="gradient-text">ChatToko</span></h2>
            <p className="text-muted-foreground text-lg">Dipercaya oleh pengguna dari berbagai jenis bisnis</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-muted rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-foreground mb-5 text-sm leading-relaxed">{t.text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.initial}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full" />
          <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-white/5 rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Pasang Chatbot AI di Website Anda?
          </h2>
          <p className="text-white/90 text-lg mb-10 leading-relaxed">
            Daftar gratis, buat widget, upload dokumen, dan embed ke website Anda dalam 5 menit. Tidak butuh coding, tidak perlu kartu kredit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-8 py-4 bg-white text-green-700 font-bold rounded-xl hover:bg-white/90 transition-colors shadow-lg text-center">
              Mulai Gratis Sekarang →
            </Link>
            <Link href="/login" className="px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-center">
              Sudah punya akun? Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14 px-4 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="text-xl font-bold">ChatToko</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Platform chatbot AI berbasis RAG untuk website Anda. Powered by Google Gemini.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">Produk</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#fitur" className="hover:text-foreground transition-colors">Fitur</a></li>
                <li><a href="#harga" className="hover:text-foreground transition-colors">Harga</a></li>
                <li><a href="#cara-kerja" className="hover:text-foreground transition-colors">Cara Kerja</a></li>
                <li><Link href="/register" className="hover:text-foreground transition-colors">Daftar Gratis</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">Dashboard</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground transition-colors">Widgets</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Knowledge Base</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Analytics</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Pengaturan</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">Support</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Dokumentasi</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status Sistem</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Kebijakan Privasi</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">© 2026 ChatToko. All rights reserved.</p>
            <p className="text-muted-foreground text-xs">Powered by Google Gemini AI · Supabase Vector DB · Next.js</p>
          </div>
        </div>
      </footer>

      <Script
        src="http://localhost:3000/api/widget/1ac30817-1b3f-49dc-b136-e9ef0176cc61"
        strategy="afterInteractive"
      />
    </div>
  )
}
