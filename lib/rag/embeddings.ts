import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/client';

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
        outputDimensionality: 384,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini Embedding API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();

  if (data.embedding?.values) {
    return data.embedding.values;
  }

  throw new Error('Invalid embedding response format from Gemini');
}

export async function generateAndStoreEmbeddings(
  documentId: string,
  chunks: Array<{
    content: string;
    index: number;
    metadata: Record<string, unknown>;
  }>,
  batchSize: number = 3,
  supabaseClient?: any
): Promise<void> {
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchTexts = batch.map((c) => c.content);

    const batchEmbeddings = await Promise.all(
      batchTexts.map((text) => generateEmbedding(text))
    );

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embeddingStr = `[${batchEmbeddings[j].join(',')}]`;
      const metadataJson = JSON.stringify(chunk.metadata || {});

      try {
        await prisma.$executeRaw`
          INSERT INTO document_chunks (id, document_id, content, chunk_index, embedding, metadata, created_at)
          VALUES (
            gen_random_uuid(),
            ${documentId}::uuid,
            ${chunk.content},
            ${chunk.index},
            ${embeddingStr}::vector,
            ${metadataJson}::jsonb,
            NOW()
          )
        `;
      } catch (err: any) {
        console.error('Failed to store chunk via Prisma, trying fallback:', err?.message);
        const supabase = supabaseClient || createClient();
        const { error } = await supabase.from('document_chunks').insert({
          document_id: documentId,
          content: chunk.content,
          chunk_index: chunk.index,
          embedding: embeddingStr,
          metadata: chunk.metadata,
        });
        if (error) {
          throw new Error(`Failed to store embeddings: ${error.message}`);
        }
      }
    }

    if (i + batchSize < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Keep old function for backward compatibility
export async function generateEmbeddings(
  texts: string[],
  batchSize: number = 3
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);

    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return embeddings;
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  widgetId?: string,
  matchCount: number = 3,
  supabaseClient?: any
) {
  const embeddingVectorStr = `[${queryEmbedding.join(',')}]`;

  try {
    let results: Array<{
      id: string;
      content: string;
      document_id: string;
      similarity: number;
      metadata: any;
    }> = [];

    if (widgetId) {
      results = await prisma.$queryRaw`
        SELECT 
          dc.id::text as id,
          dc.content,
          dc.document_id::text as document_id,
          (1 - (dc.embedding <=> ${embeddingVectorStr}::vector))::float as similarity,
          dc.metadata
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE d.widget_id = ${widgetId}::uuid
        ORDER BY dc.embedding <=> ${embeddingVectorStr}::vector ASC
        LIMIT ${matchCount}
      `;
    } else {
      results = await prisma.$queryRaw`
        SELECT 
          dc.id::text as id,
          dc.content,
          dc.document_id::text as document_id,
          (1 - (dc.embedding <=> ${embeddingVectorStr}::vector))::float as similarity,
          dc.metadata
        FROM document_chunks dc
        ORDER BY dc.embedding <=> ${embeddingVectorStr}::vector ASC
        LIMIT ${matchCount}
      `;
    }

    if (results && results.length > 0) {
      for (const res of results) {
        if (res.document_id && (!res.metadata || !res.metadata.filename)) {
          const doc = await prisma.documents.findUnique({
            where: { id: res.document_id },
            select: { filename: true },
          });
          if (doc?.filename) {
            res.metadata = { ...(res.metadata || {}), filename: doc.filename };
          }
        }
      }
      return results;
    }
  } catch (err: any) {
    console.error('Prisma vector search error, trying RPC fallback:', err?.message);
  }

  // Fallback to Supabase RPC if Prisma raw query fails
  try {
    const supabase = supabaseClient || createClient();
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: embeddingVectorStr,
      match_threshold: 0.0,
      match_count: matchCount,
      filter_widget_id: widgetId || null,
    });

    if (error) {
      console.error('RPC Error searching similar chunks:', error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

export const storeEmbeddings = generateAndStoreEmbeddings;
