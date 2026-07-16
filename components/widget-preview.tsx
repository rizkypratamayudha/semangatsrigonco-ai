'use client'

import { useState, useRef, useEffect } from 'react'

interface Widget {
  id: string
  name: string
  welcome_message: string | null
  prompt: string | null
  primary_color: string | null
  created_at: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ filename: string; content: string; similarity: number }>
}

interface WidgetPreviewProps {
  widget: Widget
  onClose: () => void
}

function sanitizeMermaid(chart: string): string {
  // Split inline statements separated by semicolons into separate lines
  const preCleaned = chart.replace(/;\s*(?=\b\w+)/g, ';\n');

  return preCleaned
    .split('\n')
    .map((line) => {
      // Split the line by arrows (preserving them)
      const parts = line.split(/(\s*-->\s*)/);
      
      const cleanParts = parts.map((part) => {
        // If it's an arrow separator, don't modify it
        if (/^\s*-->\s*$/.test(part)) return part;
        
        let trimmed = part.trim();
        let suffix = '';
        
        // Remove trailing semicolon if any
        if (trimmed.endsWith(';')) {
          trimmed = trimmed.slice(0, -1).trim();
          suffix = ';';
        }
        
        // Check for node shapes and wrap inner text in quotes if not already quoted
        
        // 1. Bracket shape: nodeId[label]
        const bracketMatch = trimmed.match(/^(\b\w+)\s*\[([^"]+)\]$/);
        if (bracketMatch) {
          return `${part.match(/^\s*/)![0]}${bracketMatch[1]}["${bracketMatch[2]}"]${suffix}${part.match(/\s*$/)![0]}`;
        }
        
        // 2. Curly shape: nodeId{label}
        const curlyMatch = trimmed.match(/^(\b\w+)\s*\{([^"]+)\}$/);
        if (curlyMatch) {
          return `${part.match(/^\s*/)![0]}${curlyMatch[1]}{"${curlyMatch[2]}"}${suffix}${part.match(/\s*$/)![0]}`;
        }
        
        // 3. Rounded shape: nodeId(label)
        const roundMatch = trimmed.match(/^(\b\w+)\s*\(([^"]+)\)$/);
        if (roundMatch) {
          return `${part.match(/^\s*/)![0]}${roundMatch[1]}("${roundMatch[2]}")${suffix}${part.match(/\s*$/)![0]}`;
        }
        
        return part;
      });
      
      return cleanParts.join('');
    })
    .join('\n');
}

function Mermaid({ chart }: { chart: string }) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    // Generate valid HTML ID starting with a letter
    const id = `mermaidchart-${Math.floor(Math.random() * 1000000)}`
    
    async function renderChart() {
      try {
        setError(false)
        const cleanChart = sanitizeMermaid(
          chart.replace(/\\n/g, '\n').trim()
        )
        
        const { default: mermaid } = await import('mermaid')
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        })
        
        const { svg: renderedSvg } = await mermaid.render(id, cleanChart)
        setSvg(renderedSvg)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(true)
      }
    }

    renderChart()
  }, [chart])

  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(chart)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!elementRef.current) return
    const svgEl = elementRef.current.querySelector('svg')
    if (!svgEl) return

    try {
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svgEl)
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `diagram-${Date.now()}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
      
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2000)
    } catch (err) {
      console.error('Failed to download SVG:', err)
    }
  }

  if (error) {
    return (
      <div className="relative group w-full my-2">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur hover:bg-white text-gray-500 hover:text-green-600 p-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer transition-all hover:scale-105"
          title="Salin Kode Diagram"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex flex-col gap-2">
          <p className="text-xs font-semibold flex items-center gap-1">
            ⚠️ Gagal menggambar diagram (Ada kesalahan sintaks)
          </p>
          <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre opacity-80 mt-1 max-h-[150px]">
            {chart}
          </pre>
        </div>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground animate-pulse">
        Rendering diagram...
      </div>
    )
  }

  return (
    <div className="relative group w-full my-2">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="bg-white/90 backdrop-blur hover:bg-white text-gray-500 hover:text-green-600 p-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer transition-all hover:scale-105"
          title="Unduh Gambar Diagram (SVG)"
        >
          {downloaded ? (
            <svg className="w-4 h-4 text-green-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
        {/* Copy Code Button */}
        <button
          onClick={handleCopy}
          className="bg-white/90 backdrop-blur hover:bg-white text-gray-500 hover:text-green-600 p-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer transition-all hover:scale-105"
          title="Salin Kode Diagram"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
      </div>
      <div 
        ref={elementRef} 
        className="mermaid-svg-container w-full overflow-x-auto py-3 px-2 bg-white rounded-2xl border border-gray-100 flex justify-center shadow-inner"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </div>
  )
}

function formatMessageContent(text: string) {
  if (!text) return '';
  
  const cleanText = text.trim();
  const isRawMermaid = /^(graph\s+(TD|TB|BT|RL|LR)|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|journey|mindmap|timeline|pie|requirementDiagram)\b/i.test(cleanText);
  
  if (isRawMermaid) {
    return <Mermaid chart={cleanText} />;
  }
  
  // Auto-close unclosed mermaid code blocks (if AI response was truncated)
  let processedText = text;
  const TICK3 = '```';
  const firstMermaidIdx = processedText.indexOf('```mermaid');
  if (firstMermaidIdx !== -1) {
    const afterMermaid = processedText.slice(firstMermaidIdx + 10);
    if (!afterMermaid.includes(TICK3)) {
      processedText += TICK3;
    }
  }

  // First, split by mermaid code blocks
  const sections = processedText.split(/(```mermaid[\s\S]*?```)/g);
  
  return sections.map((section, secIndex) => {
    if (section.startsWith('```mermaid') && section.endsWith('```')) {
      const chartCode = section
        .replace(/^```mermaid\s*/, '')
        .replace(/```$/, '')
        .trim();
      return <Mermaid key={`mermaid-${secIndex}`} chart={chartCode} />;
    }
    
    // For normal text sections, parse bold, italic, code, and newlines
    const parts = section.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\n)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${secIndex}-${index}`} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={`${secIndex}-${index}`} className="italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={`${secIndex}-${index}`} className="px-1.5 py-0.5 bg-black/5 text-red-600 rounded font-mono text-xs">{part.slice(1, -1)}</code>;
      }
      if (part === '\n') {
        return <br key={`${secIndex}-${index}`} />;
      }
      return part;
    });
  });
}

export default function WidgetPreview({ widget, onClose }: WidgetPreviewProps) {
  const primaryColor = widget.primary_color || '#25D366'
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: widget.welcome_message || 'Halo! Ada yang bisa dibantu? 👋',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isChatOpen])

  async function handleSend() {
    if (!inputValue.trim() || loading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          widgetId: widget.id,
          conversationId,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.conversationId) {
          setConversationId(data.conversationId)
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.response,
            sources: data.sources,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Maaf, terjadi kesalahan koneksi. Silakan coba lagi.',
          },
        ])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Gagal mengirim pesan. Pastikan server dev berjalan.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {/* Chat Window */}
      {isChatOpen && (
        <div className="bg-white rounded-3xl w-[380px] h-[550px] overflow-hidden shadow-2xl flex flex-col border border-gray-100 pointer-events-auto transition-all duration-300 transform scale-100 opacity-100 origin-bottom-right">
          {/* Header */}
          <div className="p-4 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: primaryColor }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{widget.name}</h3>
                <p className="text-[11px] text-white/80">Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
              title="Minimize Chat"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => {
              const isBot = msg.role === 'assistant'
              return (
                <div key={index} className={`flex gap-2.5 ${!isBot ? 'justify-end' : ''}`}>
                  {isBot && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm max-w-[80%] ${
                      isBot
                        ? 'bg-white text-gray-800 rounded-tl-none'
                        : 'text-white rounded-tr-none'
                    }`}
                    style={!isBot ? { backgroundColor: primaryColor } : undefined}
                  >
                    <div className="text-sm leading-relaxed">{formatMessageContent(msg.content)}</div>
                    
                    {isBot && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Rujukan Dokumen:</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Array.from(new Set(msg.sources.map((src: any) => src.filename || 'Dokumen'))).map((filename, i) => (
                            <span 
                              key={i} 
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100/50 truncate max-w-full"
                              title={`Dirujuk dari dokumen ${filename}`}
                            >
                              📄 {filename}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {!isBot && (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
            
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse" style={{ backgroundColor: primaryColor }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-4 bg-white border-t border-gray-100 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ketik pesan..."
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
                disabled={loading || !inputValue.trim()}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-2">Powered by ChatToko</p>
          </form>
        </div>
      )}

      {/* Floating Toggle Button & Exit Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 text-white px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-xl transition-all flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Tutup Preview
        </button>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
          style={{ backgroundColor: primaryColor }}
          title={isChatOpen ? "Minimize Chat" : "Open Chat"}
        >
          {isChatOpen ? (
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
