'use client'

import Link from 'next/link'

export default function MobileHeader() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-[#4D0D0D] to-[#7A1515] border-b border-white/10 z-30 flex items-center px-4 gap-3 shadow-md">
      {/* Hamburger */}
      <button
        onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
        aria-label="Buka menu"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm ring-1 ring-white/20">
          <img
            src="/logo%20chatbot-bg%20transparan.png"
            alt="Srigonco AI"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-lg font-bold text-white drop-shadow-sm">Srigonco AI</span>
      </Link>
    </div>
  )
}
