'use client'

import Link from 'next/link'

export default function MobileHeader() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#4D0D0D] backdrop-blur-md border-b border-white/10 z-30 flex items-center px-4 gap-3">
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
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <span className="text-lg font-bold text-white">Srigonco AI</span>
      </Link>
    </div>
  )
}
