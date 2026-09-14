import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  acoes?: ReactNode;
  topo?: ReactNode;
}

export function Modal({ aberto, aoFechar, titulo, children, acoes, topo }: Props) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const aoFecharAtual = useRef(aoFechar);
  aoFecharAtual.current = aoFechar;

  useEffect(() => {
    if (!aberto) return;
    const focoAnterior = document.activeElement as HTMLElement | null;
    const focavel =
      caixa.current?.querySelector<HTMLElement>('[data-foco-inicial]') ??
      caixa.current?.querySelector<HTMLElement>('button, a[href], input');
    focavel?.focus();

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFecharAtual.current();
    };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
      focoAnterior?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;

  return createPortal(
    <div
      className="modal-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={id} ref={caixa}>
        {topo}
        <h2 className="modal__titulo" id={id}>
          {titulo}
        </h2>
        <div className="modal__corpo">{children}</div>
        {acoes && <div className="modal__acoes">{acoes}</div>}
      </div>
    </div>,
    document.body,
  );
}
