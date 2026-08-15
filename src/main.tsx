import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initMonitoring } from '@/modules/monitoring';
import './index.css';

initMonitoring();

// Hors-ligne partiel (CDC §8) : coquille + assets en cache, données jamais.
// Production seulement — en dev, le service worker fausserait le rechargement.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* absence de SW = simple absence de hors-ligne, jamais bloquant */
    });
  });
}

const container = document.getElementById('root');
if (!container) throw new Error('Element racine introuvable');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
