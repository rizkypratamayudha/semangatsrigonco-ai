import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Fetch widget to verify existence
    const widget = await prisma.widget.findUnique({
      where: { id }
    });
    if (!widget) {
      return NextResponse.json({ error: 'Widget tidak ditemukan.' }, { status: 404 });
    }

    // 2. Fetch document chunks
    const chunks = await prisma.document_chunks.findMany({
      where: {
        documents: {
          widget_id: id
        }
      },
      select: { content: true },
      take: 15
    });

    if (chunks.length === 0) {
      return NextResponse.json({ 
        error: 'Tidak ada dokumen yang diunggah untuk widget ini. Harap unggah dokumen terlebih dahulu di Kelola Dokumen agar AI dapat menganalisis konten Anda!' 
      }, { status: 400 });
    }

    const documentContext = chunks.map(c => c.content).join('\n\n');

    // 3. Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY tidak dikonfigurasi di server.' }, { status: 500 });
    }

    const systemInstructionText = `Anda adalah asisten AI yang bertugas menganalisis dokumen teks dan merumuskan tepat 3 contoh pertanyaan singkat (maksimal 10 kata per pertanyaan) yang paling relevan untuk ditanyakan oleh user berdasarkan konten dokumen tersebut.
Respon wajib dikembalikan HANYA dalam format JSON array yang berisi 3 string pertanyaan bahasa Indonesia, tanpa format markdown, tanpa block code, dan tanpa kata-kata penjelasan lainnya.
Contoh format output:
["Berapa harga paket layanannya?", "Bagaimana cara mendaftar?", "Apakah ada jaminan garansi?"]`;

    const promptText = `Berikut adalah konten dari dokumen widget:\n\n${documentContext}\n\nRumuskan 3 contoh pertanyaan singkat dan informatif dalam bahasa Indonesia yang sesuai dengan dokumen di atas.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          generationConfig: {
            temperature: 0.5,
            responseMimeType: 'application/json',
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json({ error: 'Gagal menghubungi server AI Gemini.' }, { status: 502 });
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      return NextResponse.json({ error: 'AI tidak mengembalikan respon.' }, { status: 502 });
    }

    let questions = JSON.parse(textResponse);
    if (!Array.isArray(questions)) {
      questions = [];
    }

    // Clean up empty strings or formatting anomalies
    questions = questions.map((q: any) => typeof q === 'string' ? q.trim() : '').filter(Boolean).slice(0, 3);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('Error generating questions:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server saat generate pertanyaan.' }, { status: 500 });
  }
}
