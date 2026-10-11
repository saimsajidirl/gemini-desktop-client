const { invoke, Channel } = window.__TAURI__.core;
const shell = window.__TAURI__.shell;

/* ---------------- State ---------------- */
// Supported models — mirrors the AI Studio model list. The picker shows
// exactly these; the API's list_models only enriches names/descriptions.
const SUPPORTED_MODELS = [
  // Chat — pricing is per 1M tokens (in/out) unless noted
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Most intelligent Flash model — long-horizon SWE, autonomous agents, complex workflows', kind: 'chat', supportsThinking: true, paid: false, isNew: true, pricing: 'In $0.75 · Out $3.75', released: 'Sep 2026' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'SOTA reasoning with powerful multimodal understanding and coding', kind: 'chat', supportsThinking: true, paid: false, pricing: '≤200K: $2/$12 · >200K: $4/$18', released: 'Feb 2026' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Previous-gen Flash, balancing speed and multimodal capabilities', kind: 'chat', supportsThinking: true, paid: true, pricing: 'In $0.75 · Out $3.75', released: 'Jul 2026' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: 'Legacy Flash model — baseline speed and intelligence', kind: 'chat', supportsThinking: true, paid: true, pricing: 'In $0.50 · Out $3.00', released: 'Dec 2025' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Fastest, most cost-effective 3.5 model for high-throughput execution', kind: 'chat', supportsThinking: false, paid: false, pricing: 'In $0.30 · Out $2.50', released: 'Jul 2026' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Most cost-efficient — high-volume agentic tasks and data processing', kind: 'chat', supportsThinking: false, paid: false, pricing: 'Text/img/vid $0.25/$1.50 · Audio $0.50/$1.50', released: 'May 2026' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', description: 'Alias pointing to the latest Flash model', kind: 'chat', supportsThinking: true, paid: false, isNew: true, pricing: 'Same as 3.8 Flash', released: 'Sep 2026' },
  { id: 'gemini-pro-latest', name: 'Gemini Pro Latest', description: 'Alias pointing to the latest Pro model', kind: 'chat', supportsThinking: true, paid: false, pricing: 'Same as 3.1 Pro', released: 'Feb 2026' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite Latest', description: 'Alias pointing to the latest Flash-Lite model', kind: 'chat', supportsThinking: false, paid: false, pricing: 'Same as 3.5 Flash Lite', released: 'Jul 2026' },
  { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT', description: 'Flagship open-weight dense model, 256K context', kind: 'chat', supportsThinking: false, paid: false, pricing: 'Open weights', released: 'Apr 2026' },
  { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B A4B IT', description: 'MoE model — 4B active params, cost-efficient throughput', kind: 'chat', supportsThinking: false, paid: false, pricing: 'Open weights', released: 'Apr 2026' },
  // Agents
  { id: 'antigravity-preview-09-2026', name: 'Antigravity Agent Preview', description: 'Autonomous agent running in a Google-hosted Linux environment', kind: 'agent', supportsThinking: false, paid: true, pricing: 'Based on configured model', released: 'Sep 2026' },
  { id: 'deep-research-preview-04-2026', name: 'Deep Research Preview', description: 'Long-running research agent, optimized for speed and efficiency', kind: 'agent', supportsThinking: false, paid: true, pricing: '3.1 Pro + 3 Flash pricing', released: 'Apr 2026' },
  { id: 'deep-research-max-preview-04-2026', name: 'Deep Research Max Preview', description: 'SOTA research agent — maximum exhaustiveness and comprehensiveness', kind: 'agent', supportsThinking: false, paid: true, pricing: '3.1 Pro + 3 Flash pricing', released: 'Apr 2026' },
  { id: 'gemini-robotics-er-2-preview', name: 'Gemini Robotics-ER 2 Preview', description: 'Embodied reasoning — spatial reasoning and multi-robot collaboration', kind: 'agent', supportsThinking: false, paid: false, pricing: 'In $2.00 · Out $10.00', released: 'Jul 2026' },
  // Image — image output priced per image
  { id: 'gemini-nano-banana-2.1', name: 'Nano Banana 2.1', description: 'Image generation & editing — enhanced factuality and fidelity', kind: 'image', supportsThinking: false, paid: true, isNew: true, pricing: 'Text $1.50/$7.50 · Image $0.034', released: 'Oct 2026' },
  { id: 'gemini-3-pro-image', name: 'Nano Banana Pro', description: 'State-of-the-art image generation and editing', kind: 'image', supportsThinking: false, paid: true, pricing: 'Text $2/$12 · Image $0.134', released: 'May 2026' },
  { id: 'gemini-3.1-flash-image', name: 'Nano Banana 2', description: 'Pro-level visuals with Flash-speed efficiency', kind: 'image', supportsThinking: false, paid: true, pricing: 'Text $0.50/$3 · Image $0.067', released: 'May 2026' },
  { id: 'gemini-3.1-flash-lite-image', name: 'Nano Banana 2 Lite', description: 'Smallest, most cost-effective image generation model', kind: 'image', supportsThinking: false, paid: false, pricing: 'Text $0.25/$1.50 · Image $0.034', released: 'Jun 2026' },
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana', description: 'Previous-gen image generation and editing model', kind: 'image', supportsThinking: false, paid: true, pricing: 'Text $0.30/$2.50 · Image $0.039', released: 'Sep 2025' },
  // Audio
  { id: 'gemini-3.8-flash-tts', name: 'Gemini 3.8 Flash TTS', description: 'Flagship TTS — voice design, dual-speaker screenplay control', kind: 'audio', supportsThinking: false, paid: false, isNew: true, pricing: 'Text→Audio $0.50/$9.00', released: 'Sep 2026' },
  { id: 'gemini-3.8-flash-lite-tts', name: 'Gemini 3.8 Flash Lite TTS', description: 'High-speed TTS for dubbing, localization, voice agents', kind: 'audio', supportsThinking: false, paid: false, pricing: 'Text→Audio $0.50/$6.00', released: 'Sep 2026' },
  { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS Preview', description: 'Low-latency speech with steerable prompts and audio tags', kind: 'audio', supportsThinking: false, paid: false, pricing: 'In $1.00 · Out $20.00', released: 'Apr 2026' },
  { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro TTS', description: '2.5 Pro TTS — powerful, natural, easy to steer', kind: 'audio', supportsThinking: false, paid: false, pricing: 'In $1.00 · Out $20.00' },
  { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS', description: 'Price-performant, low-latency controllable speech', kind: 'audio', supportsThinking: false, paid: false, pricing: 'Audio $0.50/$10.00' },
  { id: 'gemini-3.5-transcribe', name: 'Gemini 3.5 Transcribe', description: 'High-accuracy speech-to-text with rich archival metadata', kind: 'audio', supportsThinking: false, paid: false, isNew: true, pricing: 'Audio $2.00/$12.00', released: 'Aug 2026' },
  { id: 'gemini-3.5-transcribe-live', name: 'Gemini 3.5 Transcribe Live', description: 'Ultra-low latency real-time streaming transcription', kind: 'audio', supportsThinking: false, paid: false, isNew: true, pricing: 'Audio $3.50/$21.00', released: 'Aug 2026' },
  { id: 'gemini-3.8-live', name: 'Gemini 3.8 Live', description: 'Low-latency real-time dialogue with background async tools', kind: 'audio', supportsThinking: false, paid: false, pricing: 'Text $0.75/$4.50 · Audio $3/$12', released: 'Sep 2026' },
  { id: 'gemini-3.8-live-extended-thinking', name: 'Gemini 3.8 Live Ext. Thinking', description: 'Live dialogue with in-depth reasoning and verbal cues', kind: 'audio', supportsThinking: false, paid: false, pricing: 'Text $0.75/$4.50 · Audio $3/$12', released: 'Sep 2026' },
  { id: 'gemini-3.1-flash-live-preview', name: 'Gemini 3.1 Flash Live Preview', description: 'Audio-to-audio real-time dialogue with acoustic nuance', kind: 'audio', supportsThinking: false, paid: false, pricing: 'Text $0.75/$4.50 · Audio $3/$12', released: 'Mar 2026' },
  { id: 'gemini-3.5-live-translate-preview', name: 'Gemini 3.5 Live Translate', description: 'Real-time speech-to-speech translation for 70+ languages', kind: 'audio', supportsThinking: false, paid: false, pricing: 'Audio $3.50/$21.00', released: 'Jun 2026' },
  { id: 'lyria-3.5', name: 'Lyria 3.5', description: 'Full-song generation with enhanced vocal clarity', kind: 'audio', supportsThinking: false, paid: true, pricing: '$0.08 / song', released: 'Sep 2026' },
  { id: 'lyria-3-pro-preview', name: 'Lyria 3 Pro Preview', description: 'Advanced music generation with structural control', kind: 'audio', supportsThinking: false, paid: true, pricing: '$0.08 / song', released: 'Mar 2026' },
  { id: 'lyria-3-clip-preview', name: 'Lyria 3 Clip Preview', description: 'Low-latency, high-fidelity music clip generation', kind: 'audio', supportsThinking: false, paid: true, pricing: '$0.04 / clip', released: 'Mar 2026' },
  // Video
  { id: 'gemini-omni-1.1-flash', name: 'Gemini Omni 1.1 Flash', description: 'Generative video — keyframe control, scene extension, 4K upscale', kind: 'video', supportsThinking: false, paid: true, isNew: true, pricing: 'T/A/V $1.50/$9 · Video out $17.50', released: 'Aug 2026' },
  { id: 'gemini-omni-flash-preview', name: 'Gemini Omni Flash Preview', description: 'Video generation and conversational editing', kind: 'video', supportsThinking: false, paid: true, pricing: 'T/A/V $1.50/$9 · Video out $17.50', released: 'Jun 2026' },
  { id: 'veo-3.1-generate-preview', name: 'Veo 3.1', description: 'Latest video generation model — 720p/1080p/4K', kind: 'video', supportsThinking: false, paid: true, pricing: '$0.40/s 720p–1080p · $0.60/s 4K' },
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', description: 'Faster Veo, optimized for business use', kind: 'video', supportsThinking: false, paid: true, pricing: '$0.10/s 720p · $0.12/s 1080p · $0.30/s 4K' },
  { id: 'veo-3.1-lite-generate-preview', name: 'Veo 3.1 Lite', description: 'Most cost-efficient video generation model', kind: 'video', supportsThinking: false, paid: true, pricing: '$0.05/s 720p · $0.08/s 1080p', released: 'Mar 2026' },
  { id: 'gemini-robotics-er-2-streaming-preview', name: 'Gemini Robotics-ER 2 Streaming', description: 'Real-time embodied reasoning and text streaming', kind: 'video', supportsThinking: false, paid: false, pricing: 'In $2.00 · Out $10.00', released: 'Jul 2026' },
];

const state = {
  apiKey: '',
  systemPrompt: '',
  models: SUPPORTED_MODELS,
  selectedModel: localStorage.getItem('gd.model') || 'gemini-3.8-flash',
  chats: loadChats(),
  activeChatId: null,
  streaming: false,
  abortFlag: false,
  pendingImages: [], // {mimeType, data(b64), dataUrl}
  username: '',
};

function loadChats() {
  try {
    return JSON.parse(localStorage.getItem('gd.chats') || '[]');
  } catch {
    return [];
  }
}

function saveChats() {
  try {
    localStorage.setItem('gd.chats', JSON.stringify(state.chats));
  } catch {
    toast('Could not save chats locally (storage full — try removing image attachments).');
  }
}

const $ = (sel) => document.querySelector(sel);
const sidebar = $('#sidebar');
const chatListEl = $('#chat-list');
const chatScroll = $('#chat-scroll');
const welcomeEl = $('#welcome');
const messagesEl = $('#messages');
const inputEl = $('#input');
const sendBtn = $('#send-btn');
const stopBtn = $('#stop-btn');
const modelBtn = $('#model-btn');
const modelBtnLabel = $('#model-btn-label');
const modelMenu = $('#model-menu');
const settingsModal = $('#settings-modal');
const apiKeyInput = $('#api-key-input');
const sysPromptInput = $('#system-prompt-input');
const fileInput = $('#file-input');
const attachmentsEl = $('#attachments');
const thinkingToggle = $('#thinking-toggle');
const thinkingCheckbox = $('#thinking-checkbox');
const toastEl = $('#toast');
const themeBtn = $('#theme-btn');

const SUN_ICON = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V2a1 1 0 0 1 1-1zm0 20a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM4.22 3.63a1 1 0 0 1 1.41 0l.71.7A1 1 0 1 1 4.93 5.75l-.7-.7a1 1 0 0 1 0-1.42zm14.14 14.14a1 1 0 0 1 1.41 0l.7.7a1 1 0 0 1-1.4 1.42l-.71-.7a1 1 0 0 1 0-1.42zM1 13a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2H1zm20 0a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2h-1zM4.22 20.37a1 1 0 0 1 0-1.41l.7-.71a1 1 0 0 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0zM18.36 5.64a1 1 0 0 1 0-1.41l.7-.7a1 1 0 1 1 1.42 1.4l-.7.71a1 1 0 0 1-1.42 0z"/></svg>';
const MOON_ICON = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12.1 22c-5.5 0-10-4.5-10-10 0-4.4 2.9-8.2 7-9.5a.76.76 0 0 1 .9.9c-.1.6-.1 1.1-.1 1.7a7.72 7.72 0 0 0 7.8 7.8c.6 0 1.1 0 1.7-.1a.76.76 0 0 1 .9.9c-1.4 4.1-5.2 6.9-8.2 6.9v.4z"/></svg>';

function applyTheme(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  themeBtn.innerHTML = theme === 'light' ? MOON_ICON : SUN_ICON;
  themeBtn.title = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
}

/* ---------------- Helpers ---------------- */
let toastTimer = null;
function toast(msg, ms = 4000) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), ms);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function modelById(id) {
  return state.models.find((m) => m.id === id);
}

function activeChat() {
  return state.chats.find((c) => c.id === state.activeChatId) || null;
}

function renderMarkdown(text, highlight = true) {
  const html = marked.parse(text || '', { breaks: true, gfm: true });
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('pre code').forEach((code) => {
    const match = code.className.match(/language-([\w+-]+)/);
    const lang = match && match[1];
    if (highlight) {
      try {
        if (lang && hljs.getLanguage(lang)) {
          code.innerHTML = hljs.highlight(code.textContent, { language: lang }).value;
        } else {
          code.innerHTML = hljs.highlightAuto(code.textContent).value;
        }
        code.classList.add('hljs');
      } catch { /* leave unhighlighted */ }
    }

    const pre = code.parentElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'codeblock';
    const header = document.createElement('div');
    header.className = 'codeblock-header';
    const langLabel = document.createElement('span');
    langLabel.textContent = lang || 'code';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy code';
    copyBtn.onclick = () => copyText(code.textContent, copyBtn);
    header.append(langLabel, copyBtn);
    pre.parentElement.insertBefore(wrapper, pre);
    wrapper.append(header, pre);
    pre.style.margin = '0';
  });
  return tmp;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast('Copied to clipboard', 1500);
  if (btn) {
    const old = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(() => (btn.textContent = old), 1500);
  }
}

function scrollToBottom(force = false) {
  const nearBottom = chatScroll.scrollHeight - chatScroll.scrollTop - chatScroll.clientHeight < 140;
  if (force || nearBottom) chatScroll.scrollTop = chatScroll.scrollHeight;
}

/* ---------------- Sidebar / chats ---------------- */
function renderSidebar() {
  chatListEl.innerHTML = '';
  for (const chat of state.chats) {
    const item = document.createElement('div');
    item.className = 'chat-item' + (chat.id === state.activeChatId ? ' active' : '');
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = chat.title || 'New chat';
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.title = 'Delete chat';
    del.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    del.onclick = (e) => {
      e.stopPropagation();
      state.chats = state.chats.filter((c) => c.id !== chat.id);
      if (state.activeChatId === chat.id) state.activeChatId = null;
      saveChats();
      renderAll();
    };
    item.append(title, del);
    item.onclick = () => {
      if (state.streaming) return;
      state.activeChatId = chat.id;
      renderAll();
    };
    chatListEl.appendChild(item);
  }
}

function ensureChat() {
  let chat = activeChat();
  if (!chat) {
    chat = { id: uid(), title: '', model: state.selectedModel, messages: [] };
    state.chats.unshift(chat);
    state.activeChatId = chat.id;
  }
  return chat;
}

/* ---------------- Messages ---------------- */
function renderMessages() {
  messagesEl.innerHTML = '';
  const chat = activeChat();
  welcomeEl.style.display = chat && chat.messages.length ? 'none' : 'block';
  if (!chat) return;

  for (const msg of chat.messages) {
    messagesEl.appendChild(renderMessageNode(msg));
  }
  scrollToBottom(true);
}

function thoughtBlockEl(thought, streaming) {
  const details = document.createElement('details');
  details.className = 'thought-block';
  const summary = document.createElement('summary');
  const label = document.createElement('span');
  label.className = 'th-label';
  label.textContent = streaming ? 'Thinking…' : 'Thought process';
  const chev = document.createElement('span');
  chev.className = 'th-chev';
  chev.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 10l5 5 5-5H7z"/></svg>';
  summary.append(label, chev);
  const body = document.createElement('div');
  body.className = 'thought-body';
  body.textContent = thought;
  details.append(summary, body);
  return details;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Batch all streaming DOM writes into one paint per frame.
let rafPending = false;
function updateStreamingMsg(msg) {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    flushStreamingMsg(msg);
  });
}

function flushStreamingMsg(msg) {
  const el = messagesEl.querySelector(`.msg[data-mid="${msg.id}"]`);
  if (!el) return;
  let bubble = el.querySelector('.model-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.className = 'bubble model-bubble';
    el.appendChild(bubble);
  }
  const text = (msg.parts || []).filter((p) => p.text !== undefined).map((p) => p.text).join('');
  if (!text && msg.streaming) {
    if (!el.querySelector('.typing')) {
      bubble.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    }
  } else {
    // Skip syntax highlighting mid-stream — it runs once at the end.
    bubble.innerHTML = '';
    bubble.appendChild(renderMarkdown(text, false));
  }

  if (msg.hasThought) {
    let tb = el.querySelector('.thought-block');
    if (!tb) {
      tb = thoughtBlockEl(msg.thought, msg.streaming);
      el.insertBefore(tb, bubble);
    } else {
      tb.querySelector('.thought-body').textContent = msg.thought;
      tb.querySelector('.th-label').textContent = msg.streaming ? 'Thinking…' : 'Thought process';
    }
  }

  const mediaRow = mediaRowEl(msg.parts);
  let existingRow = el.querySelector('.msg-media');
  if (mediaRow) {
    if (existingRow) existingRow.replaceWith(mediaRow);
    else el.insertBefore(mediaRow, el.querySelector('.msg-actions'));
  }
  scrollToBottom();
}

/* ---------------- Model selector ---------------- */
function isImageModel(id) {
  return /image|banana/i.test(id);
}

function isAudioModel(id) {
  return /tts|live|transcribe|lyria/i.test(id);
}

function renderModelButton() {
  const m = modelById(state.selectedModel);
  modelBtnLabel.textContent = m ? m.name : state.selectedModel;
  const id = state.selectedModel;
  const supportsThinking = m
    ? !!m.supportsThinking
    : id.includes('gemini-3') && !isImageModel(id) && !isAudioModel(id);
  thinkingToggle.hidden = !supportsThinking;
}

function modelBadge(m) {
  if (m.kind === 'image') return { cls: 'image', label: 'Image' };
  if (m.kind === 'audio') return { cls: 'audio', label: 'Audio' };
  if (m.kind === 'video') return { cls: 'video', label: 'Video' };
  if (m.kind === 'agent') return { cls: 'agent', label: 'Agent' };
  const id = m.id;
  if (/lite/i.test(id)) return { cls: 'lite', label: 'Lite' };
  if (/pro/i.test(id)) return { cls: 'pro', label: 'Pro' };
  if (/flash/i.test(id)) return { cls: 'fast', label: 'Fast' };
  if (/gemma/i.test(id)) return { cls: 'lite', label: 'Open' };
  return null;
}

function renderModelMenu() {
  modelMenu.innerHTML = '';
  const groups = [
    ['Chat models', (m) => m.kind === 'chat'],
    ['Agents', (m) => m.kind === 'agent'],
    ['Image & audio', (m) => m.kind === 'image' || m.kind === 'audio'],
    ['Video', (m) => m.kind === 'video'],
  ];

  const addSection = (label) => {
    const el = document.createElement('div');
    el.className = 'model-section-label';
    el.textContent = label;
    modelMenu.appendChild(el);
  };
  const addOption = (m) => {
    const opt = document.createElement('button');
    opt.className = 'model-option' + (m.id === state.selectedModel ? ' selected' : '');
    const name = document.createElement('span');
    name.className = 'model-name';
    const badge = modelBadge(m);
    name.innerHTML = `<span class="check"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span><span>${escapeHtml(m.name)}</span>`;
    if (badge) {
      const b = document.createElement('span');
      b.className = `badge ${badge.cls}`;
      b.textContent = badge.label;
      name.appendChild(b);
    }
    if (m.isNew) {
      const b = document.createElement('span');
      b.className = 'badge new';
      b.textContent = 'New';
      name.appendChild(b);
    }
    const tier = document.createElement('span');
    tier.className = `model-tier ${m.paid ? 'paid' : 'free'}`;
    tier.textContent = m.paid ? 'Paid' : 'Free';
    name.appendChild(tier);
    const desc = document.createElement('span');
    desc.className = 'model-desc';
    desc.textContent = m.description || m.id;
    opt.append(name, desc);
    const meta = [m.pricing, m.released].filter(Boolean).join(' · ');
    if (meta) {
      const metaEl = document.createElement('span');
      metaEl.className = 'model-meta';
      metaEl.textContent = meta;
      opt.appendChild(metaEl);
    }
    opt.onclick = () => {
      state.selectedModel = m.id;
      localStorage.setItem('gd.model', m.id);
      modelMenu.hidden = true;
      renderModelButton();
      renderModelMenu();
    };
    modelMenu.appendChild(opt);
  };

  for (const [label, pred] of groups) {
    const models = state.models.filter(pred);
    if (!models.length) continue;
    addSection(label);
    models.forEach(addOption);
  }
}

async function refreshModels() {
  try {
    const apiModels = await invoke('list_models');
    if (apiModels && apiModels.length) {
      const byId = new Map(apiModels.map((m) => [m.id, m]));
      // Enrich curated entries with live API names/descriptions; anything
      // the API returns that is not in SUPPORTED_MODELS is ignored.
      state.models = SUPPORTED_MODELS.map((m) => {
        const a = byId.get(m.id);
        return a
          ? { ...m, name: a.name || m.name, description: a.description || m.description, supportsThinking: a.supportsThinking }
          : m;
      });
      renderModelButton();
      renderModelMenu();
    }
  } catch (e) {
    console.warn('list_models failed:', e);
  }
}

/* ---------------- Settings ---------------- */
function openSettings() {
  apiKeyInput.value = state.apiKey;
  sysPromptInput.value = state.systemPrompt;
  settingsModal.hidden = false;
}

async function loadSettings() {
  try {
    const s = await invoke('get_settings');
    state.apiKey = s.apiKey || '';
    state.systemPrompt = s.systemPrompt || '';
    if (!state.apiKey) openSettings();
  } catch (e) {
    console.warn('get_settings failed:', e);
  }
}

/* ---------------- Attachments ---------------- */
function renderAttachments() {
  attachmentsEl.innerHTML = '';
  state.pendingImages.forEach((img, i) => {
    const t = document.createElement('div');
    t.className = 'attachment-thumb';
    const el = document.createElement('img');
    el.src = img.dataUrl;
    const rm = document.createElement('button');
    rm.textContent = '×';
    rm.onclick = () => {
      state.pendingImages.splice(i, 1);
      renderAttachments();
    };
    t.append(el, rm);
    attachmentsEl.appendChild(t);
  });
}

function attachFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) {
      toast(`"${f.name}" is not an image — only images are supported for now.`);
      continue;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const data = dataUrl.split(',')[1];
      state.pendingImages.push({ mimeType: f.type, data, dataUrl });
      renderAttachments();
      updateSendBtn();
    };
    reader.readAsDataURL(f);
  }
}

/* ---------------- Composer ---------------- */
function updateSendBtn() {
  const can = (inputEl.value.trim() || state.pendingImages.length) && !state.streaming;
  sendBtn.disabled = !can;
  sendBtn.classList.toggle('ready', !!can);
}

function autosize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + 'px';
}

/* ---------------- Send / stream ---------------- */
function buildContents(chat) {
  return chat.messages
    .filter((m) => m.role === 'user' || (m.role === 'model' && !m.error))
    .map((m) => ({
      role: m.role,
      parts: (m.parts || [])
        .filter((p) => (p.text !== undefined && p.text !== '') || p.inlineData)
        .map((p) => (p.text !== undefined ? { text: p.text } : { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } })),
    }))
    .filter((m) => m.parts.length);
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if ((!text && !state.pendingImages.length) || state.streaming) return;
  if (!state.apiKey) {
    openSettings();
    toast('Add your Gemini API key first.');
    return;
  }

  const chat = ensureChat();
  welcomeEl.style.display = 'none';

  const userParts = [];
  if (text) userParts.push({ text });
  for (const img of state.pendingImages) {
    userParts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }
  const userMsg = { id: uid(), role: 'user', parts: userParts };
  chat.messages.push(userMsg);
  if (!chat.title) chat.title = (text || 'Image').slice(0, 48);
  chat.model = state.selectedModel;

  inputEl.value = '';
  autosize();
  state.pendingImages = [];
  renderAttachments();
  renderSidebar();
  messagesEl.appendChild(renderMessageNode(userMsg));
  scrollToBottom(true);

  await requestReply(chat);
}

// Appends a placeholder assistant message and streams the model's reply
// for whatever history currently ends the chat.
async function requestReply(chat) {
  const assistantMsg = {
    id: uid(),
    role: 'model',
    model: modelById(state.selectedModel)?.name || state.selectedModel,
    parts: [{ text: '' }],
    thought: '',
    hasThought: false,
    streaming: true,
  };
  chat.messages.push(assistantMsg);
  messagesEl.appendChild(renderMessageNode(assistantMsg));
  scrollToBottom(true);

  state.streaming = true;
  state.abortFlag = false;
  updateSendBtn();
  stopBtn.hidden = false;
  sendBtn.hidden = true;

  const contents = buildContents(chat); // placeholder assistant msg is dropped by the empty-parts filter
  const model = modelById(state.selectedModel);
  const includeThoughts = model && model.supportsThinking && thinkingCheckbox.checked;

  const channel = new Channel();
  channel.onmessage = (ev) => {
    if (state.abortFlag) return;
    if (ev.type === 'delta') {
      if (ev.thought) {
        assistantMsg.thought = (assistantMsg.thought || '') + ev.text;
        assistantMsg.hasThought = true;
      } else {
        assistantMsg.parts[0].text += ev.text;
      }
      updateStreamingMsg(assistantMsg);
    } else if (ev.type === 'media') {
      assistantMsg.parts.push({ inlineData: { mimeType: ev.mimeType, data: ev.data } });
      updateStreamingMsg(assistantMsg);
    } else if (ev.type === 'finished') {
      finishStream(chat, assistantMsg, ev.finishReason);
    } else if (ev.type === 'error') {
      finishStream(chat, assistantMsg, null, ev.message);
    }
  };

  try {
    await invoke('send_message', {
      channel,
      model: state.selectedModel,
      contents,
      includeThoughts: !!includeThoughts,
    });
  } catch (e) {
    finishStream(chat, assistantMsg, null, String(e));
    return;
  }

  if (assistantMsg.streaming && !state.abortFlag) {
    finishStream(chat, assistantMsg, null);
  }
}

function finishStream(chat, msg, finishReason, error) {
  if (!msg.streaming) return;
  msg.streaming = false;
  if (error) msg.error = error;
  if (finishReason && finishReason !== 'STOP') msg.error = `Stopped: ${finishReason}`;
  const hasMedia = (msg.parts || []).some((p) => p.inlineData);
  if (!msg.parts[0].text && !msg.error && !msg.thought && !hasMedia) msg.error = 'Empty response.';

  state.streaming = false;
  stopBtn.hidden = true;
  sendBtn.hidden = false;
  updateSendBtn();
  saveChats();

  // Re-render just this message cleanly.
  const el = messagesEl.querySelector(`.msg[data-mid="${msg.id}"]`);
  if (el) {
    el.replaceWith(renderMessageNode(msg));
  }
  scrollToBottom();
}

function mediaEl(mimeType, data) {
  const url = `data:${mimeType};base64,${data}`;
  if (mimeType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Generated image';
    return img;
  }
  if (mimeType.startsWith('audio/')) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    return audio;
  }
  const chip = document.createElement('a');
  chip.className = 'file-chip';
  chip.href = url;
  chip.download = 'file';
  chip.textContent = mimeType;
  return chip;
}

function mediaRowEl(parts) {
  const media = (parts || []).filter((p) => p.inlineData);
  if (!media.length) return null;
  const row = document.createElement('div');
  row.className = 'msg-media';
  for (const p of media) row.appendChild(mediaEl(p.inlineData.mimeType, p.inlineData.data));
  return row;
}

const ICON_EDIT = 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z';
const ICON_COPY = 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z';
const ICON_REFRESH = 'M17.65 6.35A8 8 0 1 0 19.73 14h-2.08a6 6 0 1 1-1.41-6.24L13 11h7V4z';

function msgActionBtn(title, svgPath, onClick) {
  const b = document.createElement('button');
  b.className = 'icon-btn';
  b.title = title;
  b.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${svgPath}"/></svg>`;
  b.onclick = onClick;
  return b;
}

function renderMessageNode(msg) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${msg.role === 'user' ? 'user' : 'model'}`;
  wrap.dataset.mid = msg.id;

  const text = (msg.parts || []).filter((p) => p.text !== undefined).map((p) => p.text).join('');

  if (msg.role === 'user') {
    const mediaRow = mediaRowEl(msg.parts);
    if (mediaRow) wrap.appendChild(mediaRow);
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);

    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.append(
      msgActionBtn('Edit & resend', ICON_EDIT, () => startEdit(wrap, msg)),
      msgActionBtn('Copy', ICON_COPY, () => copyText(text, null)),
      msgActionBtn('Resend', ICON_REFRESH, () => resendMessage(msg)),
    );
    wrap.appendChild(actions);
    return wrap;
  }

  const tag = document.createElement('div');
  tag.className = 'model-tag';
  tag.innerHTML = `<span class="model-avatar"><svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg></span><span>${escapeHtml(msg.model || 'Gemini')}</span>`;
  wrap.appendChild(tag);

  if (msg.thought) {
    wrap.appendChild(thoughtBlockEl(msg.thought, msg.streaming));
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble model-bubble';
  if (text) {
    bubble.appendChild(renderMarkdown(text));
  } else if (msg.streaming) {
    bubble.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  }
  wrap.appendChild(bubble);

  const mediaRow = mediaRowEl(msg.parts);
  if (mediaRow) wrap.appendChild(mediaRow);

  if (msg.error) {
    const err = document.createElement('div');
    err.className = 'msg-error';
    err.textContent = msg.error;
    wrap.appendChild(err);
  } else {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.append(
      msgActionBtn('Copy', ICON_COPY, () => copyText(text, null)),
      msgActionBtn('Regenerate', ICON_REFRESH, () => regenerateMessage(msg)),
    );
    wrap.appendChild(actions);
  }
  return wrap;
}

/* ---------------- Message ops (edit / resend / regenerate) ---------------- */
function msgIndex(chat, msg) {
  return chat.messages.findIndex((m) => m.id === msg.id);
}

// Truncate history to `count` messages, re-render, then ask for a reply.
async function truncateAndReply(chat, count) {
  chat.messages = chat.messages.slice(0, count);
  saveChats();
  renderMessages();
  await requestReply(chat);
}

function startEdit(wrap, msg) {
  const chat = activeChat();
  if (!chat || state.streaming) return;
  const text = (msg.parts || []).filter((p) => p.text !== undefined).map((p) => p.text).join('');

  const box = document.createElement('div');
  box.className = 'edit-box';
  const ta = document.createElement('textarea');
  ta.className = 'edit-area';
  ta.value = text;
  const btns = document.createElement('div');
  btns.className = 'edit-actions';
  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = 'Cancel';
  const save = document.createElement('button');
  save.className = 'btn primary';
  save.textContent = 'Send';
  btns.append(cancel, save);
  box.append(ta, btns);

  const restore = () => wrap.replaceWith(renderMessageNode(msg));
  cancel.onclick = restore;
  save.onclick = () => submitEdit(msg, ta.value);
  ta.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitEdit(msg, ta.value);
    } else if (e.key === 'Escape') {
      restore();
    }
  };

  const actions = wrap.querySelector('.msg-actions');
  if (actions) actions.remove();
  wrap.querySelector('.bubble').replaceWith(box);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

async function submitEdit(msg, newText) {
  const chat = activeChat();
  if (!chat || state.streaming) return;
  const idx = msgIndex(chat, msg);
  if (idx < 0) return;
  newText = newText.trim();
  if (!newText && !(msg.parts || []).some((p) => p.inlineData)) return;
  const tp = (msg.parts || []).find((p) => p.text !== undefined);
  if (tp) tp.text = newText;
  else (msg.parts = msg.parts || []).unshift({ text: newText });
  await truncateAndReply(chat, idx + 1);
}

async function resendMessage(msg) {
  const chat = activeChat();
  if (!chat || state.streaming) return;
  const idx = msgIndex(chat, msg);
  if (idx < 0) return;
  await truncateAndReply(chat, idx + 1);
}

async function regenerateMessage(msg) {
  const chat = activeChat();
  if (!chat || state.streaming || msg.role !== 'model') return;
  const idx = msgIndex(chat, msg);
  if (idx < 0) return;
  await truncateAndReply(chat, idx);
}

/* ---------------- Suggestions ---------------- */
const SUGGESTIONS = [
  { title: 'Create', desc: 'an image of a neon-lit Tokyo street at night' },
  { title: 'Write', desc: 'a launch announcement for a fictional AI startup' },
  { title: 'Explain', desc: 'transformer attention like I am a product manager' },
  { title: 'Code', desc: 'a Rust function that streams a file in chunks' },
];

function renderSuggestions() {
  const box = $('#suggestions');
  box.innerHTML = '';
  for (const s of SUGGESTIONS) {
    const card = document.createElement('button');
    card.className = 'suggestion-card';
    card.innerHTML = `<span class="sug-title">${escapeHtml(s.title)}</span>${escapeHtml(s.desc)}`;
    card.onclick = () => {
      inputEl.value = `${s.title} ${s.desc}`;
      autosize();
      updateSendBtn();
      sendMessage();
    };
    box.appendChild(card);
  }
}

/* ---------------- Wiring ---------------- */
function renderAll() {
  renderSidebar();
  renderMessages();
  renderModelButton();
}

$('#new-chat-btn').onclick = () => {
  if (state.streaming) return;
  state.activeChatId = null;
  renderAll();
  inputEl.focus();
};

$('#menu-btn').onclick = () => sidebar.classList.toggle('collapsed');
$('#settings-btn').onclick = openSettings;

themeBtn.onclick = () => {
  const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
  localStorage.setItem('gd.theme', next);
  applyTheme(next);
};
$('#settings-cancel').onclick = () => (settingsModal.hidden = true);
settingsModal.querySelector('.modal-backdrop').onclick = () => (settingsModal.hidden = true);

$('#settings-save').onclick = async () => {
  const key = apiKeyInput.value.trim();
  const sys = sysPromptInput.value;
  try {
    await invoke('save_settings', { apiKey: key, systemPrompt: sys });
    state.apiKey = key;
    state.systemPrompt = sys;
    settingsModal.hidden = true;
    if (key) refreshModels();
  } catch (e) {
    toast('Failed to save settings: ' + e);
  }
};

$('#apikey-link').onclick = (e) => {
  e.preventDefault();
  const url = 'https://aistudio.google.com/apikey';
  if (shell && shell.open) shell.open(url).catch(() => copyText(url, null));
  else copyText(url, null);
};

modelBtn.onclick = (e) => {
  e.stopPropagation();
  modelMenu.hidden = !modelMenu.hidden;
};
document.addEventListener('click', (e) => {
  if (!modelMenu.hidden && !modelMenu.contains(e.target) && e.target !== modelBtn) {
    modelMenu.hidden = true;
  }
});

$('#attach-btn').onclick = () => fileInput.click();
fileInput.onchange = () => {
  attachFiles([...fileInput.files]);
  fileInput.value = '';
};

inputEl.addEventListener('input', () => {
  autosize();
  updateSendBtn();
});
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
inputEl.addEventListener('paste', (e) => {
  const items = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith('image/'));
  if (items.length) {
    e.preventDefault();
    attachFiles(items.map((i) => i.getAsFile()).filter(Boolean));
  }
});

sendBtn.onclick = sendMessage;
stopBtn.onclick = () => {
  state.abortFlag = true;
  const chat = activeChat();
  const msg = chat && chat.messages.find((m) => m.streaming);
  if (msg) finishStream(chat, msg, null, null);
  state.streaming = false;
  stopBtn.hidden = true;
  sendBtn.hidden = false;
  updateSendBtn();
};

/* ---------------- Init ---------------- */
(async function init() {
  applyTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
  renderSuggestions();
  renderModelMenu();
  renderAll();
  await loadSettings();
  if (state.apiKey) refreshModels();
  try {
    state.username = await invoke('get_username');
    if (state.username) $('#greeting-text').textContent = `Hello, ${state.username}`;
  } catch { /* keep default greeting */ }
  inputEl.focus();
})();
