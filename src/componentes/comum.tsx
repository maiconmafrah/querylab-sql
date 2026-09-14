import { NOMES_DIFICULDADE } from '../conteudo/index.ts';
import type { Dificuldade } from '../tipos.ts';

export function Carregando({ texto }: { texto: string }) {
  return (
    <div className="estado-painel" role="status">
      <span className="girando" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

interface BarraProps {
  /** De 0 a 1. */
  valor: number;
  cor?: 'amarelo' | 'lilas';
  rotulo: string;
  className?: string;
}

export function BarraProgresso({ valor, cor = 'amarelo', rotulo, className = '' }: BarraProps) {
  const porcentagem = Math.round(Math.max(0, Math.min(1, valor)) * 100);
  const classes = [
    'barra',
    cor === 'lilas' ? 'barra--lilas' : '',
    porcentagem >= 100 ? 'barra--cheia' : '',
    porcentagem === 0 ? 'barra--vazia' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentagem}>
      <div className="barra__preenchimento" style={{ width: `${porcentagem}%` }} />
    </div>
  );
}

export function TagDificuldade({ dificuldade }: { dificuldade: Dificuldade }) {
  return <span className="tag">{NOMES_DIFICULDADE[dificuldade]}</span>;
}

/** Pílulas de progresso dos checkpoints de uma missão. */
export function Segmentos({ total, feitos }: { total: number; feitos: number }) {
  return (
    <span className="segmentos" aria-label={`${feitos} de ${total} checkpoints concluídos`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < feitos ? 'segmentos__item segmentos__item--feito' : 'segmentos__item'} />
      ))}
    </span>
  );
}

export const TECLA_ATALHO =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
