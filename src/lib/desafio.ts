// Escolha do desafio do dia: mesma data, mesmo desafio para todo mundo.
import type { QuestaoMultipla } from '../tipos.ts';

export const XP_DESAFIO_DIARIO = 25;

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}

export function desafioDoDia(data: string, lista: QuestaoMultipla[]): QuestaoMultipla | null {
  if (lista.length === 0) return null;
  return lista[hash(data) % lista.length]!;
}
