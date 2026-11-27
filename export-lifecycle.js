// Telegram may retain a minimized webview. Treat loss of activity during an
// export as abandonment, rather than resuming stale decoder/upload promises.
export function watchExportLifecycle(telegram,abandon){
  let fired=false;
  const stop=()=>{if(fired)return;fired=true;abandon();};
  const visibility=()=>{if(document.visibilityState==='hidden')stop();};
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pagehide',stop);
  document.addEventListener('freeze',stop);
  const native=telegram?.isVersionAtLeast?.('8.0');if(native)telegram.onEvent('deactivated',stop);
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',stop);document.removeEventListener('freeze',stop);if(native)telegram.offEvent('deactivated',stop);};
}
