# Gemini Desktop

A fast, native desktop client for Google's Gemini — built with **Tauri 2 + Rust**.

## Why this exists

Google never shipped a desktop app for Gemini. Your options today are the
browser tab, or "wrapping" `gemini.google.com` inside an Electron shell or PWA
shortcut — which ships an entire second browser, eats RAM, and is nowhere near
optimized.

This app takes the opposite approach:

- **Rust backend** — native binary, no Node runtime, no bundled Chromium.
  All Gemini API traffic (model listing, SSE streaming) happens in Rust with
  `reqwest`, streaming tokens straight to the UI over Tauri's IPC channel.
- **Vanilla frontend** — hand-written HTML/CSS/JS with **zero bundler and zero
  framework**. The entire UI is a few files; it loads instantly and uses a
  fraction of the memory an Electron wrapper would.
- **System webview** — Tauri uses the OS-native webview (WebKitGTK/WebKit/
  WebView2), so the app is megabytes, not hundreds of megabytes.

The result is about as fast as a desktop chat client can get — and it already
does everything the Gemini website does, plus things it doesn't.

## Features

- **Streaming responses** — token-by-token via `streamGenerateContent` SSE
- **Full model picker** — Gemini 3.x chat models, agent models, image
  generation (Nano Banana family), TTS/audio, and video models, grouped and
  badged — powered by live `list_models`
- **Thinking support** — collapsible "Show thinking" blocks for Gemini 3
  reasoning models (`includeThoughts`)
- **Image input** — attach or paste images into prompts
- **Image & audio output** — generated images render inline; TTS/audio models
  get an audio player; other media downloads as a chip
- **Message actions** — edit & resend, resend, and copy on your messages;
  regenerate and copy on model replies
- **Chat history** — sidebar with recent chats, persisted locally, deletable
- **Markdown rendering** — GFM with syntax-highlighted code blocks + copy buttons
- **Light & dark themes** — minimal 2027-style UI, follows system preference,
  one-click toggle
- **System instructions** — optional system prompt in Settings
- **Private** — your API key stays on disk in the app config dir; requests go
  directly from your machine to Google, no middleman

## Getting started

### Prerequisites

- [Rust](https://rustup.rs) (1.77+)
- [Node.js](https://nodejs.org) 18+ (only for the Tauri CLI)
- **Linux**: `webkit2gtk-4.1`, `gtk3`, `libsoup3`, `openssl`, `libappindicator`
  - Fedora: `sudo dnf install webkit2gtk4.1-devel gtk3-devel libsoup3-devel openssl-devel libappindicator-gtk3-devel`
  - Ubuntu/Debian: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev libssl-dev libayatana-appindicator3-dev`

### Run

```bash
npm install
npm run dev        # builds the Rust backend and launches the app
```

Or run the compiled binary directly:

```bash
./src-tauri/target/debug/gemini-desktop
```

### Release build

```bash
npm run build      # produces native installers via tauri build
```

### First run

1. The app opens **Settings** automatically — paste a Gemini API key
   ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))
2. Optionally set system instructions
3. Pick a model from the top-left selector and start chatting

Settings are stored in the app config dir
(`~/.config/com.geminidesktop.app/config.json` on Linux). Chats live in
webview localStorage.

## Project structure

```
src/                  frontend — vanilla HTML/CSS/JS, no build step
  index.html
  styles.css          minimal light/dark theme system (CSS variables)
  app.js              state, chat, streaming, model picker, themes
  vendor/             marked + highlight.js (vendored)
src-tauri/
  src/lib.rs          Tauri commands: settings, list_models, send_message (SSE)
  tauri.conf.json
  capabilities/       IPC permissions
gen_icon.py           regenerates the app icon
```

## Roadmap

The goal isn't just parity with gemini.google.com — it's a better client:

- [ ] Global hotkey / quick-open window
- [ ] Multi-profile API keys
- [ ] File attachments beyond images (PDF, text)
- [ ] Export chats (Markdown/JSON)
- [ ] Search across chat history
- [ ] Proper video/audio model endpoints where supported

## Notes

- Models like Veo, Lyria, and the Live/Robotics family appear in the picker but
  use non-`generateContent` endpoints — selecting them will surface an API error
  until dedicated endpoint support lands.
- Chats with many large image attachments may hit the localStorage quota;
  moving history to a Rust-side store is planned.
