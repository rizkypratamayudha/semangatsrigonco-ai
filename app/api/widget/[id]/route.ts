import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const widget = await prisma.widget.findUnique({
    where: { id },
  });
  // tamabahan kemanan chatbot embed  dengan token

  if (!widget) {
    return new NextResponse('Widget not found', { status: 404 });
  }

  // --- Security Checks ---
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  
  // Extract domain from referer or origin
  let requestDomain = origin;
  if (!requestDomain && referer) {
    try {
      requestDomain = new URL(referer).origin;
    } catch (e) {
      // Invalid referer URL
    }
  }

  // 1. Domain Whitelisting
  if (widget.allowedDomains && widget.allowedDomains.length > 0) {
    if (!requestDomain) {
      return new NextResponse('Missing Origin or Referer header for domain validation.', { status: 403 });
    }
    
    
    // Clean trailing slashes for comparison
    const cleanRequestDomain = requestDomain.replace(/\/$/, '');
    
    const isAllowed = widget.allowedDomains.some(domain => {
      const cleanDomain = domain.replace(/\/$/, '');
      return cleanRequestDomain === cleanDomain || cleanRequestDomain.endsWith(cleanDomain);
    });

    if (!isAllowed) {
      return new NextResponse(`Domain ${requestDomain} is not authorized to use this widget.`, { status: 403 });
    }
  }

  // 2. Token Validation
  const urlToken = request.nextUrl.searchParams.get('token');
  if (widget.apiToken && urlToken !== widget.apiToken) {
    return new NextResponse('Invalid or missing API Token.', { status: 403 });
  }
  // --- End Security Checks ---

  const name = widget.name || 'Srigonco AI';
  // Revisi 1: sambutan generik dan terbuka
  const welcome = widget?.welcomeMessage || 'Halo! \u{1F44B} Saya Chatbot Desa Srigonco. Saya siap membantu Anda menjawab berbagai pertanyaan seputar informasi Desa Srigonco. Silakan ajukan pertanyaan Anda.';
  const color = widget?.primaryColor || '#25D366';

  function hexToRgb(hex: string) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '37, 211, 102';
  }
  const primaryRgbStr = hexToRgb(color);

  const script = `
(function() {
  var WIDGET_ID = '${id}';
  var API_URL = '${request.nextUrl.origin}';
  var API_TOKEN = ${JSON.stringify(urlToken || '')};
  var WIDGET_NAME = ${JSON.stringify(name)};
  var WELCOME_MSG = ${JSON.stringify(welcome)};
  var PRIMARY_COLOR = '${color}';
  var LOGO_URL = API_URL + '/logo%20chatbot-bg%20transparan.png';

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  if (!window.srigoncoEchartsLoaded) {
    window.srigoncoEchartsLoaded = true;
    var sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
    document.head.appendChild(sc);
  }

  var host = document.createElement('div');
  host.id = 'chatbot-widget-host';
  host.style.cssText = 'all:initial;position:fixed !important;bottom:24px !important;right:24px !important;z-index:99999 !important;font-family:system-ui,-apple-system,sans-serif;display:block !important;visibility:visible !important;';
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = \`
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :host { all: initial; }

      #overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.35);
        z-index: 99997;
        opacity: 0;
        transition: opacity 0.2s ease-out;
      }
      #overlay.active { display: block; opacity: 1; }

      #bubble {
        width: 60px; height: 60px;
        background: linear-gradient(135deg, #4D0D0D, #09923B);
        border-radius: 50%; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 24px rgba(77,13,13,0.3);
        transition: all 0.3s ease;
        z-index: 99999;
        overflow: hidden; padding: 0;
      }
      #bubble:hover { transform: scale(1.05); box-shadow: 0 12px 32px rgba(77,13,13,0.4); }
      #bubble img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; border-radius: 50% !important; }

      #window {
        display: none; position: fixed; bottom: 100px; right: 24px;
        width: 380px; max-width: calc(100vw - 24px); height: 580px; max-height: 85vh;
        background: white; border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        overflow: hidden; flex-direction: column;
        border: none;
        z-index: 99998;
        will-change: transform, opacity;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      #window.expanded {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        bottom: auto !important;
        right: auto !important;
        transform: translate(-50%, -50%) !important;
        width: 92vw !important;
        max-width: 950px !important;
        height: 85vh !important;
        border-radius: 20px !important;
        z-index: 99998 !important;
      }

      .hdr {
        background: linear-gradient(135deg, #4D0D0D, #09923B);
        height: 76px; padding: 0 20px; color: white;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0;
      }
      .hdr-l { display: flex; align-items: center; gap: 12px; }
      .hdr-av {
        width: 40px; height: 40px; background: transparent;
        border-radius: 12px; display: flex; align-items: center; justify-content: center;
        overflow: hidden; padding: 0;
      }
      .hdr-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .hdr-nm { font-weight: 700; font-size: 14px; }
      .hdr-st { font-size: 11px; color: rgba(255,255,255,0.8); }
      .hdr-x {
        width: 32px; height: 32px; background: rgba(255,255,255,0.2);
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        cursor: pointer; border: none; transition: background 0.2s; color: white;
      }
      .hdr-x:hover { background: rgba(255,255,255,0.35); }

      .msgs {
        flex: 1; overflow-y: auto; padding: 16px; background: #FAFAFA;
        display: flex; flex-direction: column; gap: 12px;
      }

      .m { max-width: 80%; padding: 12px 16px; font-size: 13px; line-height: 1.5; word-wrap: break-word; overflow-wrap: anywhere; }
      .mu { background: linear-gradient(135deg, #09923B, #16B34A); color: white; align-self: flex-end; border-radius: 18px; border-bottom-right-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
      .mb { background: linear-gradient(135deg, #FFFFFF, #F7F2F2); color: #333; align-self: flex-start; border-radius: 18px; border-bottom-left-radius: 4px; border: 1px solid #E8E8E8; box-shadow: 0 1px 3px rgba(0,0,0,0.04); word-wrap: break-word; overflow-wrap: anywhere; }

      .mbw { display: flex; gap: 8px; align-self: flex-start; }
      .mbi {
        width: 32px; height: 32px; border-radius: 50%;
        background: transparent;
        display: flex; align-items: center;
        justify-content: center; flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        overflow: hidden; padding: 0;
      }
      .mbi img { width: 100%; height: 100%; object-fit: cover; display: block; }

      .contact-card { margin-top: 10px; padding: 14px; border: 1px solid #DCEFE3; border-radius: 12px; background: #F7FCF8; font-size: 12px; }
      .contact-title { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #DCEFE3; color: #14532D; }
      .contact-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #09923B; color: white; font-weight: 700; }
      .contact-subtitle { display: block; margin-top: 2px; color: #4B6B57; font-size: 10px; font-weight: 400; }
      .contact-row { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 8px; margin-top: 9px; line-height: 1.45; }
      .contact-label { color: #4B6B57; font-weight: 700; }
      .contact-value { color: #374151; overflow-wrap: anywhere; }
      .contact-value a { color: #087A32; text-decoration: underline; text-decoration-color: #A7DDB8; text-underline-offset: 2px; }

      .typ { display: flex; gap: 4px; padding: 12px 16px; }
      .typ span {
        width: 6px; height: 6px; background: #999; border-radius: 50%;
        animation: bounce 1.4s infinite;
      }
      .typ span:nth-child(2) { animation-delay: 0.2s; }
      .typ span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-6px); }
      }

      .inp { padding: 16px 16px; border-top: 1px solid #f0f0f0; background: white; flex-shrink: 0; }
      .inp-wrap {
        display: flex; align-items: center; gap: 12px;
        background: white; border: 1px solid #E5E7EB;
        border-radius: 20px; padding: 6px 6px 6px 16px;
        transition: all 0.25s;
      }
      .inp-wrap:focus-within {
        border-color: #09923B;
        box-shadow: 0 0 0 3px rgba(9,146,59,0.1);
      }
      .inp input {
        flex: 1; border: none; outline: none;
        font-size: 13px; font-family: system-ui, -apple-system, sans-serif;
        background: transparent;
      }
      .inp input::placeholder { color: #9CA3AF; }
      .inp button {
        width: 36px; height: 36px;
        background: linear-gradient(135deg, #09923B, #16B34A);
        border: none; border-radius: 50%; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.25s;
        box-shadow: 0 2px 8px rgba(9,146,59,0.3);
        flex-shrink: 0;
      }
      .inp button:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(9,146,59,0.4); }
      .inp button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

      .ftr { text-align: center; padding: 0; font-size: 10px; color: #999; flex-shrink: 0; height: 0; }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>

    <div id="overlay"></div>
    <div id="bubble">
      <img src="\${LOGO_URL}" alt="\${escHtml(WIDGET_NAME)}" />
    </div>
    <div id="window">
      <div class="hdr">
        <div class="hdr-l">
          <div class="hdr-av">
            <img src="\${LOGO_URL}" alt="\${escHtml(WIDGET_NAME)}" />
          </div>
          <div>
            <div class="hdr-nm">\${escHtml(WIDGET_NAME)}</div>
            <div class="hdr-st" style="display:flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;background:#22C55E;border-radius:50%;display:inline-block;animation:pulse 2s infinite;"></span>Online</div>
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="hdr-x" id="expand-btn" title="Tampilan Semi-Fullscreen">
            <svg id="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
          </button>
          <button class="hdr-x" id="close" title="Minimize Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 9l-7 7-7-7"></path></svg>
          </button>
        </div>
      </div>
      <div class="msgs" id="msgs"></div>
      <div class="inp">
        <div class="inp-wrap">
          <input id="inp" type="text" placeholder="Ketik pesan..." />
          <button id="send" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
      </div>
      <div class="ftr"></div>
    </div>
  \`;

  var bubble = shadow.getElementById('bubble');
  var win = shadow.getElementById('window');
  var close = shadow.getElementById('close');
  var expandBtn = shadow.getElementById('expand-btn');
  var overlay = shadow.getElementById('overlay');
  var inp = shadow.getElementById('inp');
  var send = shadow.getElementById('send');
  var msgs = shadow.getElementById('msgs');
  var isExpanded = false;
  var chartInstances = [];

  function resizeAllCharts() {
    setTimeout(function() {
      chartInstances.forEach(function(c) {
        if (c && typeof c.resize === 'function') {
          c.resize();
        }
      });
    }, 220);
  }

  if (expandBtn) {
    expandBtn.onclick = function() {
      isExpanded = !isExpanded;
      if (isExpanded) {
        win.classList.add('expanded');
        overlay.classList.add('active');
      } else {
        win.classList.remove('expanded');
        overlay.classList.remove('active');
      }
      resizeAllCharts();
    };
  }

  if (overlay) {
    overlay.onclick = function() {
      isExpanded = false;
      win.classList.remove('expanded');
      overlay.classList.remove('active');
      resizeAllCharts();
    };
  }

  window.addEventListener('resize', resizeAllCharts);

  function parseFormatting(text, parentEl) {
    var NL = String.fromCharCode(10);
    var TICK1 = String.fromCharCode(96);
    var BACKSLASH = String.fromCharCode(92);
    var ESC_STAR = BACKSLASH + '*';
    var ESC_DOUBLE_STAR = ESC_STAR + ESC_STAR;
    var re = new RegExp(
      '(' + NL + '|' + ESC_DOUBLE_STAR + '.*?' + ESC_DOUBLE_STAR + '|' + ESC_STAR + '.*?' + ESC_STAR + '|' + TICK1 + '.*?' + TICK1 + ')',
      'g'
    );
    var parts = text.split(re);
    parts.forEach(function(part) {
      if (!part) return;
      var node;
      if (part.length === 1 && part.charCodeAt(0) === 10) {
        node = document.createElement('br');
      } else if (part.length > 4 && part.slice(0,2) === '**' && part.slice(-2) === '**') {
        node = document.createElement('strong');
        node.style.fontWeight = '700';
        node.textContent = part.slice(2, -2);
      } else if (part.length > 2 && part[0] === '*' && part[1] !== '*' && part.slice(-1) === '*') {
        node = document.createElement('em');
        node.style.fontStyle = 'italic';
        node.textContent = part.slice(1, -1);
      } else if (part.length > 2 && part[0] === TICK1 && part.slice(-1) === TICK1) {
        node = document.createElement('code');
        node.style.cssText = 'background:rgba(0,0,0,0.06);color:#e53e3e;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.8em;';
        node.textContent = part.slice(1, -1);
      } else {
        node = document.createTextNode(part);
      }
      parentEl.appendChild(node);
    });
  }

  function renderContactCard(text, parentEl) {
    var contactStart = text.search(/Data Desa Srigonco\\s+Nama kepala desa:/i);
    if (contactStart === -1) return false;
    var intro = text.slice(0, contactStart).trim();
    var contactText = text.slice(contactStart);
    if (intro) parseFormatting(intro, parentEl);
    var card = document.createElement('div');
    card.className = 'contact-card';
    var title = document.createElement('div');
    title.className = 'contact-title';
    title.innerHTML = '<span class="contact-icon">i</span><span><strong>Data Desa Srigonco</strong><small class="contact-subtitle">Kontak resmi dan jam layanan</small></span>';
    card.appendChild(title);
    var fields = [
      ['Kepala Desa', contactText.match(/Nama kepala desa:\\s*(.*?)\\s*Alamat kantor desa:/i)],
      ['Alamat Kantor', contactText.match(/Alamat kantor desa:\\s*(.*?)\\s*Contact center:/i)],
      ['Contact Center', contactText.match(/Contact center:\\s*(\\+?[\\d\\s-]+)/i)],
      ['Jam Layanan', contactText.match(/Jam layanan:\\s*(.*?)\\s*Email:/i)],
      ['Email', contactText.match(/Email:\\s*([^\\s]+@[^\\s]+)\\s*Instagram:/i)],
      ['Instagram', contactText.match(/Instagram:\\s*(https?:\\/\\/\\S+)/i)],
      ['TikTok', contactText.match(/Tiktok:\\s*(https?:\\/\\/\\S+)/i)],
      ['YouTube', contactText.match(/Youtube:\\s*(https?:\\/\\/\\S+)/i)]
    ];
    fields.forEach(function(field) {
      if (!field[1] || !field[1][1]) return;
      var row = document.createElement('div');
      row.className = 'contact-row';
      var label = document.createElement('span');
      label.className = 'contact-label';
      label.textContent = field[0];
      var value = document.createElement('span');
      value.className = 'contact-value';
      var raw = field[1][1].trim();
      if (/^https?:\\/\\//i.test(raw)) {
        var link = document.createElement('a');
        link.href = raw;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = raw;
        value.appendChild(link);
      } else if (field[0] === 'Email') {
        var email = document.createElement('a');
        email.href = 'mailto:' + raw;
        email.textContent = raw;
        value.appendChild(email);
      } else if (field[0] === 'Contact Center') {
        var phone = document.createElement('a');
        phone.href = 'tel:' + raw.replace(/[^\\d+]/g, '');
        phone.textContent = raw;
        value.appendChild(phone);
      } else {
        value.textContent = raw;
      }
      row.appendChild(label);
      row.appendChild(value);
      card.appendChild(row);
    });
    parentEl.appendChild(card);
    return true;
  }

  function renderChartEl(jsonStr, parentEl) {
    try {
      var config = JSON.parse(jsonStr.trim());
      var chartDiv = document.createElement('div');
      chartDiv.style.cssText = 'width:100%;height:260px;margin:10px 0;background:#fff;border-radius:12px;padding:8px;border:1px solid #e5e7eb;';
      parentEl.appendChild(chartDiv);

      var isPie = config.type === 'pie';
      var option = {
        title: {
          text: config.title || '',
          left: 'center',
          textStyle: { fontSize: 12, fontWeight: 'bold', color: '#1f2937' }
        },
        tooltip: { trigger: isPie ? 'item' : 'axis' },
        grid: isPie ? undefined : { left: '3%', right: '4%', bottom: '18%', containLabel: true },
        xAxis: isPie ? undefined : {
          type: 'category',
          data: config.categories || [],
          axisLabel: { rotate: 30, interval: 0, fontSize: 10 }
        },
        yAxis: isPie ? undefined : { type: 'value' },
        series: isPie ? [{
          name: config.title || 'Data',
          type: 'pie',
          radius: '55%',
          data: config.series || []
        }] : (config.series || []).map(function(s) {
          return {
            name: s.name || 'Data',
            type: config.type === 'line' ? 'line' : 'bar',
            data: s.data || [],
            itemStyle: { color: PRIMARY_COLOR, borderRadius: [4, 4, 0, 0] },
            smooth: true
          };
        })
      };

      function tryInit() {
        if (window.echarts) {
          var myChart = window.echarts.init(chartDiv);
          myChart.setOption(option);
          chartInstances.push(myChart);
        } else {
          setTimeout(tryInit, 150);
        }
      }
      tryInit();
    } catch (e) {
      console.error('Failed to render chart:', e);
      var errBlock = document.createElement('pre');
      errBlock.style.cssText = 'background:#f4f4f4;padding:8px;border-radius:6px;font-size:10px;overflow-x:auto;';
      errBlock.textContent = jsonStr;
      parentEl.appendChild(errBlock);
    }
  }

  function extractNodeLabel(part) {
    var t = part.trim();
    var open = t.indexOf('[');
    if (open === -1) open = t.indexOf('(');
    if (open === -1) open = t.indexOf('{');
    if (open === -1) {
      return /^[A-Za-z0-9_]{1,3}$/.test(t) ? '' : t;
    }
    var openChar = t.charAt(open);
    var closeChar = openChar === '[' ? ']' : (openChar === '(' ? ')' : '}');
    var close = t.indexOf(closeChar, open + 1);
    if (close === -1) return t.slice(open + 1).replace(/"/g, '').trim();
    var label = t.slice(open + 1, close).replace(/"/g, '').trim();
    return label || t;
  }

  function renderMermaidFlow(code, parentEl) {
    var NL = String.fromCharCode(10);
    var ARROW = String.fromCharCode(8594); // →
    var lines = code.split(NL);
    var steps = [];
    lines.forEach(function(line) {
      var l = line.trim();
      if (!l) return;
      if (/^(graph|flowchart|sequenceDiagram|classDiagram|erDiagram|gantt|pie|%%|title|accTitle|accDescr)/i.test(l)) return;
      var hasLabel = l.indexOf('[') !== -1 || l.indexOf('(') !== -1 || l.indexOf('{') !== -1;
      if (!hasLabel) return;
      // Buang label edge: "D -- Ya --> E" menjadi "D --> E"
      var clean = l;
      var guard = 0;
      while (guard < 10) {
        guard++;
        var dashIdx = clean.indexOf('--');
        if (dashIdx === -1) break;
        var arrowIdx = clean.indexOf('-->', dashIdx + 2);
        if (arrowIdx === -1 || arrowIdx === dashIdx + 2) break;
        clean = clean.slice(0, dashIdx + 2) + clean.slice(arrowIdx + 2);
      }
      var parts = clean.split('-->');
      var nodes = [];
      parts.forEach(function(p) {
        nodes.push(extractNodeLabel(p));
      });
      var filtered = nodes.filter(function(n) { return n !== ''; });
      if (filtered.length > 0) steps.push(filtered.join(' ' + ARROW + ' '));
    });

    var list = document.createElement('div');
    list.style.cssText = 'background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:10px 12px;margin:8px 0;';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:11px;font-weight:700;color:#92400E;margin-bottom:6px;';
    title.textContent = '\u{1F4CB} Alur proses:';
    list.appendChild(title);

    if (steps.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-size:11px;color:#92400E;';
      empty.textContent = 'Diagram tidak dapat ditampilkan.';
      list.appendChild(empty);
    } else {
      steps.slice(0, 12).forEach(function(step) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;font-size:11.5px;line-height:1.5;color:#78350F;margin-bottom:4px;word-break:break-word;';
        var dot = document.createElement('span');
        dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:#F59E0B;margin-top:5px;flex-shrink:0;';
        var txt = document.createElement('span');
        txt.textContent = step;
        row.appendChild(dot);
        row.appendChild(txt);
        list.appendChild(row);
      });
    }
    parentEl.appendChild(list);
  }

  function setContent(el, text) {
    var TICK3 = String.fromCharCode(96,96,96);
    var mermaidTag = TICK3 + 'mermaid';
    var chartTag = TICK3 + 'chart';
    
    var processedText = text;
    var firstIdx = processedText.indexOf(TICK3);
    if (firstIdx !== -1) {
      var afterIdx = processedText.slice(firstIdx + 3);
      if (afterIdx.indexOf(TICK3) === -1) {
        processedText += TICK3;
      }
    }

    var re = new RegExp('(' + TICK3 + '(?:mermaid|chart)[^]*?' + TICK3 + ')', 'g');
    var parts = processedText.split(re);
    parts.forEach(function(part) {
      if (part.startsWith(chartTag) && part.endsWith(TICK3)) {
        var jsonCode = part.slice(chartTag.length).replace(new RegExp(TICK3 + '$'), '').trim();
        renderChartEl(jsonCode, el);
      } else if (part.startsWith(mermaidTag) && part.endsWith(TICK3)) {
        var code = part.slice(mermaidTag.length).replace(new RegExp(TICK3 + '$'), '').trim();
        renderMermaidFlow(code, el);
      } else if (part) {
        if (!renderContactCard(part, el)) parseFormatting(part, el);
      }
    });
  }

  function addMsg(text, isUser) {
    if (isUser) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;justify-content:flex-end;';
      var m = document.createElement('div');
      m.className = 'm mu';
      m.textContent = text;
      wrap.appendChild(m);
      msgs.appendChild(wrap);
    } else {
      var wrap = document.createElement('div');
      wrap.className = 'mbw';
      var ic = document.createElement('div');
      ic.className = 'mbi';
      ic.innerHTML = '<img src="' + LOGO_URL + '" alt="Bot" />';
      var m = document.createElement('div');
      m.className = 'm mb';
      wrap.appendChild(ic);
      wrap.appendChild(m);
      msgs.appendChild(wrap);
      setContent(m, text);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyp() {
    var wrap = document.createElement('div');
    wrap.className = 'mbw';
    wrap.id = 'typ';
    var ic = document.createElement('div');
    ic.className = 'mbi';
    ic.innerHTML = '<img src="' + LOGO_URL + '" alt="Bot" />';
    var d = document.createElement('div');
    d.className = 'm mb typ';
    d.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(ic);
    wrap.appendChild(d);
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyp() {
    var t = shadow.getElementById('typ');
    if (t) t.remove();
  }

  addMsg(WELCOME_MSG, false);

  bubble.onclick = function() {
    bubble.style.display = 'none';
    win.style.display = 'flex';
    inp.focus();
  };

  close.onclick = function() {
    win.style.display = 'none';
    bubble.style.display = 'flex';
    if (isExpanded) {
      isExpanded = false;
      win.classList.remove('expanded');
      if (overlay) overlay.classList.remove('active');
    }
  };

  inp.oninput = function() {
    send.disabled = !inp.value.trim();
  };

  var conversationId = undefined;
  var history = [];

  async function doSend() {
    var text = inp.value.trim();
    if (!text) return;

    inp.value = '';
    send.disabled = true;
    addMsg(text, true);
    showTyp();

    // Track user message
    history.push({ role: 'user', content: text });

    try {
      // Keamanan: sertakan API token pada setiap request chat
      var chatHeaders = { 'Content-Type': 'application/json' };
      if (API_TOKEN) chatHeaders['Authorization'] = 'Bearer ' + API_TOKEN;
      var res = await fetch(API_URL + '/api/chat', {
        method: 'POST',
        headers: chatHeaders,
        body: JSON.stringify({ 
          widgetId: WIDGET_ID, 
          message: text,
          conversationId: conversationId,
          history: history.slice(0, -1)
        })
      });
      hideTyp();
      var data = await res.json();
      
      if (data.conversationId) {
        conversationId = data.conversationId;
      }
      
      var reply = data.response || data.reply || 'Maaf, terjadi kesalahan.';
      
      // Track assistant response
      history.push({ role: 'assistant', content: reply });
      
      addMsg(reply, false);
    } catch (e) {
      hideTyp();
      addMsg('Maaf, tidak dapat terhubung ke server.', false);
    }
  }

  send.onclick = doSend;
  inp.onkeypress = function(e) { if (e.key === 'Enter') doSend(); };
})();
`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
