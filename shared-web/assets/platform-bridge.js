/* Platform adapters preserve the existing native protocols and their return values. */
window.GamePlatform=(()=>{
 const android=!!window.AppAudio||(/Android/i.test(navigator.userAgent)&&!!window.LanBridge);
 const ios=!!window.webkit?.messageHandlers?.lan;
 const electron=!!window.ServerMode&&!android&&!ios;
 const tauri=!!window.__TAURI_INTERNALS__;
 const kind=android?'android':ios?'ios':tauri?'tauri':electron?'electron':'browser';
 document.body.dataset.platform=kind;
 return Object.freeze({kind,haptic(){try{if(window.AppHaptics?.tap)window.AppHaptics.tap();else if(navigator.vibrate)navigator.vibrate(8)}catch{}},hasLan:()=>!!window.LanBridge,hasServerMode:()=>!!window.ServerMode,
  async copy(text){try{if(window.AppClipboard?.copy(String(text)))return true;if(window.__TAURI__?.clipboardManager?.writeText){await window.__TAURI__.clipboardManager.writeText(String(text));return true}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(String(text));return true}}catch{}return false},
  async lan(method,...args){if(!window.LanBridge||typeof window.LanBridge[method]!=='function')throw Error('当前设备没有局域网桥接，请使用服务器房间');return await window.LanBridge[method](...args)},
  async openLegacyServer(url){if(!window.ServerMode?.open)throw Error('请在应用顶部选择服务器模式');return await window.ServerMode.open(url)}
 });
})();
