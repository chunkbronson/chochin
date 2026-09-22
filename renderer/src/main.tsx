import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

window.addEventListener('error', (e) => {
  try {
    window.komorebi?.log(`RENDER ERROR: ${e.message}\n${e.error?.stack ?? ''}`);
  } catch {
    /* ignore */
  }
});

window.addEventListener('unhandledrejection', (e) => {
  try {
    const r = e.reason as { stack?: string } | undefined;
    window.komorebi?.log(`UNHANDLED REJECTION: ${String(r?.stack ?? r)}`);
  } catch {
    /* ignore */
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);