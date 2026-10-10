import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useApp } from './store/appStore';
import './styles/global.css';
import './styles/app.css';

// Восстанавливаем сессию и чаты до первого рендера, чтобы не мигала форма входа.
useApp.getState().restore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
