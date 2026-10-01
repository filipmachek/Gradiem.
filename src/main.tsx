import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWAUpdater } from './services/pwaUpdater.ts';

// Initialize PWA auto-updater for mobile devices and home screen installs
initPWAUpdater();

// Prevent iOS Safari pinch-to-zoom gesture and double-tap zoom so it behaves 100% like a native app
if (typeof window !== 'undefined') {
  // Prevent gesture zoom (pinch gesture on iOS Safari)
  document.addEventListener('gesturestart', (e: Event) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gesturechange', (e: Event) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gestureend', (e: Event) => {
    e.preventDefault();
  }, { passive: false });

  // Prevent double-tap to zoom on iOS
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
