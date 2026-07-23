import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serviceRoleKey && serviceRoleKey.startsWith('ey') && supabaseUrl) {
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    })
  }
  return null
}

function getTempAnonSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (supabaseUrl && supabaseKey) {
    return createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return null
}

async function verifyAdmin(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return dbUser?.role === 'admin'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await verifyAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Hanya Admin yang memiliki akses ke halaman ini' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await verifyAdmin(currentUser.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Hanya Admin yang dapat membuat akun pengguna' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, name, role } = body
    const userRole = role === 'admin' ? 'admin' : 'user'

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    // Check if user already exists in Prisma database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar di database' }, { status: 400 })
    }

    let newUserId: string | undefined

    const adminSupabase = getAdminSupabase()
    if (adminSupabase) {
      // Create user via Supabase Admin API
      const { data: adminData, error: adminError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name || '' },
      })

      if (!adminError && adminData.user?.id) {
        newUserId = adminData.user.id
      } else if (adminError && !adminError.message.includes('Bearer token')) {
        return NextResponse.json({ error: adminError.message }, { status: 400 })
      }
    }

    // Fallback if Admin API not used or returned Bearer token error
    if (!newUserId) {
      const tempSupabase = getTempAnonSupabase()
      if (!tempSupabase) {
        return NextResponse.json({ error: 'Konfigurasi Supabase tidak ditemukan' }, { status: 500 })
      }

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || '',
          },
        },
      })

      if (authError) {
        if (authError.message.includes('User already registered') || authError.message.includes('already registered')) {
          return NextResponse.json({
            error: 'Email ini sudah terdaftar di Supabase Auth. Gunakan email lain atau hapus dari Supabase Dashboard.'
          }, { status: 400 })
        }
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
      newUserId = authData.user?.id
    }

    if (!newUserId) {
      return NextResponse.json({ error: 'Gagal membuat user di Supabase Auth' }, { status: 500 })
    }

    // Insert user into Prisma `users` table with specified role
    const newUser = await prisma.user.upsert({
      where: { id: newUserId },
      update: {
        email,
        name: name || null,
        role: userRole,
      },
      create: {
        id: newUserId,
        email,
        name: name || null,
        role: userRole,
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await verifyAdmin(currentUser.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Hanya Admin yang dapat mengedit akun pengguna' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, role } = body

    if (!id) {
      return NextResponse.json({ error: 'ID user wajib diisi' }, { status: 400 })
    }

    const userRole = role === 'admin' ? 'admin' : 'user'

    // Protect active admin from accidentally demoting themselves to a normal user
    if (id === currentUser.id && userRole !== 'admin') {
      return NextResponse.json({ error: 'Anda tidak dapat menurunkan peran (demote) akun Admin milik Anda sendiri saat sedang aktif digunakan.' }, { status: 400 })
    }

    // Update user in Prisma database
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name || null,
        role: userRole,
      },
    })

    // Optionally update user_metadata in Supabase if adminSupabase is configured
    const adminSupabase = getAdminSupabase()
    if (adminSupabase) {
      await adminSupabase.auth.admin.updateUserById(id, {
        user_metadata: { full_name: name || '' },
      }).catch((err) => console.error('Failed to update Supabase metadata:', err))
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Edit user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await verifyAdmin(currentUser.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Hanya Admin yang dapat menghapus akun pengguna' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID user wajib diisi' }, { status: 400 })
    }

    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif digunakan.' }, { status: 400 })
    }

    const adminSupabase = getAdminSupabase()
    if (adminSupabase) {
      // Delete user from Supabase Auth permanently
      await adminSupabase.auth.admin.deleteUser(id).catch((err) => {
        console.error('Failed to delete from Supabase Auth admin:', err)
      })
    }

    // Delete user from Prisma database
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
