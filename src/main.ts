import '@fontsource/press-start-2p/400.css';
import './style.css';
import { App } from './app';
import { loadPlayerData } from './data';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  try {
    const data = await loadPlayerData();
    const app = new App(root, data);
    app.showTitle();
  } catch (err) {
    console.error(err);
    root.innerHTML =
      '<div class="dialogue px-box"><p class="dialogue__text">ERROR: COULD NOT LOAD PLAYER DATA. PLEASE RELOAD.</p></div>';
  }
}

/** Service worker: installable app + offline play. Only in production builds. */
function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((err: unknown) => {
      console.warn('[HOOPDLE] Service worker registration failed', err);
    });
  });
}

registerServiceWorker();
void boot();
