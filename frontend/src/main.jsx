import { createRoot } from 'react-dom/client'
import React from 'react';
import './index.css'
import App from './App.jsx'

// Register service worker with explicit scope /pwa.
// The Frappe after_request hook adds Service-Worker-Allowed: /pwa so this is permitted.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/assets/fateh_pwa/pwa/sw.js', { scope: '/pwa' })
      .then((registration) => {
        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.onstatechange = () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('New version available! Click OK to update.')) {
                window.location.reload();
              }
            }
          };
        };
      })
      .catch((err) => console.error('Service Worker registration error:', err));
  });
} else if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
  // In development, unregister stale service workers
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

import { BrowserRouter } from 'react-router-dom'

// BrowserRouter for clean URLs (pwa/quotations instead of #/quotations)
// Basename matches the app's base path
const basename = import.meta.env.VITE_APP_BASE_PATH || '/assets/fateh_pwa/pwa';
createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={basename}>
    <App/>
  </BrowserRouter>
)
