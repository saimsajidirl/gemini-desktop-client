# Gemini Desktop

A desktop Gemini client built with Tauri 2 + Rust. UI mimics gemini.google.com (dark theme).

## Commands

- `npm install` — install the Tauri CLI (only dev dependency; frontend has no bundler)
- `npm run dev` / `npx tauri dev` — run the app in dev mode
- `npm run build` / `npx tauri build` — produce a release bundle
- `cd src-tauri && cargo check` — type-check the Rust backend

## Structure

- `src/` — frontend (vanilla HTML/CSS/JS, no build step)
  - `index.html`, `styles.css`, `app.js`
  - `vendor/` — vendored marked.min.js + highlight.min.js (downloaded from CDN)
- `src-tauri/` — Rust backend
  - `src/lib.rs` — Tauri commands: `get_settings`, `save_settings`, `list_models`, `send_message` (SSE streaming over `tauri::ipc::Channel`), `get_username`
  - `capabilities/default.json` — `core:default` + `shell:allow-open`

## Notes

- API key + system prompt are stored by the Rust side in `app_config_dir()/config.json` (on Linux: `~/.config/com.geminidesktop.app/config.json`).
- The model list is fetched live from `GET /v1beta/models` (filtered to `generateContent` support); a static fallback list is used if the call fails.
- Responses stream via `streamGenerateContent?alt=sse`; `x-goog-api-key` header is used for auth.
- Chats are persisted in webview localStorage (`gd.chats`, `gd.model`).
- `gen_icon.py` regenerates `icon-src.png`; re-run `npx tauri icon icon-src.png` to refresh `src-tauri/icons/`.
