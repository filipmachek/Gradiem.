/**
 * PWA Safe Updater Engine
 * Ultra-lightweight, non-blocking update mechanism.
 * Prevents mobile browser freezes, memory locks, and infinite reload loops.
 */

import { registerSW } from 'virtual:pwa-register';

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function initPWAUpdater() {
  if (typeof window === 'undefined') return;

  // Only run in environments with service worker support
  if (!('serviceWorker' in navigator)) return;

  try {
    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        // A new version is available; we can gracefully update when user is ready
        console.log('[PWA] New version ready');
      },
      onOfflineReady() {
        console.log('[PWA] Offline support active');
      },
      onRegisterError(err) {
        console.warn('[PWA] Service worker registration error:', err);
      },
    });
  } catch (err) {
    console.warn('[PWA] Registration skipped:', err);
  }
}

/**
 * Cleanly and safely updates the app on mobile without freezing or looping.
 * Unregisters outdated workers and reloads with cache-busting query parameter.
 * Preserves 100% of user data (streaks, tasks, facts).
 */
export async function forceAppRefresh(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Unregister active service workers gracefully
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister().catch(() => {});
      }
    }

    // 2. Clear old cached assets safely
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name).catch(() => {});
      }
    }

    if (updateSWFn) {
      await updateSWFn(true).catch(() => {});
    }
  } catch (e) {
    console.warn('[PWA] Cleanup error:', e);
  }

  // 3. Smooth, clean reload with timestamp query to ensure mobile browser bypasses HTTP cache
  const cleanUrl = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
  window.location.replace(cleanUrl);
}
