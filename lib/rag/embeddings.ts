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
  const supabase = supabaseClient || createClient();

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchTexts = batch.map((c) => c.content);

    const batchEmbeddings = await Promise.all(
      batchTexts.map((text) => generateEmbedding(text))
    );

    const insertData = batch.map((chunk, j) => ({
      document_id: documentId,
      content: chunk.content,
      chunk_index: chunk.index,
      embedding: `[${batchEmbeddings[j].join(',')}]`,
      metadata: chunk.metadata,
    }));

    const { error } = await supabase.from('document_chunks').insert(insertData);

    if (error) {
      throw new Error(`Failed to store embeddings: ${error.message}`);
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

export async function storeEmbeddings(
  documentId: string,
  chunks: Array<{
    content: string;
    index: number;
    metadata: Record<string, unknown>;
  }>,
  embeddings: number[][],
  supabaseClient?: any
): Promise<void> {
  const supabase = supabaseClient || createClient();

  const insertData = chunks.map((chunk, i) => ({
    document_id: documentId,
    content: chunk.content,
    chunk_index: chunk.index,
    embedding: `[${embeddings[i].join(',')}]`,
    metadata: chunk.metadata,
  }));

  const { error } = await supabase.from('document_chunks').insert(insertData);

  if (error) {
    throw new Error(`Failed to store embeddings: ${error.message}`);
  }
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  widgetId: string,
  matchCount: number = 5,
  supabaseClient?: any
): Promise<
  Array<{
    id: string;
    content: string;
    document_id: string;
    similarity: number;
    metadata: Record<string, unknown>;
  }>
> {
  const supabase = supabaseClient || createClient();

  const { data, error } = await supabase.rpc('search_similar_chunks', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_widget_id: widgetId,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return data || [];
}
