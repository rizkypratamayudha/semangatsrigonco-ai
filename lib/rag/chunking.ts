export interface Chunk {
  content: string;
  index: number;
  metadata: {
    pageNumber?: number;
    startOffset: number;
    endOffset: number;
  };
}

export function chunkText(
  text: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
  } = {}
): Chunk[] {
  const { chunkSize = 1000, chunkOverlap = 200 } = options;
  const chunks: Chunk[] = [];

  if (!text || text.trim().length === 0) {
    return chunks;
  }

  const cleanText = text.replace(/\s+/g, ' ').trim();

  if (cleanText.length <= chunkSize) {
    chunks.push({
      content: cleanText,
      index: 0,
      metadata: {
        startOffset: 0,
        endOffset: cleanText.length,
      },
    });
    return chunks;
  }

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = Math.min(startIndex + chunkSize, cleanText.length);

    if (endIndex < cleanText.length) {
      const lastSpace = cleanText.lastIndexOf(' ', endIndex);
      const lastNewline = cleanText.lastIndexOf('\n', endIndex);
      const breakPoint = Math.max(lastSpace, lastNewline);

      if (breakPoint > startIndex + chunkSize * 0.5) {
        endIndex = breakPoint;
      }
    }

    const chunkContent = cleanText.slice(startIndex, endIndex).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        metadata: {
          startOffset: startIndex,
          endOffset: endIndex,
        },
      });
      chunkIndex++;
    }

    if (endIndex >= cleanText.length) {
      break;
    }

    const nextStartIndex = endIndex - chunkOverlap;
    if (nextStartIndex <= startIndex) {
      startIndex = endIndex;
    } else {
      startIndex = nextStartIndex;
    }
  }

  return chunks;
}

export function chunkMarkdown(
  text: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
  } = {}
): Chunk[] {
  const sections = text.split(/\n#{1,3}\s+/);
  const chunks: Chunk[] = [];
  let currentOffset = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length === 0) {
      currentOffset += section.length + 1;
      continue;
    }

    if (trimmed.length <= (options.chunkSize || 1000)) {
      chunks.push({
        content: trimmed,
        index: chunks.length,
        metadata: {
          startOffset: currentOffset,
          endOffset: currentOffset + trimmed.length,
        },
      });
    } else {
      const subChunks = chunkText(trimmed, options);
      for (const subChunk of subChunks) {
        chunks.push({
          ...subChunk,
          index: chunks.length,
          metadata: {
            ...subChunk.metadata,
            startOffset: currentOffset + subChunk.metadata.startOffset,
            endOffset: currentOffset + subChunk.metadata.endOffset,
          },
        });
      }
    }

    currentOffset += section.length + 1;
  }

  return chunks;
}
