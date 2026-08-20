'use client'

import { useState, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'

interface Widget {
  id: string
  name: string
  welcome_message: string | null
  prompt: string | null
  primary_color: string | null
  created_at: string
  suggested_questions?: string[]
  api_token?: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface WidgetPreviewProps {
  widget: Widget
  onClose: () => void
}

function sanitizeMermaid(chart: string): string {
  const trimmed = chart.replace(/\\n/g, '\n').trim()
  const lower = trimmed.toLowerCase()

  // If chart is non-flowchart (pie, xychart, gantt, sequence, mindmap, timeline, class, er) don't alter it
  if (
    lower.startsWith('pie') ||
    lower.startsWith('xychart') ||
    lower.startsWith('gantt') ||
    lower.startsWith('sequence') ||
    lower.startsWith('mindmap') ||
    lower.startsWith('timeline') ||
    lower.startsWith('class') ||
    lower.startsWith('er')
  ) {
    return trimmed
  }

  // Split inline statements separated by semicolons into separate lines
  const preCleaned = trimmed.replace(/;\s*(?=\b\w+)/g, ';\n')

  return preCleaned
    .split('\n')
    .map((line) => {
      // Don't sanitize lines starting with title or comments
      if (/^\s*(title|accTitle|accDescr|%%)\b/i.test(line)) {
        return line
      }

      // Split the line by arrows (preserving them)
      const parts = line.split(/(\s*-->\s*)/)

      const cleanParts = parts.map((part) => {
        // If it's an arrow separator, don't modify it
        if (/^\s*-->\s*$/.test(part)) return part

        let pTrimmed = part.trim()
        let suffix = ''

        // Remove trailing semicolon if any
        if (pTrimmed.endsWith(';')) {
          pTrimmed = pTrimmed.slice(0, -1).trim()
          suffix = ';'
        }

        // 1. Bracket shape: nodeId[label]
        const bracketMatch = pTrimmed.match(/^(\b\w+)\s*\[([^"]+)\]$/)
        if (bracketMatch) {
          return `${part.match(/^\s*/)![0]}${bracketMatch[1]}["${bracketMatch[2]}"]${suffix}${part.match(/\s*$/)![0]}`
        }

        // 2. Curly shape: nodeId{label}
        const curlyMatch = pTrimmed.match(/^(\b\w+)\s*\{([^"]+)\}$/)
        if (curlyMatch) {
          return `${part.match(/^\s*/)![0]}${curlyMatch[1]}{"${curlyMatch[2]}"}${suffix}${part.match(/\s*$/)![0]}`
        }

        // 3. Rounded shape: nodeId(label)
        const roundMatch = pTrimmed.match(/^(\b\w+)\s*\(([^"]+)\)$/)
        if (roundMatch) {
          return `${part.match(/^\s*/)![0]}${roundMatch[1]}("${roundMatch[2]}")${suffix}${part.match(/\s*$/)![0]}`
        }

        return part
      })

      return cleanParts.join('')
    })
    .join('\n')
}

function mermaidToPlainText(chart: string): string[] {
  try {
    const lines = chart
      .replace(/\\n/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|gantt|pie|%%|title|accTitle|accDescr)/i.test(l));

    const steps: string[] = [];
    for (const line of lines) {
      // Hanya ambil baris yang punya label node (bukan sekadar id node kosong)
      const hasLabel = /\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}/.test(line);
      // Buang label edge seperti "D -- Ya --> E" menjadi "D --> E"
      const noEdgeLabels = line.replace(/\s*--\s+[A-Za-z0-9\s/]+\s+-->\s*/g, ' --> ');
      const clean = noEdgeLabels.replace(/[;"]/g, '');
      const parts = clean.split(/\s*-{2,}>\s*|\s*==>\s*/);
      const nodes = parts
        .map((p) => {
          const m = p.match(/\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}/);
          return m ? (m[1] || m[2] || m[3]).trim() : p.trim();
        })
        .filter((n) => n !== '' && !/^[A-Za-z0-9_]{1,3}$/.test(n));
      if (hasLabel && nodes.length > 0) {
        steps.push(nodes.join(' \u2192 '));
      }
    }
    return steps.slice(0, 12);
  } catch {
    return [];
  }
}

function Mermaid({ chart }: { chart: string }) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    // Generate valid HTML ID starting with a letter
    const id = `mermaidchart-${Math.floor(Math.random() * 1000000)}`
    let cancelled = false

    async function renderChart() {
      try {
        setError(false)
        const cleanChart = sanitizeMermaid(chart)

        const { default: mermaid } = await import('mermaid')

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        })

        try {
          const { svg: renderedSvg } = await mermaid.render(id, cleanChart)
          if (!cancelled) setSvg(renderedSvg)
        } catch {
          // Fallback ke kode asli jika sanitasi justru menyebabkan error sintaks
          try {
            const rawId = `${id}-raw`
            const { svg: rawSvg } = await mermaid.render(rawId, chart.trim())
            if (!cancelled) setSvg(rawSvg)
          } catch {
            // Kode asli juga tidak valid - tampilkan fallback teks, bukan crash
            if (!cancelled) setError(true)
          }
        }
      } catch {
        // Jangan lempar error ke overlay Next.js; cukup tampilkan fallback
        if (!cancelled) setError(true)
      }
    }

    renderChart()

    return () => {
      cancelled = true
    }
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
      console.warn('Failed to download SVG:', err instanceof Error ? err.message : err)
    }
  }

  if (error) {
    const plainSteps = mermaidToPlainText(chart)

    return (
      <div className="relative group w-full my-2">
        <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 flex flex-col gap-2">
          {plainSteps.length > 0 ? (
            <>
              <p className="text-xs font-semibold flex items-center gap-1">
                {'\u{1F4CB}'} Alur proses:
              </p>
              <ul className="space-y-1.5 text-xs leading-relaxed">
                {plainSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="wrap-break-word">{step}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs font-medium flex items-center gap-1">
              {'\u{26A0}\u{FE0F}'} Diagram tidak dapat ditampilkan.
            </p>
          )}
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
          className="bg-white/90 backdrop-blur hover:bg-white text-gray-500 hover:text-[#09923B] p-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer transition-all hover:scale-105"
          title="Unduh Gambar Diagram (SVG)"
        >
          {downloaded ? (
            <svg className="w-4 h-4 text-[#09923B] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          className="bg-white/90 backdrop-blur hover:bg-white text-gray-500 hover:text-[#09923B] p-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center cursor-pointer transition-all hover:scale-105"
          title="Salin Kode Diagram"
        >
          {copied ? (
            <svg className="w-4 h-4 text-[#09923B] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

function ChartComponent({ jsonStr }: { jsonStr: string }) {
  try {
    const config = JSON.parse(jsonStr.trim())
    const isPie = config.type === 'pie'

    const option = {
      title: {
        text: config.title || '',
        left: 'center',
        textStyle: { fontSize: 13, fontWeight: 'bold', color: '#1f2937' },
      },
      tooltip: { trigger: isPie ? 'item' : 'axis' },
      grid: isPie ? undefined : { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: isPie
        ? undefined
        : {
            type: 'category',
            data: config.categories || [],
            axisLabel: { rotate: 30, interval: 0, fontSize: 10 },
          },
      yAxis: isPie ? undefined : { type: 'value' },
      series: isPie
        ? [
            {
              name: config.title || 'Data',
              type: 'pie',
              radius: '55%',
              data: config.series || [],
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
            },
          ]
        : (config.series || []).map((s: any) => ({
            name: s.name || 'Data',
            type: config.type === 'line' ? 'line' : 'bar',
            data: s.data || [],
            itemStyle: { color: '#4D0D0D', borderRadius: [4, 4, 0, 0] },
            smooth: true,
          })),
    }

    return (
      <div className="w-full my-3 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <ReactECharts option={option} style={{ height: '260px', width: '100%' }} />
      </div>
    )
  } catch (err) {
    console.warn('Failed to parse chart JSON:', err instanceof Error ? err.message : err)
    return (
      <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">
        Gagal memuat grafik data
      </div>
    )
  }
}

function formatMessageContent(text: string) {
  if (!text) return '';

  const cleanText = text.trim();
  const contactStart = cleanText.search(/Data Desa Srigonco\s+Nama kepala desa:/i);
  if (contactStart !== -1) {
    const intro = cleanText.slice(0, contactStart).trim();
    const contactText = cleanText.slice(contactStart);
    const contact = {
      head: contactText.match(/Nama kepala desa:\s*(.*?)\s*Alamat kantor desa:/i)?.[1] || '',
      address: contactText.match(/Alamat kantor desa:\s*(.*?)\s*Contact center:/i)?.[1] || '',
      phone: contactText.match(/Contact center:\s*(\+?[\d\s-]+)/i)?.[1]?.trim() || '',
      hours: contactText.match(/Jam layanan:\s*(.*?)\s*Email:/i)?.[1] || '',
      email: contactText.match(/Email:\s*([^\s]+@[^\s]+)\s*Instagram:/i)?.[1] || '',
      instagram: contactText.match(/Instagram:\s*(https?:\/\/\S+)/i)?.[1] || '',
      tiktok: contactText.match(/Tiktok:\s*(https?:\/\/\S+)/i)?.[1] || '',
      youtube: contactText.match(/Youtube:\s*(https?:\/\/\S+)/i)?.[1] || '',
    };
    const rows = [
      ['Kepala Desa', contact.head, null],
      ['Alamat Kantor', contact.address, null],
      ['Contact Center', contact.phone, contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : null],
      ['Jam Layanan', contact.hours, null],
      ['Email', contact.email, contact.email ? `mailto:${contact.email}` : null],
      ['Instagram', contact.instagram, contact.instagram],
      ['TikTok', contact.tiktok, contact.tiktok],
      ['YouTube', contact.youtube, contact.youtube],
    ].filter(([, value]) => value);

    return (
      <>
        {intro && <div className="mb-3">{intro}</div>}
        <div className="rounded-xl border border-[#DCEFE3] bg-[#F7FCF8] p-3.5 text-[13px]">
          <div className="mb-3 flex items-center gap-2 border-b border-[#DCEFE3] pb-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#09923B] text-white">i</span>
            <div>
              <p className="font-bold text-[#14532D]">Data Desa Srigonco</p>
              <p className="text-[11px] text-[#4B6B57]">Kontak resmi dan jam layanan</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {rows.map(([label, value, href]) => (
              <div key={label} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
                <span className="font-semibold text-[#4B6B57]">{label}</span>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="wrap-anywhere text-[#087A32] underline decoration-[#A7DDB8] underline-offset-2 hover:text-[#14532D]">{value}</a>
                ) : (
                  <span className="wrap-anywhere text-gray-700">{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }
  const isRawMermaid = /^(graph\s+(TD|TB|BT|RL|LR)|flowchart\s+(TD|TB|BT|RL|LR)|sequenceDiagram|gantt|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|mindmap|timeline|pie|xychart|requirementDiagram)\b/i.test(cleanText);

  if (isRawMermaid) {
    return <Mermaid chart={cleanText} />;
  }

  // Auto-close unclosed mermaid/chart code blocks if response was truncated
  let processedText = text;
  const TICK3 = '```';
  const firstBlockIdx = processedText.search(/```(mermaid|chart)/);
  if (firstBlockIdx !== -1) {
    const afterBlock = processedText.slice(firstBlockIdx + 9);
    if (!afterBlock.includes(TICK3)) {
      processedText += TICK3;
    }
  }
  

  // Split by mermaid or chart code blocks
  const sections = processedText.split(/(```\s*(?:mermaid|chart)[\s\S]*?```)/gi);

  return sections.map((section, secIndex) => {
    if (/^```\s*mermaid/i.test(section) && section.endsWith('```')) {
      const chartCode = section
        .replace(/^```\s*mermaid\s*/i, '')
        .replace(/```$/, '')
        .trim();
      return <Mermaid key={`mermaid-${secIndex}`} chart={chartCode} />;
    }

    if (/^```\s*chart/i.test(section) && section.endsWith('```')) {
      const chartJson = section
        .replace(/^```\s*chart\s*/i, '')
        .replace(/```$/, '')
        .trim();
      return <ChartComponent key={`chart-${secIndex}`} jsonStr={chartJson} />;
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
  
  // Helper to parse hex to RGB for Gen Z neon glow
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '37, 211, 102';
  };
  const primaryRgb = hexToRgb(primaryColor);

  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        widget.welcome_message ||
        'Halo! \u{1F44B} Saya Chatbot Desa Srigonco. Saya siap membantu Anda menjawab berbagai pertanyaan seputar informasi Desa Srigonco. Silakan ajukan pertanyaan Anda.',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isChatOpen, isExpanded])

  async function handleSend(overrideMessage?: string) {
    const userMessage = overrideMessage || inputValue.trim()
    if (!userMessage || loading) return

    if (!overrideMessage) {
      setInputValue('')
    }
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
          apiToken: widget.api_token || undefined,
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
            content: data.response || 'Maaf, tidak ada respon.',
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
    <>
      {/* Semi-fullscreen Backdrop Overlay */}
      {isChatOpen && isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/35 z-40 pointer-events-auto transition-opacity duration-200 ease-out"
        />
      )}

      <div className={isExpanded && isChatOpen ? '' : 'fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none'}>
        {/* Chat Window */}
        {isChatOpen && (
          <div
            className={
              isExpanded
                ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-[20px] w-[92vw] max-w-237.5 h-[85vh] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex flex-col border border-gray-100 pointer-events-auto transition-all duration-300 ease-out will-change-[transform,opacity] animate-in fade-in slide-in-from-bottom-4'
                : 'bg-white rounded-[20px] w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] max-w-105 h-[min(580px,85vh)] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex flex-col border border-gray-100 pointer-events-auto transition-all duration-300 ease-out will-change-[transform,opacity] animate-in fade-in slide-in-from-bottom-4 origin-bottom-right'
            }
          >
            {/* Header with Gradient */}
            <div
              className="px-5 flex items-center justify-between shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4D0D0D, #09923B)',
                height: '76px',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  <img src="/logo%20chatbot-bg%20transparan.png" alt={widget.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{widget.name}</h3>
                  <p className="text-[11px] text-white/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
                    Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Expand / Semi-Fullscreen Toggle Button */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/35 transition-all duration-250 text-white cursor-pointer"
                  title={isExpanded ? 'Kecilkan Chat' : 'Tampilan Semi-Fullscreen (Tengah)'}
                >
                  {isExpanded ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 5l5 5m0 0l-5 0m5 0l0-5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setIsChatOpen(false)
                    setIsExpanded(false)
                  }}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/35 transition-all duration-250 text-white cursor-pointer"
                  title="Minimize Chat"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-[#FAFAFA] p-4 overflow-y-auto space-y-4">
              {messages.map((msg, index) => {
                const isBot = msg.role === 'assistant'
                return (
                  <div key={index} className={`flex gap-2.5 ${!isBot ? 'justify-end' : ''}`}>
                    {isBot && (
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-sm">
                        <img src="/logo%20chatbot-bg%20transparan.png" alt="Bot" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div
                      className={`px-4 py-2.5 max-w-[90%] md:max-w-[80%] ${
                        isBot
                          ? 'rounded-[18px] rounded-tl-none bg-white text-gray-800 border border-[#E8E8E8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                          : 'rounded-[18px] rounded-tr-none text-white shadow-sm'
                      }`}
                      style={
                        !isBot
                          ? { background: 'linear-gradient(135deg, #09923B, #16B34A)' }
                          : { background: 'linear-gradient(135deg, #FFFFFF, #F7F2F2)' }
                      }
                    >
                      <div className="text-sm leading-relaxed wrap-anywhere">{formatMessageContent(msg.content)}</div>
                    </div>
                    {!isBot && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #4D0D0D, #09923B)' }}>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
              
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 animate-pulse shadow-sm">
                    <img src="/logo%20chatbot-bg%20transparan.png" alt="Bot" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-[18px] rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #FFFFFF, #F7F2F2)', border: '1px solid #E8E8E8' }}>
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
              className="p-4 bg-white border-t border-gray-100 shrink-0"
            >
              <div className="flex items-center gap-3 bg-white border border-[#E5E7EB] rounded-[20px] px-4 py-1.5 transition-all duration-250 focus-within:border-[#09923B] focus-within:shadow-[0_0_0_3px_rgba(9,146,59,0.1)]">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 py-2 bg-transparent text-sm outline-none border-none placeholder:text-gray-400"
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-250 disabled:opacity-40 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #09923B, #16B34A)',
                    boxShadow: !loading && inputValue.trim() ? '0 2px 8px rgba(9,146,59,0.3)' : 'none',
                  }}
                  disabled={loading || !inputValue.trim()}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Floating Toggle Button & Exit Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-xl transition-all duration-250 flex items-center gap-1 hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Tutup Preview
          </button>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4D0D0D, #09923B)',
              boxShadow: `0 8px 24px rgba(77,13,13,0.3)`,
            }}
            title={isChatOpen ? 'Minimize Chat' : 'Open Chat'}
          >
            {isChatOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <img
                src="/logo%20chatbot-bg%20transparan.png"
                alt="Srigonco AI"
                className="w-full h-full object-cover"
              />
            )}
          </button>
        </div>
      </div>
    </>
  )
}




