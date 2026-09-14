import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './estilos/base.css';
import './estilos/layout.css';
import './estilos/componentes.css';
import './estilos/missao.css';
import './estilos/paginas.css';
import './estilos/prova.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Começa a baixar o DuckDB em segundo plano para as missões abrirem mais rápido.
const aquecerBanco = () =>
  void import('./db/ambiente.ts').then((modulo) => modulo.obterBanco()).catch(() => undefined);
if ('requestIdleCallback' in window) window.requestIdleCallback(aquecerBanco);
else setTimeout(aquecerBanco, 1500);
