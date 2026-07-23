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

  const name = widget?.name || 'Srigonco AI';
  const welcome = widget?.welcomeMessage || 'Halo! Ada yang bisa dibantu? 👋';
  const color = widget?.primaryColor || '#25D366';
  const suggestedQuestions = widget?.suggestedQuestions || [];

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
  var WIDGET_NAME = ${JSON.stringify(name)};
  var WELCOME_MSG = ${JSON.stringify(welcome)};
  var PRIMARY_COLOR = '${color}';
  var SUGGESTED_QUESTIONS = ${JSON.stringify(suggestedQuestions)};

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
        background: \${PRIMARY_COLOR}; border-radius: 50%; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s;
        z-index: 99999;
      }
      #bubble:hover { transform: scale(1.1); }

      #window {
        display: none; position: fixed; bottom: 100px; right: 24px;
        width: 380px; height: 550px; background: white; border-radius: 24px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        overflow: hidden; flex-direction: column;
        border: 1px solid #f0f0f0;
        z-index: 99998;
        will-change: transform;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
        border-radius: 24px !important;
        z-index: 99998 !important;
      }

      .hdr {
        background: \${PRIMARY_COLOR}; padding: 16px; color: white;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0;
      }
      .hdr-l { display: flex; align-items: center; gap: 12px; }
      .hdr-av {
        width: 40px; height: 40px; background: rgba(255,255,255,0.2);
        border-radius: 12px; display: flex; align-items: center; justify-content: center;
      }
      .hdr-nm { font-weight: 600; font-size: 14px; }
      .hdr-st { font-size: 11px; color: rgba(255,255,255,0.8); }
      .hdr-x {
        width: 32px; height: 32px; background: rgba(255,255,255,0.2);
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        cursor: pointer; border: none; transition: background 0.2s; color: white;
      }
      .hdr-x:hover { background: rgba(255,255,255,0.3); }

      .msgs {
        flex: 1; overflow-y: auto; padding: 16px; background: #f9fafb;
        display: flex; flex-direction: column; gap: 12px;
      }

      .m { max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 13px; line-height: 1.5; word-wrap: break-word; }
      .mu { background: \${PRIMARY_COLOR}; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
      .mb { background: white; color: #333; align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

      .mbw { display: flex; gap: 8px; align-self: flex-start; }
      .mbi {
        width: 32px; height: 32px; border-radius: 50%;
        background: \${PRIMARY_COLOR}; display: flex; align-items: center;
        justify-content: center; flex-shrink: 0;
      }

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

      .inp { padding: 12px 16px; border-top: 1px solid #f0f0f0; background: white; flex-shrink: 0; }
      .inp fieldset { display: flex; gap: 8px; border: none; padding: 0; margin: 0; }
      .inp input {
        flex: 1; border: 1px solid #e5e7eb; border-radius: 12px;
        padding: 10px 14px; font-size: 13px; outline: none;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .inp input:focus { border-color: \${PRIMARY_COLOR}; }
      .inp button {
        width: 40px; height: 40px; background: \${PRIMARY_COLOR};
        border: none; border-radius: 12px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      .inp button:hover { opacity: 0.9; }
      .inp button:disabled { opacity: 0.5; cursor: not-allowed; }

      .ftr { text-align: center; padding: 8px; font-size: 10px; color: #999; flex-shrink: 0; }
      .sug-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
        margin-left: 42px;
        align-self: flex-start;
        z-index: 10;
        max-width: 92%;
        animation: sugBounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        will-change: transform, opacity;
      }
      .sug-pill {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border: 1.5px solid rgba(${primaryRgbStr}, 0.22);
        color: \${PRIMARY_COLOR};
        border-radius: 20px;
        border-bottom-left-radius: 6px;
        padding: 8px 15px;
        font-size: 11.5px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-weight: 600;
        text-align: left;
        line-height: 1.3;
        box-shadow: 0 3px 10px rgba(0,0,0,0.03);
        width: fit-content;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .sug-pill:hover {
        background: \${PRIMARY_COLOR};
        color: white;
        border-color: transparent;
        transform: translateY(-3px) scale(1.03);
        box-shadow: 0 8px 20px rgba(${primaryRgbStr}, 0.35);
      }
      .sug-pill:active {
        transform: translateY(-1px) scale(0.98);
      }
      @keyframes sugBounceIn {
        from { opacity: 0; transform: translateY(12px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    </style>

    <div id="overlay"></div>
    <div id="bubble">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>
    <div id="window">
      <div class="hdr">
        <div class="hdr-l">
          <div class="hdr-av">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div>
            <div class="hdr-nm">\${WIDGET_NAME}</div>
            <div class="hdr-st">Online</div>
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="hdr-x" id="expand-btn" title="Tampilan Semi-Fullscreen (Tengah)">
            <svg id="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
          </button>
          <button class="hdr-x" id="close" title="Minimize Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 9l-7 7-7-7"></path></svg>
          </button>
        </div>
      </div>
      <div class="msgs" id="msgs"></div>
      <div class="inp">
        <fieldset>
          <input id="inp" type="text" placeholder="Ketik pesan..." />
          <button id="send" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </fieldset>
      </div>
      <div class="ftr">Powered by Srigonco AI</div>
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
    };
  }

  if (overlay) {
    overlay.onclick = function() {
      isExpanded = false;
      win.classList.remove('expanded');
      overlay.classList.remove('active');
    };
  }

  function parseFormatting(text, parentEl) {
    var NL = String.fromCharCode(10);
    var TICK1 = String.fromCharCode(96);
    var re = new RegExp(
      '(' + NL + '|\\*\\*.*?\\*\\*|\\*.*?\\*|' + TICK1 + '.*?' + TICK1 + ')',
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

  function setContent(el, text) {
    var TICK3 = String.fromCharCode(96,96,96);
    var mermaidTag = TICK3 + 'mermaid';
    
    var processedText = text;
    var firstMermaidIdx = processedText.indexOf(mermaidTag);
    if (firstMermaidIdx !== -1) {
      var afterMermaid = processedText.slice(firstMermaidIdx + mermaidTag.length);
      if (afterMermaid.indexOf(TICK3) === -1) {
        processedText += TICK3;
      }
    }

    var re = new RegExp('(' + TICK3 + 'mermaid[^]*?' + TICK3 + ')', 'g');
    var parts = processedText.split(re);
    parts.forEach(function(part) {
      if (part.startsWith(mermaidTag) && part.endsWith(TICK3)) {
        var code = part.slice(mermaidTag.length).replace(new RegExp(TICK3 + '$'), '').trim();
        var block = document.createElement('div');
        block.style.cssText = 'background:#f4f4f4;padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;margin:8px 0;border:1px solid #e5e7eb;white-space:pre-wrap;';
        block.textContent = code;
        el.appendChild(block);
      } else if (part) {
        parseFormatting(part, el);
      }
    });
  }

  function addMsg(text, isUser) {
    removeSug();
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
      ic.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
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
    ic.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
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

  function removeSug() {
    var sug = shadow.getElementById('sug-wrap');
    if (sug) {
      sug.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
      sug.style.opacity = '0';
      sug.style.transform = 'translateY(5px)';
      setTimeout(function() {
        sug.remove();
      }, 250);
    }
  }

  addMsg(WELCOME_MSG, false);

  if (SUGGESTED_QUESTIONS && SUGGESTED_QUESTIONS.length > 0) {
    var sugWrap = document.createElement('div');
    sugWrap.className = 'sug-wrap';
    sugWrap.id = 'sug-wrap';
    SUGGESTED_QUESTIONS.forEach(function(q) {
      var pill = document.createElement('button');
      pill.className = 'sug-pill';
      pill.textContent = q;
      pill.onclick = function() {
        inp.value = q;
        doSend();
      };
      sugWrap.appendChild(pill);
    });
    msgs.appendChild(sugWrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

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
      var res = await fetch(API_URL + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
