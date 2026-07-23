import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import MobileHeader from '@/components/mobile-header'
import OnboardingTour from '@/components/onboarding-tour'
import { prisma } from '@/lib/prisma'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let userRole = 'user'

  // Ensure user is synced to Prisma public.users table & check role
  try {
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0

    const metaName = user.user_metadata?.full_name || user.user_metadata?.name

    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email ?? '',
        ...(metaName ? { name: metaName } : {}),
        ...(isFirstUser ? { role: 'admin' } : {}),
      },
      create: {
        id: user.id,
        email: user.email ?? '',
        name: metaName || null,
        role: 'admin', // First user is automatically Admin
      },
      select: { role: true },
    })

    userRole = dbUser.role || 'user'
  } catch (error) {
    console.error('Failed to sync user to database:', error)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar userEmail={user.email ?? null} userRole={userRole} />
      <MobileHeader />
      <main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8 min-h-screen">
        {children}
      </main>
      <OnboardingTour />
    </div>
  )
}