import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: widget } = await supabase
    .from('widgets')
    .select('name, welcome_message, primary_color')
    .eq('id', id)
    .single();

  const name = widget?.name || 'Chatbot';
  const welcome = widget?.welcome_message || 'Halo! Ada yang bisa dibantu? 👋';
  const color = widget?.primary_color || '#25D366';

  const script = `
(function() {
  var WIDGET_ID = '${id}';
  var API_URL = '${request.nextUrl.origin}';
  var WIDGET_NAME = ${JSON.stringify(name)};
  var WELCOME_MSG = ${JSON.stringify(welcome)};
  var PRIMARY_COLOR = '${color}';

  var host = document.createElement('div');
  host.id = 'chatbot-widget-host';
  host.style.cssText = 'all:initial;position:fixed !important;bottom:24px !important;right:24px !important;z-index:99999 !important;font-family:system-ui,-apple-system,sans-serif;display:block !important;visibility:visible !important;';
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = \`
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :host { all: initial; }

      #bubble {
        position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px;
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

      .inp {
        padding: 12px 16px; border-top: 1px solid #f0f0f0;
        display: flex; gap: 8px; background: white; flex-shrink: 0;
      }
      .inp fieldset { border: none; display: flex; gap: 8px; flex: 1; }
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
    </style>

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
        <button class="hdr-x" id="close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 9l-7 7-7-7"></path></svg>
        </button>
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
      <div class="ftr">Powered by ChatToko</div>
    </div>
  \`;

  var bubble = shadow.getElementById('bubble');
  var win = shadow.getElementById('window');
  var close = shadow.getElementById('close');
  var inp = shadow.getElementById('inp');
  var send = shadow.getElementById('send');
  var msgs = shadow.getElementById('msgs');
  var mermaidId = 0;

  function sanitizeMermaid(chart) {
    var NL = String.fromCharCode(10);
    return chart
      .split(NL)
      .map(function(line) {
        var parts = line.split('-->');
        var cleanParts = parts.map(function(part) {
          var trimmed = part.trim();
          var suffix = '';
          
          if (trimmed.endsWith(';')) {
            trimmed = trimmed.slice(0, -1).trim();
            suffix = ';';
          }
          
          var leading = '';
          for (var i = 0; i < part.length; i++) {
            if (part[i] === ' ' || part[i] === '\t') {
              leading += part[i];
            } else {
              break;
            }
          }
          
          // 1. Bracket shape: nodeId[label]
          var idx1 = trimmed.indexOf('[');
          if (idx1 > 0 && trimmed.endsWith(']')) {
            var nodeId = trimmed.slice(0, idx1).trim();
            var label = trimmed.slice(idx1 + 1, -1);
            if (label.indexOf('"') !== 0) {
              return leading + nodeId + '["' + label + '"]' + suffix;
            }
          }
          
          // 2. Curly shape: nodeId{label}
          var idx2 = trimmed.indexOf('{');
          if (idx2 > 0 && trimmed.endsWith('}')) {
            var nodeId = trimmed.slice(0, idx2).trim();
            var label = trimmed.slice(idx2 + 1, -1);
            if (label.indexOf('"') !== 0) {
              return leading + nodeId + '{"' + label + '"}' + suffix;
            }
          }
          
          // 3. Rounded shape: nodeId(label)
          var idx3 = trimmed.indexOf('(');
          if (idx3 > 0 && trimmed.endsWith(')')) {
            var nodeId = trimmed.slice(0, idx3).trim();
            var label = trimmed.slice(idx3 + 1, -1);
            if (label.indexOf('"') !== 0) {
              return leading + nodeId + '("' + label + '")' + suffix;
            }
          }
          
          return part;
        });
        
        return cleanParts.join(' --> ');
      })
      .join(NL);
  }

  var mermaidLoaded = false;
  var mermaidCallbacks = [];
  function loadMermaid() {
    if (window.mermaid) {
      mermaidLoaded = true;
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    s.onload = function() {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit'
      });
      mermaidLoaded = true;
      for (var i = 0; i < mermaidCallbacks.length; i++) {
        mermaidCallbacks[i]();
      }
      mermaidCallbacks = [];
    };
    document.head.appendChild(s);
  }
  loadMermaid();

  function renderMermaidEl(text, el) {
    var id = 'mermaidchart-' + Math.floor(Math.random() * 1000000);
    var cleanText = sanitizeMermaid(text);
    
    function doRender() {
      window.mermaid.render(id, cleanText).then(function(result) {
        el.innerHTML = result.svg;
        el.style.cssText = 'padding:8px;margin:8px 0;text-align:center;background:white;border-radius:8px;border:1px solid #e5e7eb;overflow-x:auto;max-width:100%;';
      }).catch(function(err) {
        console.error('Mermaid render error:', err);
        el.style.whiteSpace = 'pre-wrap';
        el.textContent = text;
      });
    }
    
    if (mermaidLoaded && window.mermaid) {
      doRender();
    } else {
      mermaidCallbacks.push(doRender);
    }
  }

  function parseFormatting(text, parentEl) {
    var TICK1 = String.fromCharCode(96);
    var NL = String.fromCharCode(10);
    var re = new RegExp(
      '(\\\\*\\\\*[\\\\s\\\\S]*?\\\\*\\\\*|\\\\*[^*' + NL + ']+\\\\*|' +
      TICK1 + '[^' + TICK1 + NL + ']*' + TICK1 +
      '|' + NL + ')',
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
        renderMermaidEl(code, block);
      } else if (part) {
        parseFormatting(part, el);
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
      ic.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      var m = document.createElement('div');
      m.className = 'm mb';
      wrap.appendChild(ic);
      wrap.appendChild(m);
      msgs.appendChild(wrap); // append to DOM FIRST
      setContent(m, text);    // THEN parse & render content (mermaid needs live DOM)
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

  addMsg(WELCOME_MSG, false);

  bubble.onclick = function() {
    bubble.style.display = 'none';
    win.style.display = 'flex';
    inp.focus();
  };

  close.onclick = function() {
    win.style.display = 'none';
    bubble.style.display = 'flex';
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
