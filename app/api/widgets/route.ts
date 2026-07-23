import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const widgets = await prisma.widget.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedWidgets = widgets.map((w) => ({
      id: w.id,
      name: w.name,
      welcome_message: w.welcomeMessage,
      prompt: w.prompt,
      primary_color: w.primaryColor,
      user_id: w.userId,
      suggested_questions: w.suggestedQuestions,
      created_at: w.createdAt.toISOString(),
      updated_at: w.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedWidgets);
  } catch (error) {
    console.error('Fetch widgets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, welcome_message, prompt, primary_color, suggested_questions } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama widget wajib diisi' }, { status: 400 });
    }

    // Create widget using Prisma to bypass client-side RLS restrictions cleanly
    const newWidget = await prisma.widget.create({
      data: {
        name: name.trim(),
        welcomeMessage: welcome_message ? welcome_message.trim() : null,
        prompt: prompt ? prompt.trim() : null,
        primaryColor: primary_color || '#25D366',
        userId: user.id,
        suggestedQuestions: Array.isArray(suggested_questions) ? suggested_questions : [],
      },
    });

    return NextResponse.json(
      {
        id: newWidget.id,
        name: newWidget.name,
        welcome_message: newWidget.welcomeMessage,
        prompt: newWidget.prompt,
        primary_color: newWidget.primaryColor,
        user_id: newWidget.userId,
        suggested_questions: newWidget.suggestedQuestions,
        created_at: newWidget.createdAt.toISOString(),
        updated_at: newWidget.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create widget error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat widget' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, welcome_message, prompt, primary_color, suggested_questions } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID widget wajib diisi' }, { status: 400 });
    }

    const existingWidget = await prisma.widget.findUnique({
      where: { id },
    });

    if (!existingWidget || existingWidget.userId !== user.id) {
      return NextResponse.json({ error: 'Widget tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    const updatedWidget = await prisma.widget.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingWidget.name,
        welcomeMessage: welcome_message !== undefined ? (welcome_message ? welcome_message.trim() : null) : existingWidget.welcomeMessage,
        prompt: prompt !== undefined ? (prompt ? prompt.trim() : null) : existingWidget.prompt,
        primaryColor: primary_color || existingWidget.primaryColor,
        suggestedQuestions: Array.isArray(suggested_questions) ? suggested_questions : existingWidget.suggestedQuestions,
      },
    });

    return NextResponse.json({
      id: updatedWidget.id,
      name: updatedWidget.name,
      welcome_message: updatedWidget.welcomeMessage,
      prompt: updatedWidget.prompt,
      primary_color: updatedWidget.primaryColor,
      user_id: updatedWidget.userId,
      suggested_questions: updatedWidget.suggestedQuestions,
      created_at: updatedWidget.createdAt.toISOString(),
      updated_at: updatedWidget.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Update widget error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui widget' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID widget wajib diisi' }, { status: 400 });
    }

    const existingWidget = await prisma.widget.findUnique({
      where: { id },
    });

    if (!existingWidget || existingWidget.userId !== user.id) {
      return NextResponse.json({ error: 'Widget tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    await prisma.widget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete widget error:', error);
    return NextResponse.json({ error: 'Gagal menghapus widget' }, { status: 500 });
  }
}
