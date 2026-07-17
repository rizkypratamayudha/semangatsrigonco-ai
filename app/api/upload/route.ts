import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chunkText } from '@/lib/rag/chunking';
import { generateAndStoreEmbeddings } from '@/lib/rag/embeddings';
import { parseFile } from '@/lib/rag/parsers';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const widgetId = formData.get('widgetId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported. Allowed: PDF, TXT, CSV, DOCX' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max size: 10MB' },
        { status: 400 }
      );
    }

    // Fetch user's plan tier to restrict file format and count access
    const { data: userData } = await supabase
      .from('users')
      .select('tier')
      .eq('id', user.id)
      .single();

    const userTier = userData?.tier || 'free';

    const { count: existingDocsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('widget_id', widgetId || '');

    const docLimit = userTier === 'free' ? 1 : userTier === 'pro' ? 3 : 6;

    if (existingDocsCount !== null && existingDocsCount >= docLimit) {
      return NextResponse.json(
        { error: `Batas jumlah dokumen tercapai. Akun ${userTier.toUpperCase()} Anda hanya diizinkan mengunggah maksimal ${docLimit} dokumen. Silakan upgrade plan Anda untuk menambah kuota!` },
        { status: 400 }
      );
    }

    // 2. Enforce document format restrictions
    if (userTier === 'free' || userTier === 'pro') {
      if (!['text/plain', 'application/pdf'].includes(file.type)) {
        return NextResponse.json(
          { error: `Format file tidak didukung untuk paket ${userTier.toUpperCase()}. Hanya file .txt dan .pdf yang diperbolehkan. Silakan upgrade ke paket Enterprise untuk mengunggah berkas Word (.docx) atau Excel/CSV!` },
          { status: 400 }
        );
      }
    }


    // Save to temp file
    const uploadDir = join(tmpdir(), 'uploads');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'bin';
    const tmpFile = join(uploadDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);

    const arrayBuffer = await file.arrayBuffer();
    writeFileSync(tmpFile, Buffer.from(arrayBuffer));

    // Insert document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        widget_id: widgetId || null,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'processing',
      })
      .select()
      .single();

    if (docError) {
      try { unlinkSync(tmpFile); } catch {}
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    // Process document and generate embeddings (awaiting to prevent serverless function termination)
    await processInBackground(doc.id, tmpFile, file.type);

    // Fetch the final document status
    const { data: finalDoc } = await supabase
      .from('documents')
      .select('status, error_message')
      .eq('id', doc.id)
      .single();

    if (finalDoc?.status === 'error') {
      return NextResponse.json({ 
        id: doc.id,
        filename: file.name,
        status: 'error',
        error: finalDoc.error_message || 'Processing failed'
      }, { status: 400 });
    }

    return NextResponse.json({
      id: doc.id,
      filename: file.name,
      status: finalDoc?.status || 'ready',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processInBackground(docId: string, filePath: string, fileType: string) {
  const supabase = await createClient();

  try {
    const buffer = readFileSync(filePath);
    const parsed = await parseFile(buffer, fileType);
    const text = parsed.text;

    await storeChunks(supabase, docId, text);
  } catch (error) {
    console.error('Background processing error:', error);
    await supabase
      .from('documents')
      .update({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Processing failed',
      })
      .eq('id', docId);
  } finally {
    try { unlinkSync(filePath); } catch {}
  }
}

async function storeChunks(supabase: Awaited<ReturnType<typeof createClient>>, docId: string, text: string) {
  const chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });

  if (chunks.length === 0) {
    await supabase
      .from('documents')
      .update({ status: 'error', error_message: 'No content extracted' })
      .eq('id', docId);
    return;
  }

  await generateAndStoreEmbeddings(
    docId,
    chunks.map((c) => ({ content: c.content, index: c.index, metadata: c.metadata })),
    3,
    supabase
  );

  await supabase
    .from('documents')
    .update({ status: 'ready', total_chunks: chunks.length })
    .eq('id', docId);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get('widgetId');

    if (!widgetId) {
      return NextResponse.json({ error: 'widgetId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('widget_id', widgetId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

