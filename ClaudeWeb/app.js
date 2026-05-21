// ── Live chat via Groq (free tier, streaming) ──
const keyInput     = document.getElementById('api-key');
const saveKeyBtn   = document.getElementById('save-key-btn');
const keyStatus    = document.getElementById('key-status');
const liveForm     = document.getElementById('live-form');
const liveInput    = document.getElementById('live-input');
const sendBtn      = document.getElementById('send-btn');
const liveMessages = document.getElementById('live-messages');

const savedKey = sessionStorage.getItem('groq_api_key');
if (savedKey) { keyInput.value = savedKey; setKeyStatus('ok', 'Key loaded.'); }

function setKeyStatus(type, msg) {
  keyStatus.textContent = msg;
  keyStatus.className = type;
}

saveKeyBtn.addEventListener('click', () => {
  const key = keyInput.value.trim();
  if (!key.startsWith('gsk_')) return setKeyStatus('err', 'Groq keys start with gsk_');
  sessionStorage.setItem('groq_api_key', key);
  setKeyStatus('ok', 'Key saved for this session.');
});

function addLiveMsg(role, text) {
  const el = document.createElement('div');
  el.className = 'live-msg ' + role;
  el.textContent = text;
  liveMessages.appendChild(el);
  liveMessages.scrollTop = liveMessages.scrollHeight;
  return el;
}

liveInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); liveForm.requestSubmit(); }
});

liveForm.addEventListener('submit', async e => {
  e.preventDefault();
  const question = liveInput.value.trim();
  if (!question) return;

  const key = sessionStorage.getItem('groq_api_key') || keyInput.value.trim();
  if (!key.startsWith('gsk_')) {
    setKeyStatus('err', 'Please save a valid Groq key first.');
    keyInput.focus();
    return;
  }

  liveInput.value = '';
  sendBtn.disabled = true;
  addLiveMsg('user', question);
  const responseEl = addLiveMsg('claude streaming', '');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: question }],
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'HTTP ' + res.status);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try {
          const delta = JSON.parse(line.slice(6)).choices[0].delta.content;
          if (delta) {
            responseEl.textContent += delta;
            liveMessages.scrollTop = liveMessages.scrollHeight;
          }
        } catch { /* skip malformed chunks */ }
      }
    }
    responseEl.classList.remove('streaming');
  } catch (err) {
    responseEl.className = 'live-msg error';
    responseEl.textContent = 'Error: ' + err.message;
  } finally {
    sendBtn.disabled = false;
    liveInput.focus();
  }
});

// ── Tab switcher ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('demo-' + tab.dataset.tab).classList.add('active');
  });
});

// ── Hero chat animation ──
const conversation = [
  { role: 'user',   text: 'Can you write a Python script to rename files in bulk?' },
  { role: 'claude', text: 'Sure! Here\'s a script that renames files using a pattern you define…' },
  { role: 'user',   text: 'Can it preview changes before applying them?' },
  { role: 'claude', text: 'Great idea — adding a --dry-run flag so you can review first.' },
];

const chatBody = document.getElementById('chat-body');
conversation.forEach((msg, i) => {
  setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'msg ' + msg.role;
    el.textContent = msg.text;
    chatBody.appendChild(el);
    chatBody.scrollTop = chatBody.scrollHeight;
  }, i * 1100);
});
