'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import LogoutButton from '@/components/logout-button'

interface SidebarProps {
  userEmail: string | null
  userRole?: string
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    href: '/dashboard/widgets',
    label: 'Widgets',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    ),
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 20V10M12 20V4M6 20v-6" />
    ),
  },
  {
    href: '/dashboard/users',
    label: 'Pengguna',
    adminOnly: true,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Pengaturan',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
]

export default function Sidebar({ userEmail, userRole = 'user' }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || userRole === 'admin')

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Dispatch event for dashboard layout to listen
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { open: mobileOpen } }))
  }, [mobileOpen])

  // Listen for toggle events from parent
  useEffect(() => {
    function handleToggle() {
      setMobileOpen((prev) => !prev)
    }
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/10 bg-gradient-to-r from-[#4D0D0D] to-[#7A1515]">
        <Link id="tour-logo" href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg ring-2 ring-white/20">
            <img
              src="/logo%20chatbot-bg%20transparan.png"
              alt="Srigonco AI"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xl font-bold text-white drop-shadow-sm">Srigonco AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3.5">
        <div className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href
            let itemId = undefined
            if (item.href === '/dashboard/widgets') itemId = 'tour-nav-widgets'
            else if (item.href === '/dashboard/analytics') itemId = 'tour-nav-analytics'
            else if (item.href === '/dashboard/settings') itemId = 'tour-nav-settings'

            return (
              <Link
                key={item.href}
                href={item.href}
                id={itemId}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-white/20 to-white/10 text-white font-medium shadow-lg shadow-black/10 backdrop-blur-sm border border-white/10'
                    : 'text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10 bg-gradient-to-r from-[#4D0D0D]/80 to-[#3A0909]/80 backdrop-blur-sm">
        <button
          id="tour-start-btn"
          onClick={() => {
            window.dispatchEvent(new Event('start-onboarding-tour'))
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 rounded-xl transition-all duration-200 mb-4 border border-white/10 shadow-inner shadow-white/5"
        >
          <svg className="w-4 h-4 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Mulai Panduan Baru
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-white/25 to-white/10 rounded-full flex items-center justify-center text-white font-semibold shadow-inner shadow-white/10">
            {userEmail?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white/90 truncate drop-shadow-sm">{userEmail}</div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 w-64 h-screen bg-gradient-to-b from-[#4D0D0D] via-[#5C1010] to-[#3A0909] border-r border-white/10 flex-col z-40 shadow-2xl">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar Panel */}
          <aside className="absolute top-0 left-0 w-72 h-full bg-gradient-to-b from-[#4D0D0D] via-[#5C1010] to-[#3A0909] border-r border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}

