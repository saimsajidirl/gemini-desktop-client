use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{ipc::Channel, AppHandle, Manager};

const API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta";

#[derive(Serialize, Deserialize, Default)]
struct AppConfig {
    api_key: String,
    #[serde(default)]
    system_prompt: String,
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

fn read_config(app: &AppHandle) -> Result<AppConfig, String> {
    let path = config_path(app)?;
    match std::fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str(&s).map_err(|e| e.to_string()),
        Err(_) => Ok(AppConfig::default()),
    }
}

fn write_config(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let json = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_settings(app: AppHandle) -> Result<serde_json::Value, String> {
    let cfg = read_config(&app)?;
    Ok(serde_json::json!({
        "apiKey": cfg.api_key,
        "systemPrompt": cfg.system_prompt,
    }))
}

#[tauri::command]
async fn save_settings(
    app: AppHandle,
    api_key: String,
    system_prompt: String,
) -> Result<(), String> {
    let cfg = AppConfig {
        api_key: api_key.trim().to_string(),
        system_prompt,
    };
    write_config(&app, &cfg)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelInfo {
    id: String,
    name: String,
    description: String,
    supports_thinking: bool,
}

#[tauri::command]
async fn list_models(app: AppHandle) -> Result<Vec<ModelInfo>, String> {
    let key = read_config(&app)?.api_key;
    if key.is_empty() {
        return Err("No API key configured. Open Settings to add one.".into());
    }

    let client = reqwest::Client::new();
    let mut models: Vec<ModelInfo> = Vec::new();
    let mut page_token = String::new();

    loop {
        let url = if page_token.is_empty() {
            format!("{API_BASE}/models?pageSize=100")
        } else {
            format!("{API_BASE}/models?pageSize=100&pageToken={page_token}")
        };
        let resp = client
            .get(&url)
            .header("x-goog-api-key", &key)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(api_error(resp.status().as_u16(), resp).await);
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        if let Some(items) = body["models"].as_array() {
            for m in items {
                let ok = m["supportedGenerationMethods"]
                    .as_array()
                    .map(|ms| ms.iter().any(|x| x.as_str() == Some("generateContent")))
                    .unwrap_or(false);
                if !ok {
                    continue;
                }
                let id = m["name"]
                    .as_str()
                    .unwrap_or_default()
                    .trim_start_matches("models/")
                    .to_string();
                if id.is_empty() {
                    continue;
                }
                let name = m["displayName"].as_str().unwrap_or(&id).to_string();
                let description = m["description"].as_str().unwrap_or("").to_string();
                let supports_thinking = (id.contains("gemini-3") || id.contains("thinking"))
                    && !id.contains("image")
                    && !id.contains("tts")
                    && !id.contains("live");
                models.push(ModelInfo {
                    id,
                    name,
                    description,
                    supports_thinking,
                });
            }
        }
        match body["nextPageToken"].as_str() {
            Some(t) if !t.is_empty() => page_token = t.to_string(),
            _ => break,
        }
    }

    // Prefer chat-oriented models first, alphabetical otherwise.
    models.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(models)
}

async fn api_error(status: u16, resp: reqwest::Response) -> String {
    let text = resp.text().await.unwrap_or_default();
    let msg = serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|v| v["error"]["message"].as_str().map(String::from))
        .unwrap_or_else(|| text.clone());
    format!("HTTP {status}: {msg}")
}

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum StreamEvent {
    Started,
    Delta { text: String, thought: bool },
    Media { mime_type: String, data: String },
    Finished { finish_reason: Option<String> },
    Error { message: String },
}

#[tauri::command]
async fn send_message(
    app: AppHandle,
    channel: Channel<StreamEvent>,
    model: String,
    contents: serde_json::Value,
    include_thoughts: bool,
) -> Result<(), String> {
    let cfg = read_config(&app)?;
    if cfg.api_key.is_empty() {
        return Err("No API key configured. Open Settings to add one.".into());
    }

    let mut body = serde_json::json!({ "contents": contents });
    if !cfg.system_prompt.trim().is_empty() {
        body["systemInstruction"] = serde_json::json!({
            "parts": [{ "text": cfg.system_prompt }]
        });
    }
    if include_thoughts {
        body["generationConfig"] = serde_json::json!({
            "thinkingConfig": { "includeThoughts": true }
        });
    }
    if model.contains("image") || model.contains("banana") {
        body["generationConfig"]["responseModalities"] =
            serde_json::json!(["TEXT", "IMAGE"]);
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(format!(
            "{API_BASE}/models/{model}:streamGenerateContent?alt=sse"
        ))
        .header("x-goog-api-key", &cfg.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(api_error(resp.status().as_u16(), resp).await);
    }

    let _ = channel.send(StreamEvent::Started);

    let mut stream = resp.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buf.find('\n') {
            let line: String = buf.drain(..=pos).collect();
            let line = line.trim();
            let Some(data) = line.strip_prefix("data:") else {
                continue;
            };
            let data = data.trim();
            if data.is_empty() || data == "[DONE]" {
                continue;
            }
            let Ok(v) = serde_json::from_str::<serde_json::Value>(data) else {
                continue;
            };

            if let Some(err) = v["error"]["message"].as_str() {
                let _ = channel.send(StreamEvent::Error {
                    message: err.to_string(),
                });
                continue;
            }

            if let Some(cands) = v["candidates"].as_array() {
                for c in cands {
                    if let Some(parts) = c["content"]["parts"].as_array() {
                        for p in parts {
                            if let Some(text) = p["text"].as_str() {
                                let thought = p["thought"].as_bool().unwrap_or(false);
                                if channel
                                    .send(StreamEvent::Delta {
                                        text: text.to_string(),
                                        thought,
                                    })
                                    .is_err()
                                {
                                    return Ok(());
                                }
                            } else if let Some(data) = p["inlineData"]["data"].as_str() {
                                let mime = p["inlineData"]["mimeType"]
                                    .as_str()
                                    .unwrap_or("application/octet-stream")
                                    .to_string();
                                if channel
                                    .send(StreamEvent::Media {
                                        mime_type: mime,
                                        data: data.to_string(),
                                    })
                                    .is_err()
                                {
                                    return Ok(());
                                }
                            }
                        }
                    }
                    if let Some(fr) = c["finishReason"].as_str() {
                        let _ = channel.send(StreamEvent::Finished {
                            finish_reason: Some(fr.to_string()),
                        });
                    }
                }
            }
        }
    }

    let _ = channel.send(StreamEvent::Finished {
        finish_reason: None,
    });
    Ok(())
}

#[tauri::command]
async fn get_username() -> Result<String, String> {
    let name = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_default();
    if name.is_empty() {
        return Ok(String::new());
    }
    let mut chars = name.chars();
    Ok(match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => name,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            list_models,
            send_message,
            get_username,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
