import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { generateEmbedding, searchSimilarChunks } from '@/lib/rag/embeddings';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  widgetId: string;
  conversationId?: string;
  history?: ChatMessage[];
}

function isSimilarQuery(q1: string, q2: string): boolean {
  const clean1 = q1.trim().toLowerCase().replace(/[^\w\s]/gi, '');
  const clean2 = q2.trim().toLowerCase().replace(/[^\w\s]/gi, '');
  if (!clean1 || !clean2) return false;
  if (clean1 === clean2) return true;

  const words1 = clean1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = clean2.split(/\s+/).filter((w) => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return false;

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersection = 0;
  set1.forEach((w) => {
    if (set2.has(w)) intersection++;
  });

  const similarity = (2 * intersection) / (set1.size + set2.size);
  return similarity >= 0.70;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, widgetId, conversationId, history = [] } = body;

    if (!message || !widgetId) {
      return NextResponse.json(
        { error: 'Message and widgetId are required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Fetch widget via Prisma to bypass RLS restrictions for chat visitors
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
    });

    if (!widget) {
      return NextResponse.json(
        { error: 'Widget not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // --- Security Checks ---
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    
    let requestDomain = origin;
    if (!requestDomain && referer) {
      try {
        requestDomain = new URL(referer).origin;
      } catch (e) {
        // Invalid referer
      }
    }

    if (widget.allowedDomains && widget.allowedDomains.length > 0) {
      if (!requestDomain) {
        return NextResponse.json(
          { error: 'Missing Origin or Referer header for domain validation.' },
          { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
      
      const cleanRequestDomain = requestDomain.replace(/\/$/, '');
      const isAllowed = widget.allowedDomains.some(domain => {
        const cleanDomain = domain.replace(/\/$/, '');
        return cleanRequestDomain === cleanDomain || cleanRequestDomain.endsWith(cleanDomain);
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: `Domain ${requestDomain} is not authorized.` },
          { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Since token is passed via the script src url, it's not present in chat POST request.
    // However, if we want chat API to also be protected by token, the frontend must send it.
    // For now, domain whitelisting is the primary protection for the chat API,
    // because the token is primarily checked on widget load.
    // --- End Security Checks ---

    const supabase = await createClient();

    // Create or get conversation using Prisma
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      try {
        const newConversation = await prisma.conversations.create({
          data: {
            widget_id: widgetId,
            user_id: widget.userId,
            visitor_id: crypto.randomUUID(),
            message_count: 0,
          },
          select: { id: true },
        });
        currentConversationId = newConversation.id;
      } catch (convError) {
        console.error('Failed to create conversation:', convError);
      }
    }

    // Save user message via Prisma
    if (currentConversationId) {
      try {
        await prisma.messages.create({
          data: {
            conversation_id: currentConversationId,
            role: 'user',
            content: message,
          },
        });

        await prisma.conversations.update({
          where: { id: currentConversationId },
          data: {
            message_count: { increment: 1 },
          },
        }).catch(() => {});
      } catch (msgErr) {
        console.error('Failed to save user message:', msgErr);
      }
    }

    // Check if the user's message is a simple greeting or small talk expression
    const cleanMsg = message.trim().toLowerCase();
    const isGreeting = /^(halo|hallo|hi|hai|hey|p|ping|selamat\s+(pagi|siang|sore|malam)|assalamu\s*alaikum|salam|terima\s*kasih|makasih|thanks|thank\s*you)$/i.test(cleanMsg) ||
      (cleanMsg.length <= 15 && /^(halo|hi|hai|selamat\s+(pagi|siang|sore|malam)|terima\s*kasih|makasih)\b/i.test(cleanMsg));

    // Calculate how many times the user has asked the exact same or very similar question in a row
    const previousUserMessages = history.filter((m) => m.role === 'user').map((m) => m.content);
    let sameQuestionCount = 1;
    for (let i = previousUserMessages.length - 1; i >= 0; i--) {
      if (isSimilarQuery(message, previousUserMessages[i])) {
        sameQuestionCount++;
      } else {
        break;
      }
    }

    // Calculate consecutive unhelpful/not-found responses in history
    let consecutiveUnhelpfulCount = 0;
    const assistantHistory = history.filter((m) => m.role === 'assistant');
    for (let i = assistantHistory.length - 1; i >= 0; i--) {
      const text = assistantHistory[i].content.toLowerCase();
      if (
        text.includes('tidak dapat menemukan informasi') ||
        text.includes('tidak menemukan') ||
        text.includes('hubungi tim support') ||
        text.includes('customer support') ||
        text.includes('layanan pelanggan')
      ) {
        consecutiveUnhelpfulCount++;
      } else {
        break;
      }
    }

    // Smart RAG search: include recent user question context for follow-up questions
    const previousUserMsg = history.filter((m) => m.role === 'user').slice(-1)[0]?.content;
    const ragSearchQuery = previousUserMsg && message.length < 30 ? `${previousUserMsg} ${message}` : message;

    let relevantChunks: Array<{
      id: string;
      content: string;
      document_id: string;
      similarity: number;
      metadata: Record<string, unknown>;
    }> = [];

    if (!isGreeting) {
      try {
        const queryEmbedding = await generateEmbedding(ragSearchQuery);
        const searchResults = await searchSimilarChunks(
          queryEmbedding,
          widgetId,
          3,
          supabase
        );
        relevantChunks = searchResults;
      } catch {
        console.log('No embeddings available or search failed, proceeding without RAG');
      }
    }

    // Filter chunks by similarity threshold (0.50 is optimal for precise matching)
    const SIMILARITY_THRESHOLD = 0.50;
    const filteredChunks = relevantChunks.filter(chunk => chunk.similarity >= SIMILARITY_THRESHOLD);

    // Try to extract contact support info from documents if user is stuck/repeating questions
    let supportContactChunkText = '';
    if ((sameQuestionCount >= 3 || consecutiveUnhelpfulCount >= 2) && !isGreeting) {
      try {
        const supportEmbedding = await generateEmbedding('kontak support customer service whatsapp email nomor telepon bantuan layanan pengaduan cs admin helpdesk');
        const supportChunks = await searchSimilarChunks(supportEmbedding, widgetId, 2, supabase);
        const bestChunk = supportChunks.find((c: { similarity: number; content: string }) => c.similarity >= 0.30);
        if (bestChunk) {
          supportContactChunkText = bestChunk.content;
        }
      } catch {}
    }

    // Build system prompt
    const systemPrompt = widget.prompt || 'You are a helpful customer service assistant.';
    const welcomeMessage = widget.welcomeMessage || 'Halo! Ada yang bisa saya bantu?';

    // Escalation response when user asks unhelpful/unanswered questions >= 2 times in a row
    const fallbackSupportText = supportContactChunkText
      ? `Maaf, saya belum menemukan jawaban yang tepat untuk pertanyaan Anda setelah beberapa kali mencoba. Untuk bantuan langsung, silakan hubungi kontak berikut:\n\n${supportContactChunkText}`
      : 'Maaf, saya belum menemukan jawaban yang tepat untuk pertanyaan Anda setelah beberapa kali mencoba. Agar masalah Anda segera terselesaikan, silakan hubungi tim Customer Support / Layanan Pelanggan kami secara langsung untuk bantuan personal. 📞💬';

    // If already failed 2+ times consecutively and still no document found, immediately return escalation message
    if (consecutiveUnhelpfulCount >= 2 && filteredChunks.length === 0 && !isGreeting) {
      if (currentConversationId) {
        await prisma.messages.create({
          data: {
            conversation_id: currentConversationId,
            role: 'assistant',
            content: fallbackSupportText,
          },
        }).catch(() => {});
      }
      return NextResponse.json({
        response: fallbackSupportText,
        sources: [],
        conversationId: currentConversationId,
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    let systemInstructionText = '';

    if (sameQuestionCount >= 3 && !isGreeting) {
      // Direct escalation prompt for users asking the EXACT same question 3 times
      systemInstructionText = `${systemPrompt}

[CRITICAL ESCALATION INSTRUCTION]
The user has asked the EXACT same question ("${message}") ${sameQuestionCount} times in a row. This indicates that they did not understand or were unsatisfied with previous automated AI explanations.
You MUST:
1. Politely acknowledge that they have asked this question multiple times (e.g. "Saya perhatikan Anda menanyakan hal yang sama beberapa kali...").
2. Direct them to contact human support / Customer Service for direct assistance.
3. ${supportContactChunkText ? `Include this exact contact information found in the documents:\n"${supportContactChunkText}"` : 'Advise them to contact the administrator or customer support for guided help.'}`;
    } else if (isGreeting) {
      systemInstructionText = `${systemPrompt}

[CRITICAL INSTRUCTION]
The user is greeting you or expressing politeness (message: "${message.trim()}"). Respond warmly, politely, and concisely in the same language. Offer to assist them with any questions regarding the company/organization's documents and guides.`;
    } else if (filteredChunks.length > 0) {
      const contextParts = filteredChunks.map(
        (chunk, i) => `[Document ${i + 1}]\n${chunk.content}`
      );
      const contextSection = `Relevant information from documents:\n${contextParts.join('\n\n')}`;
      
      systemInstructionText = `${systemPrompt}

[CRITICAL INSTRUCTION]
You must ONLY answer the user's question using the provided document information below. Do NOT use your own general knowledge to answer. If the document information does not contain the answer, or if the question is unrelated, you MUST reply with exactly: "Maaf, saya tidak dapat menemukan informasi tersebut dalam dokumen panduan." and nothing else.

${contextSection}

Always respond in the same language as the user's message.

[VISUAL CHARTS & DIAGRAMS INSTRUCTION]
1. For step-by-step processes, workflows, and structures, use \`\`\`mermaid graph TD ... \`\`\`.
2. For numerical data, trends, comparisons, or visual charts (e.g., "bar chart", "grafik batang", "pie chart", "line chart"):
DO NOT create a flowchart tree using Mermaid graph TD. Instead, output an interactive visual chart code block using \`\`\`chart JSON format:

Example Bar Chart:
\`\`\`chart
{
  "type": "bar",
  "title": "Tren Listrik (kWh)",
  "categories": ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "Mei 2024"],
  "series": [
    { "name": "Penggunaan (kWh)", "data": [7806.53, 7382.3, 8180.75, 6325.81, 8955.07] }
  ]
}
\`\`\`

Example Pie Chart:
\`\`\`chart
{
  "type": "pie",
  "title": "Distribusi Penggunaan",
  "series": [
    { "name": "Jan 2024", "value": 7806.53 },
    { "name": "Feb 2024", "value": 7382.30 }
  ]
}
\`\`\``;
    } else {
      systemInstructionText = `${systemPrompt}

[CRITICAL INSTRUCTION]
The user's query is outside the scope of your documents. You are strictly FORBIDDEN from answering using your own knowledge. You must reply with exactly: "Maaf, saya tidak dapat menemukan informasi tersebut dalam dokumen panduan." and nothing else.`;
    }

    // Build Gemini contents array ensuring strict alternation (user -> model -> user -> model) and starting with user
    const formattedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    const recentHistory = history.slice(-6);

    for (const msg of recentHistory) {
      const geminiRole = msg.role === 'assistant' ? 'model' : 'user';

      // Ensure history starts with 'user'
      if (formattedHistory.length === 0 && geminiRole !== 'user') {
        continue;
      }

      // Ensure no consecutive identical roles
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === geminiRole) {
        formattedHistory[formattedHistory.length - 1].parts[0].text += `\n${msg.content}`;
      } else {
        formattedHistory.push({
          role: geminiRole,
          parts: [{ text: msg.content }],
        });
      }
    }

    // Ensure the last role in history before current message is 'model' (or array empty)
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
      formattedHistory.pop();
    }

    const contents = [
      ...formattedHistory,
      {
        role: 'user' as const,
        parts: [{ text: message }],
      },
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    // Call Gemini API
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error('AI API error:', errorData.error?.message || aiResponse.statusText);
      
      // Save fallback response
      if (currentConversationId) {
        await prisma.messages.create({
          data: {
            conversation_id: currentConversationId,
            role: 'assistant',
            content: welcomeMessage,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        response: welcomeMessage,
        sources: [],
        conversationId: currentConversationId,
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const aiData = await aiResponse.json();
    let assistantMessage =
      aiData.candidates?.[0]?.content?.parts?.[0]?.text || welcomeMessage;

    // If response is unhelpful and history already had consecutive unhelpful responses, upgrade to escalation
    if (
      consecutiveUnhelpfulCount >= 2 &&
      !isGreeting &&
      (assistantMessage.includes('tidak dapat menemukan informasi') || assistantMessage.includes('tidak menemukan'))
    ) {
      assistantMessage = fallbackSupportText;
    }

    // Save assistant message via Prisma
    if (currentConversationId) {
      try {
        await prisma.messages.create({
          data: {
            conversation_id: currentConversationId,
            role: 'assistant',
            content: assistantMessage,
          },
        });

        await prisma.conversations.update({
          where: { id: currentConversationId },
          data: {
            message_count: { increment: 1 },
          },
        }).catch(() => {});
      } catch (saveErr) {
        console.error('Failed to save assistant message:', saveErr);
      }
    }

    // Format sources only if not a simple greeting
    const sources = isGreeting
      ? []
      : filteredChunks.map((chunk) => ({
          documentId: chunk.document_id,
          filename: (chunk.metadata?.filename as string) || 'Dokumen',
          similarity: chunk.similarity,
        }));

    return NextResponse.json({
      response: assistantMessage,
      sources,
      conversationId: currentConversationId,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
