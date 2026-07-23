// @ts-ignore
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

export interface ParsedFile {
  text: string;
  metadata?: Record<string, unknown>;
}

export async function parsePDF(input: string | Buffer): Promise<ParsedFile> {
  const buffer = typeof input === 'string' ? readFileSync(input) : input;
  const data = await pdf(buffer);
  return {
    text: data.text,
    metadata: {
      numpages: data.numpages,
      info: data.info,
    },
  };
}

export async function parseDOCX(buffer: Buffer): Promise<ParsedFile> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, metadata: {} };
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

export function parseFile(input: string | Buffer, fileType: string): Promise<ParsedFile> {
  switch (fileType.toLowerCase()) {
    case 'application/pdf':
      return parsePDF(input);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDOCX(Buffer.isBuffer(input) ? input : readFileSync(input));
    case 'text/plain':
      return Promise.resolve(parseTXT(Buffer.isBuffer(input) ? input : readFileSync(input)));
    case 'text/csv':
    case 'application/vnd.ms-excel':
      return Promise.resolve(parseCSV(Buffer.isBuffer(input) ? input : readFileSync(input)));
    default:
      return Promise.resolve(parseTXT(Buffer.isBuffer(input) ? input : readFileSync(input)));
  }
}
