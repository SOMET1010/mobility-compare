import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initMonitoring } from '@/modules/monitoring';
import './index.css';

initMonitoring();

const container = document.getElementById('root');
if (!container) throw new Error('Element racine introuvable');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
