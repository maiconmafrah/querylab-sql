// Regras de XP, níveis e sequência de dias. Sem dependências do navegador.

export const TITULOS_NIVEL = [
  'Primeiro SELECT',
  'Filtro afiado',
  'Agregação em dia',
  'Olho nos NULLs',
  'JOIN sem medo',
  'Faro para dados',
  'Pipeline em ordem',
  'Consulta impecável',
  'Lenda do SQL',
];

/** XP total necessário para chegar ao nível (nível 1 = 0, 2 = 200, 3 = 600, 4 = 1200...). */
export function xpParaNivel(nivel: number): number {
  return 100 * (nivel - 1) * nivel;
}

export interface InfoNivel {
  nivel: number;
  titulo: string;
  xpInicio: number;
  xpProximo: number;
  progresso: number;
}

export function infoNivel(xp: number): InfoNivel {
  let nivel = 1;
  while (xp >= xpParaNivel(nivel + 1)) nivel++;
  const xpInicio = xpParaNivel(nivel);
  const xpProximo = xpParaNivel(nivel + 1);
  return {
    nivel,
    titulo: TITULOS_NIVEL[Math.min(nivel, TITULOS_NIVEL.length) - 1],
    xpInicio,
    xpProximo,
    progresso: (xp - xpInicio) / (xpProximo - xpInicio),
  };
}

/** XP de um checkpoint: cada dica custa 10 XP, mas nunca abaixo de 40% do valor. */
export function xpCheckpoint(xpBase: number, dicasUsadas: number): number {
  return Math.max(Math.round(xpBase * 0.4), xpBase - dicasUsadas * 10);
}

/** Data local no formato AAAA-MM-DD. */
export function dataLocal(data = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return dataLocal(new Date(ano, mes - 1, dia + dias));
}

/** Dias seguidos com estudo, terminando hoje (ou ontem, se ainda não estudou hoje). */
export function calcularSequencia(dias: Iterable<string>, hoje: string): number {
  const estudados = new Set(dias);
  let cursor = estudados.has(hoje) ? hoje : somarDias(hoje, -1);
  let sequencia = 0;
  while (estudados.has(cursor)) {
    sequencia++;
    cursor = somarDias(cursor, -1);
  }
  return sequencia;
}

export function ultimosDias(hoje: string, quantidade = 7): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarDias(hoje, i - quantidade + 1));
}

const INICIAIS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function inicialDiaSemana(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return INICIAIS_SEMANA[new Date(ano, mes - 1, dia).getDay()];
}
