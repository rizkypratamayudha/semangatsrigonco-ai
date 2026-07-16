'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from '@/components/logout-button'

interface SidebarProps {
  userEmail: string | null
  userTier?: string
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Pengaturan',
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  },
]

export default function Sidebar({ userEmail, userTier = 'free' }: SidebarProps) {
  const pathname = usePathname()

  const formattedTier = userTier.charAt(0).toUpperCase() + userTier.slice(1) + ' Plan'

  return (
    <aside className="fixed top-0 left-0 w-64 h-screen bg-white border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link id="tour-logo" href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-xl font-bold">ChatToko</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-muted-foreground hover:bg-muted'
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
      <div className="p-4 border-t border-border">
        <button
          id="tour-start-btn"
          onClick={() => {
            window.dispatchEvent(new Event('start-onboarding-tour'))
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100/80 rounded-xl transition-colors mb-4 border border-green-200/40"
        >
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Mulai Panduan Baru
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center text-white font-semibold">
            {userEmail?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{userEmail}</div>
            <div className="text-xs text-muted-foreground">{formattedTier}</div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  )
}
