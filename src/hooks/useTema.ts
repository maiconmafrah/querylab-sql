import { useCallback, useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro';

const CHAVE_TEMA = 'querylab:tema';

function lerTemaInicial(): Tema {
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro';
}

/** Tema claro/escuro aplicado via atributo data-tema na raiz, persistido em localStorage. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(lerTemaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'escuro' ? '#1b1a17' : '#f6f4ee');
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      // ignora
    }
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((atual) => (atual === 'escuro' ? 'claro' : 'escuro'));
  }, []);

  return { tema, alternar };
}
