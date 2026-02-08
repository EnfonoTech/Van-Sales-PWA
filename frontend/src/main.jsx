import { createRoot } from 'react-dom/client'
import React from 'react';
import { registerSW } from 'virtual:pwa-register';
import './index.css'
import App from './App.jsx'

// Register service worker only in production
// In development, unregister any existing service workers to avoid conflicts with proxy
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Show update notification
      if (confirm('New version available! Click OK to update.')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
    },
    onRegistered(registration) {
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    }
  });
} else {
  // In development, unregister any existing service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().then(() => {
        });
      });
    });
  }
}

import { HashRouter } from 'react-router-dom'

// HashRouter so the PWA works when served from fateh_pwa app at /pwa or /assets/fateh_pwa/pwa/
// Routes become #/dashboard, #/login, etc. (no server config needed for /pwa/dashboard)
createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App/>
  </HashRouter>
)
