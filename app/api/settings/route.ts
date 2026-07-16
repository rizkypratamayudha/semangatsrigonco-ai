import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        emailNotifications: true,
        chatNotifications: true,
        weeklyReport: true,
        marketingEmails: false,
        theme: 'light',
        language: 'id',
      })
    }

    return NextResponse.json({
      emailNotifications: settings.email_notifications,
      chatNotifications: settings.chat_notifications,
      weeklyReport: settings.weekly_report,
      marketingEmails: settings.marketing_emails,
      theme: settings.theme,
      language: settings.language,
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const settingsData = {
      user_id: user.id,
      email_notifications: body.emailNotifications,
      chat_notifications: body.chatNotifications,
      weekly_report: body.weeklyReport,
      marketing_emails: body.marketingEmails,
      theme: body.theme,
      language: body.language,
      updated_at: new Date().toISOString(),
    }

    // Upsert settings
    const { error } = await supabase
      .from('user_settings')
      .upsert(settingsData, { onConflict: 'user_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
