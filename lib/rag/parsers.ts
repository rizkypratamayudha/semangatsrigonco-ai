import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';

export interface ParsedFile {
  text: string;
  metadata?: Record<string, unknown>;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/[ﬁ]/g, 'fi')
    .replace(/[ﬂ]/g, 'fl')
    .replace(/[-‐‑‒–]\s*\n\s*/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function validateExtractedText(text: string, pageCount: number): void {
  const visibleText = text.replace(/\s/g, '');
  const wordLikeCount = (text.match(/[\p{L}\p{N}]{2,}/gu) || []).length;
  const printableRatio = visibleText.length > 0
    ? (visibleText.match(/[\p{L}\p{N}\p{P}\p{S}]/gu) || []).length / visibleText.length
    : 0;

  if (visibleText.length < 40 || wordLikeCount < 5 || printableRatio < 0.75) {
    throw new Error(
      `PDF tidak memiliki teks yang dapat diproses dengan baik (${pageCount} halaman). ` +
      'Pastikan PDF sudah OCR atau upload PDF yang teksnya dapat diseleksi.'
    );
  }
}

export async function parsePDF(input: string | Buffer): Promise<ParsedFile> {
  const buffer = typeof input === 'string' ? readFileSync(input) : input;
  const data = await pdf(buffer);
  const text = normalizeExtractedText(data.text || '');
  validateExtractedText(text, data.numpages || 0);
  return {
    text,
    metadata: {
      numpages: data.numpages,
      info: data.info,
      extractedCharacters: text.length,
      extractedWords: (text.match(/[\p{L}\p{N}]{2,}/gu) || []).length,
    },
  };
}

export async function parseDOCX(buffer: Buffer): Promise<ParsedFile> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value || '', metadata: {} };
}

export function parseTXT(buffer: Buffer): ParsedFile {
  return { text: buffer.toString('utf-8'), metadata: {} };
}

export function parseCSV(buffer: Buffer): ParsedFile {
  // Strip BOM (Byte Order Mark) from Excel CSV files
  const content = buffer.toString('utf-8').replace(/^\uFEFF/, '');

  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      escape: '\\',
      delimiter: [',', ';', '\t'],
    });

    if (Array.isArray(records) && records.length > 0) {
      const headers = Object.keys(records[0] || {});
      const text = records
        .map((record) =>
          headers
            .filter((h) => h && (record as Record<string, string>)[h])
            .map((h) => `${h}: ${(record as Record<string, string>)[h]}`)
            .join(', ')
        )
        .join('\n\n');

      return { text, metadata: { recordCount: records.length } };
    }
  } catch (parseError) {
    console.warn('CSV parser failed with strict mode, falling back to line parser:', parseError);
  }

  // Fallback parser for malformed CSV/Excel files
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const text = lines.join('\n');
  return { text, metadata: { recordCount: lines.length } };
}

export function parseFile(buffer: Buffer, fileType: string): Promise<ParsedFile> {
  switch (fileType.toLowerCase()) {
    case 'application/pdf':
      return parsePDF(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDOCX(buffer);
    case 'text/plain':
      return Promise.resolve(parseTXT(buffer));
    case 'text/csv':
    case 'application/vnd.ms-excel':
      return Promise.resolve(parseCSV(buffer));
    default:
      return Promise.resolve(parseTXT(buffer));
  }
}

