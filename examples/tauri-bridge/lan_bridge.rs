// Reference skeleton only: not registered or built by the current Electron app.
// The existing protocol uses a short-lived TCP listener, not UDP discovery.
// Port LanBridge's length limits, random secret, timeout, and lifecycle before
// wiring these commands into a real Tauri project. Never expose credentials.
#[tauri::command]
async fn lan_start_host(_offer: String) -> Result<String, String> {
    Err("Tauri 局域网桥接尚未实现，请使用服务器房间".into())
}

#[tauri::command]
async fn lan_get_offer(_code: String) -> Result<String, String> {
    Err("Tauri 局域网桥接尚未实现，请使用服务器房间".into())
}

// Clipboard: use tauri-plugin-clipboard-manager with the minimum write
// permission in the capability file. Do not grant read access unless required.
