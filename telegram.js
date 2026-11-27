const launchParameters = new URLSearchParams(location.hash.slice(1));
const launchedInTelegram = launchParameters.has('tgWebAppData') || Boolean(window.Telegram?.WebApp?.initData);
let opening;

export function connectTelegram() {
  if (!launchedInTelegram) return Promise.resolve(null);
  opening ??= new Promise((resolve, reject) => {
    function ready() {
      const app = window.Telegram?.WebApp;
      if (!app?.initData) { reject(new Error('Telegram launch unavailable')); return; }
      function layout() {
        for (const side of ['top', 'right', 'bottom', 'left']) {
          const value = (app.safeAreaInset?.[side] ?? 0) + (app.contentSafeAreaInset?.[side] ?? 0);
          document.documentElement.style.setProperty('--safe-' + side, value + 'px');
        }
        const height = app.isFullscreen ? window.innerHeight : app.viewportStableHeight || window.innerHeight;
        document.documentElement.style.setProperty('--tg-height', height + 'px');
      }
      layout();
      for (const name of ['safeAreaChanged', 'contentSafeAreaChanged', 'viewportChanged', 'fullscreenChanged']) app.onEvent(name, layout);
      if (app.isVersionAtLeast('6.1')) {
        app.setHeaderColor('#000000');
        app.setBackgroundColor('#000000');
      }
      app.expand();
      if (app.isVersionAtLeast('8.0') && ['ios', 'android'].includes(app.platform)) {
        app.requestFullscreen();
        app.disableVerticalSwipes?.();
      }
      resolve(app);
    }
    if (window.Telegram?.WebApp) { ready(); return; }
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.onload = ready;
    script.onerror = () => reject(new Error('Telegram could not load. Reopen the app.'));
    document.head.append(script);
  }).catch(error=>{opening=null;throw error;});
  return opening;
}

export async function authenticateTelegram(app) {
  const response = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: app.initData }),
    credentials: 'same-origin',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Telegram sign-in unavailable');
  if(!/^\d+$/.test(String(data.user?.id??'')))throw new Error('Telegram sign-in unavailable');
  return data.user;
}

