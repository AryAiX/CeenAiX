import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { startAppStatusBarSync } from './lib/app-status-bar';
import './i18n';
import './index.css';

// Inside the phone app, keep the strip behind the clock dimmed while a sheet or the menu is open (QA-102).
startAppStatusBarSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
