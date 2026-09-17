import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Carregando } from './componentes/comum.tsx';
import { Shell } from './componentes/Shell.tsx';
import { Catalogo } from './paginas/Catalogo.tsx';
import { Inicio } from './paginas/Inicio.tsx';
import { NaoEncontrado } from './paginas/NaoEncontrado.tsx';
import { Perfil } from './paginas/Perfil.tsx';
import { Progresso } from './paginas/Progresso.tsx';
import { Ranking } from './paginas/Ranking.tsx';
import { Referencia } from './paginas/Referencia.tsx';
import { Resultado } from './paginas/Resultado.tsx';
import { Simulados } from './paginas/Simulados.tsx';
import { PaginaTrilha, Trilhas } from './paginas/Trilhas.tsx';

// Páginas com banco de dados e editor carregam sob demanda (DuckDB e CodeMirror são pesados).
const PaginaMissao = lazy(() => import('./paginas/Missao.tsx').then((m) => ({ default: m.PaginaMissao })));
const Playground = lazy(() => import('./paginas/Playground.tsx').then((m) => ({ default: m.Playground })));
const PaginaProva = lazy(() => import('./paginas/Prova.tsx').then((m) => ({ default: m.PaginaProva })));

function SobDemanda({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="pagina">
          <Carregando texto="Abrindo…" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        {/* A prova ocupa a tela inteira, sem o menu lateral. */}
        <Route
          path="/simulados/:id/prova"
          element={
            <SobDemanda>
              <PaginaProva />
            </SobDemanda>
          }
        />
        <Route element={<Shell />}>
          <Route index element={<Inicio />} />
          <Route path="treinamentos" element={<Catalogo />} />
          <Route
            path="treinamentos/:id"
            element={
              <SobDemanda>
                <PaginaMissao />
              </SobDemanda>
            }
          />
          <Route path="trilhas" element={<Trilhas />} />
          <Route path="trilhas/:id" element={<PaginaTrilha />} />
          <Route path="simulados" element={<Simulados />} />
          <Route path="simulados/:id/resultado/:tentativa" element={<Resultado />} />
          <Route
            path="playground"
            element={
              <SobDemanda>
                <Playground />
              </SobDemanda>
            }
          />
          <Route path="referencia" element={<Referencia />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="ranking/:uid" element={<Perfil />} />
          <Route path="progresso" element={<Progresso />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
