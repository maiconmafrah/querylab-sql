// Regras de status, desbloqueio e progresso derivadas do conteúdo + progresso do aluno.
import type { Progresso, TentativaSimulado } from '../estado/progresso.ts';
import { dataLocal, somarDias } from '../lib/niveis.ts';
import type { Simulado, Treinamento, Trilha } from '../tipos.ts';
import { buscarSimulado, buscarTreinamento, simulados, treinamentos, trilhaDaMissao } from './index.ts';

export type StatusMissao = 'concluida' | 'andamento' | 'disponivel' | 'bloqueada';

export const ROTULOS_STATUS: Record<StatusMissao, string> = {
  concluida: 'Concluída',
  andamento: 'Em andamento',
  disponivel: 'Disponível',
  bloqueada: 'Bloqueada',
};

/** Dias em que um conteúdo recém-publicado aparece como "Nova". */
const DIAS_NOVIDADE = 14;

export function ehNovo(publicadoEm: string, hoje = dataLocal()): boolean {
  return publicadoEm >= somarDias(hoje, -DIAS_NOVIDADE) && publicadoEm <= hoje;
}

export function xpTotalMissao(treinamento: Treinamento): number {
  return treinamento.checkpoints.reduce((soma, checkpoint) => soma + checkpoint.xp, 0);
}

export function xpGanhoMissao(id: string, progresso: Progresso): number {
  return Object.values(progresso.missoes[id]?.checkpoints ?? {}).reduce((soma, c) => soma + c.xp, 0);
}

export function checkpointsConcluidos(id: string, progresso: Progresso): number {
  return Object.keys(progresso.missoes[id]?.checkpoints ?? {}).length;
}

/** Missões que precisam ser concluídas antes desta (a anterior na trilha + "requer"). */
export function requisitosPendentes(treinamento: Treinamento, progresso: Progresso): Treinamento[] {
  if (progresso.modoLivre) return [];
  const ids = new Set(treinamento.requer ?? []);
  const trilha = trilhaDaMissao(treinamento.id);
  if (trilha) {
    const posicao = trilha.missoes.indexOf(treinamento.id);
    if (posicao > 0) ids.add(trilha.missoes[posicao - 1]);
  }
  return [...ids]
    .filter((id) => !progresso.missoes[id]?.concluidaEm)
    .map((id) => buscarTreinamento(id))
    .filter((t): t is Treinamento => t !== undefined);
}

export function statusMissao(treinamento: Treinamento, progresso: Progresso): StatusMissao {
  const missao = progresso.missoes[treinamento.id];
  if (missao?.concluidaEm) return 'concluida';
  if (missao) return 'andamento';
  return requisitosPendentes(treinamento, progresso).length > 0 ? 'bloqueada' : 'disponivel';
}

/** A missão para continuar: a última aberta, senão qualquer uma em andamento, senão a próxima disponível. */
export function proximaMissao(progresso: Progresso): Treinamento | undefined {
  const ultima = progresso.ultimaMissao ? buscarTreinamento(progresso.ultimaMissao) : undefined;
  if (ultima && statusMissao(ultima, progresso) === 'andamento') return ultima;
  return (
    treinamentos.find((t) => statusMissao(t, progresso) === 'andamento') ??
    treinamentos.find((t) => statusMissao(t, progresso) === 'disponivel')
  );
}

export function tentativasSimulado(id: string, progresso: Progresso): TentativaSimulado[] {
  return progresso.simulados[id]?.tentativas ?? [];
}

export function melhorTentativa(id: string, progresso: Progresso): TentativaSimulado | undefined {
  return tentativasSimulado(id, progresso).reduce<TentativaSimulado | undefined>(
    (melhor, t) => (!melhor || t.nota > melhor.nota ? t : melhor),
    undefined,
  );
}

export function simuladoAprovado(simulado: Simulado, progresso: Progresso): boolean {
  return tentativasSimulado(simulado.id, progresso).some((t) => t.nota >= simulado.nota_minima);
}

/** Primeiro simulado com prova em andamento; senão o primeiro ainda não aprovado. */
export function proximoSimulado(progresso: Progresso): Simulado | undefined {
  return (
    simulados.find((s) => progresso.simulados[s.id]?.emAndamento) ??
    simulados.find((s) => !simuladoAprovado(s, progresso))
  );
}

export interface ResumoTrilha {
  concluidas: number;
  total: number;
  xp: number;
  xpTotal: number;
  simulado?: Simulado;
}

export function resumoTrilha(trilha: Trilha, progresso: Progresso): ResumoTrilha {
  const missoes = trilha.missoes.map((id) => buscarTreinamento(id)).filter((t): t is Treinamento => t !== undefined);
  return {
    concluidas: missoes.filter((t) => progresso.missoes[t.id]?.concluidaEm).length,
    total: missoes.length,
    xp: missoes.reduce((soma, t) => soma + xpGanhoMissao(t.id, progresso), 0),
    xpTotal: missoes.reduce((soma, t) => soma + xpTotalMissao(t), 0),
    simulado: trilha.simulado_final ? buscarSimulado(trilha.simulado_final) : undefined,
  };
}
