import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    // Get widget
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('*')
      .eq('id', widgetId)
      .single();

    if (widgetError || !widget) {
      return NextResponse.json(
        { error: 'Widget not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Fetch owner user's plan tier to check monthly message quota
    const { data: ownerUser } = await supabase
      .from('users')
      .select('tier')
      .eq('id', widget.user_id)
      .single();

    const userTier = ownerUser?.tier || 'free';
    const messageLimit = userTier === 'free' ? 50 : userTier === 'pro' ? 200 : Infinity;

    if (messageLimit !== Infinity) {
      const { data: count, error: countError } = await supabase
        .rpc('get_user_monthly_message_count', { owner_id: widget.user_id });
      
      if (countError) {
        console.error('Failed to fetch monthly message count:', countError.message);
      } else if (count !== null && count >= messageLimit) {
        return NextResponse.json(
          { 
            response: `Maaf, batas kuota chat bulanan untuk akun ${userTier.toUpperCase()} pemilik chatbot ini telah tercapai (${messageLimit}/${messageLimit} pesan). Silakan hubungi pemilik chatbot untuk melakukan upgrade paket.`,
            error: 'Plan quota exceeded'
          },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Create or get conversation
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          widget_id: widgetId,
          user_id: widget.user_id,
          visitor_id: crypto.randomUUID(),
          message_count: 0,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Failed to create conversation:', convError);
        // Continue without saving
      } else {
        currentConversationId = newConversation.id;
      }
    }

    // Save user message
    if (currentConversationId) {
      await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: message,
      });

      // Update conversation message count
      try {
        const { error: rpcError } = await supabase.rpc('increment_message_count', {
          p_conversation_id: currentConversationId,
        });
        if (rpcError) throw rpcError;
      } catch (rpcError) {
        // Fallback: manual increment
        const { data: convData } = await supabase
          .from('conversations')
          .select('message_count')
          .eq('id', currentConversationId!)
          .single();
        if (convData) {
          await supabase
            .from('conversations')
            .update({ message_count: convData.message_count + 1 })
            .eq('id', currentConversationId!);
        }
      }
    }

    // RAG search
    let relevantChunks: Array<{
      id: string;
      content: string;
      document_id: string;
      similarity: number;
      metadata: Record<string, unknown>;
    }> = [];

    try {
      const queryEmbedding = await generateEmbedding(message);
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

    // Filter chunks by similarity threshold (0.4 is a good standard for gemini-embedding-2)
    const SIMILARITY_THRESHOLD = 0.4;
    const filteredChunks = relevantChunks.filter(chunk => chunk.similarity >= SIMILARITY_THRESHOLD);

    // Build system prompt
    const systemPrompt = widget.prompt || 'You are a helpful customer service assistant.';
    const welcomeMessage = widget.welcome_message || 'Halo! Ada yang bisa saya bantu?';

    let systemInstructionText = '';

    if (filteredChunks.length > 0) {
      const contextParts = filteredChunks.map(
        (chunk, i) => `[Document ${i + 1}]\n${chunk.content}`
      );
      const contextSection = `Relevant information from documents:\n${contextParts.join('\n\n')}`;
      
      systemInstructionText = `${systemPrompt}

[CRITICAL INSTRUCTION]
You must ONLY answer the user's question using the provided document information below. Do NOT use your own general knowledge to answer. If the document information does not contain the answer, or if the question is unrelated, you MUST reply with exactly: "Maaf, saya tidak dapat menemukan informasi tersebut dalam dokumen panduan." and nothing else.

${contextSection}

Always respond in the same language as the user's message. You can generate flowcharts or diagrams using Mermaid.js syntax inside code blocks (\`\`\`mermaid ... \`\`\`) to explain steps, processes, structures, or flows visually when helpful.`;
    } else {
      systemInstructionText = `${systemPrompt}

[CRITICAL INSTRUCTION]
The user's query is outside the scope of your documents. You are strictly FORBIDDEN from answering using your own knowledge. You must reply with exactly: "Maaf, saya tidak dapat menemukan informasi tersebut dalam dokumen panduan." and nothing else.`;
    }

    const contents = [
      ...history.slice(-5).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
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
        await supabase.from('messages').insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: welcomeMessage,
        });
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
    const assistantMessage =
      aiData.candidates?.[0]?.content?.parts?.[0]?.text || welcomeMessage;

    // Save assistant message
    if (currentConversationId) {
      await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantMessage,
        tokens_used: aiData.usageMetadata?.totalTokenCount || 0,
      });
    }

    // Fetch document names for sources
    const documentIds = [...new Set(relevantChunks.map((chunk) => chunk.document_id))];
    const { data: docs } = documentIds.length > 0 
      ? await supabase.from('documents').select('id, filename').in('id', documentIds)
      : { data: null };
    
    const docMap = new Map(docs?.map((d) => [d.id, d.filename]) || []);

    const sources = relevantChunks.map((chunk) => ({
      filename: docMap.get(chunk.document_id) || 'Dokumen',
      content: chunk.content.substring(0, 200) + '...',
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
    console.error('Chat error:', error);

    const body = await request.json().catch(() => null);
    const widgetId = body?.widgetId;

    let welcomeMessage = 'Halo! Ada yang bisa saya bantu?';

    if (widgetId) {
      const supabase = await createClient();
      const { data: widget } = await supabase
        .from('widgets')
        .select('welcome_message')
        .eq('id', widgetId)
        .single();

      if (widget?.welcome_message) {
        welcomeMessage = widget.welcome_message;
      }
    }

    return NextResponse.json({
      response: welcomeMessage,
      sources: [],
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
