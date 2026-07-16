import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import { readFileSync, existsSync } from 'fs';
import { PDFParse } from 'pdf-parse';
import path from 'path';
import { pathToFileURL } from 'url';

export interface ParsedFile {
  text: string;
  metadata: {
    pageNumber?: number;
    pageCount?: number;
    recordCount?: number;
  };
}

export async function parsePDF(input: string | Buffer): Promise<ParsedFile> {
  // Resolve pdf.worker.mjs path to avoid Turbopack import resolution issues
  const pathsToTry = [
    'node_modules/pdf-parse/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    'node_modules/pdf-parse/node_modules/pdfjs-dist/build/pdf.worker.mjs',
    'node_modules/pdfjs-dist/build/pdf.worker.mjs'
  ];

  let workerPath = '';
  for (const p of pathsToTry) {
    const absPath = path.resolve(process.cwd(), p);
    if (existsSync(absPath)) {
      workerPath = absPath;
      break;
    }
  }

  if (workerPath) {
    try {
      const workerUrl = pathToFileURL(workerPath).href;
      PDFParse.setWorker(workerUrl);
    } catch (e) {
      console.warn("Failed to set PDF worker path:", e);
    }
  }

  let parser: PDFParse | null = null;
  try {
    const buffer = Buffer.isBuffer(input) ? input : readFileSync(input);
    parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();

    return { 
      text: textResult.text.trim(), 
      metadata: { 
        pageCount: textResult.pages.length 
      } 
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
    throw error;
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {}
    }
  }
}

export async function parseDOCX(buffer: Buffer): Promise<ParsedFile> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, metadata: {} };
}

export function parseTXT(buffer: Buffer): ParsedFile {
  return { text: buffer.toString('utf-8'), metadata: {} };
}

export function parseCSV(buffer: Buffer): ParsedFile {
  const content = buffer.toString('utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const headers = Object.keys(records[0] || {});
  const text = records
    .map((record) =>
      headers.map((h) => `${h}: ${(record as Record<string, string>)[h]}`).join(', ')
    )
    .join('\n\n');

  return { text, metadata: { recordCount: records.length } };
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
