import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import OnboardingTour from '@/components/onboarding-tour'

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

  // Fetch user tier from database
  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle()

  const userTier = userData?.tier || 'free'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <Sidebar userEmail={user.email ?? null} userTier={userTier} />
      <main className="ml-64 p-8 min-h-screen">
        {children}
      </main>
      <OnboardingTour />
    </div>
  )
}
