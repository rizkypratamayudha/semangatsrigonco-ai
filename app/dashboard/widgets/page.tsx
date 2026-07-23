import { createClient } from '@/lib/supabase/server'
import WidgetList from '@/components/widget-list'

export default async function WidgetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Widgets</h1>
        <p className="text-muted-foreground">Kelola semua widget chatbot AI Anda</p>
      </div>

      {/* Widget List with Two-Column Layout */}
      <WidgetList userId={user!.id} />
    </div>
  )
}

