import { useEffect } from 'react';

export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · querylab` : 'querylab · treine SQL resolvendo incidentes de dados';
  }, [titulo]);
}
