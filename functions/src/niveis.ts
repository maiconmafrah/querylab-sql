// Cópia mínima de src/lib/niveis.ts: só a parte de sequência de dias, que a função de lembrete
// precisa. Fica duplicada porque o deploy de Functions empacota só esta pasta — mantenha as duas
// em sincronia se a regra de sequência mudar.

export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
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
