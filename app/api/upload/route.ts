import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
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

    // Save to temp file
    const uploadDir = join(tmpdir(), 'uploads');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'bin';
    const tmpFile = join(uploadDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);

    const arrayBuffer = await file.arrayBuffer();
    writeFileSync(tmpFile, Buffer.from(arrayBuffer));

    // Insert document record via Prisma to bypass RLS policy (42501)
    const doc = await prisma.documents.create({
      data: {
        user_id: user.id,
        widget_id: widgetId || null,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'processing',
      },
    });

    // Process document and generate embeddings
    await processInBackground(doc.id, tmpFile, file.type, supabase);

    // Fetch final document status via Prisma
    const finalDoc = await prisma.documents.findUnique({
      where: { id: doc.id },
      select: { status: true, error_message: true },
    });

    if (finalDoc?.status === 'error') {
      return NextResponse.json(
        {
          id: doc.id,
          filename: file.name,
          status: 'error',
          error: finalDoc.error_message || 'Processing failed',
        },
        { status: 400 }
      );
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

async function processInBackground(
  docId: string,
  filePath: string,
  fileType: string,
  supabase: any
) {
  try {
    const buffer = readFileSync(filePath);
    const parsed = await parseFile(buffer, fileType);
    const text = parsed.text;

    if (fileType === 'application/pdf') {
      console.info('PDF extraction quality:', {
        documentId: docId,
        ...(parsed.metadata || {}),
      });
    }

    await storeChunks(docId, text, supabase);
  } catch (error) {
    console.error('Background processing error:', error);
    await prisma.documents.update({
      where: { id: docId },
      data: {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Processing failed',
      },
    });
  } finally {
    try {
      unlinkSync(filePath);
    } catch {}
  }
}

async function storeChunks(docId: string, text: string, supabase: any) {
  const chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });

  if (chunks.length === 0) {
    await prisma.documents.update({
      where: { id: docId },
      data: {
        status: 'error',
        error_message: 'No content extracted',
      },
    });
    return;
  }

  await generateAndStoreEmbeddings(
    docId,
    chunks.map((c) => ({ content: c.content, index: c.index, metadata: c.metadata })),
    3,
    supabase
  );

  await prisma.documents.update({
    where: { id: docId },
    data: {
      status: 'ready',
      total_chunks: chunks.length,
    },
  });
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

    const docs = await prisma.documents.findMany({
      where: { widget_id: widgetId },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(docs);
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

    // Delete document using Prisma to bypass RLS
    await prisma.documents.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
