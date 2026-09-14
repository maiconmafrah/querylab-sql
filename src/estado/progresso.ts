// Progresso do aluno, guardado no navegador (localStorage).
import { useSyncExternalStore } from 'react';
import { dataLocal, xpCheckpoint } from '../lib/niveis.ts';

const CHAVE = 'querylab:progresso:v1';
const PREFIXO_CONSULTA = 'querylab:consulta:';

export interface ProgressoCheckpoint {
  concluidoEm: string;
  xp: number;
  dicas: number;
}

export interface ProgressoMissao {
  iniciadaEm: string;
  atualizadaEm: string;
  /** Chave: índice do checkpoint. */
  checkpoints: Record<string, ProgressoCheckpoint>;
  /** Quantas dicas foram abertas em cada checkpoint. */
  dicas: Record<string, number>;
  concluidaEm?: string;
}

/** Índice da alternativa (questão de múltipla escolha) ou texto SQL (questão de SQL). */
export type RespostaQuestao = number | string | null;

export interface ProvaEmAndamento {
  iniciadaEm: string;
  respostas: Record<string, RespostaQuestao>;
  marcadas: string[];
  atual: number;
}

export interface TentativaSimulado {
  id: string;
  iniciadaEm: string;
  entregueEm: string;
  duracaoS: number;
  respostas: Record<string, RespostaQuestao>;
  corretas: Record<string, boolean>;
  acertos: number;
  total: number;
  nota: number;
  xp: number;
}

export interface ProgressoSimulado {
  tentativas: TentativaSimulado[];
  emAndamento?: ProvaEmAndamento;
}

export interface Progresso {
  versao: 1;
  xp: number;
  /** Dias (AAAA-MM-DD) com alguma atividade. */
  dias: string[];
  missoes: Record<string, ProgressoMissao>;
  simulados: Record<string, ProgressoSimulado>;
  modoLivre: boolean;
  ultimaMissao?: string;
}

function progressoVazio(): Progresso {
  return { versao: 1, xp: 0, dias: [], missoes: {}, simulados: {}, modoLivre: false };
}

function lerArmazenado(): Progresso {
  try {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) return progressoVazio();
    const dados = JSON.parse(texto) as Partial<Progresso>;
    if (dados.versao !== 1) return progressoVazio();
    return { ...progressoVazio(), ...dados };
  } catch {
    return progressoVazio();
  }
}

let estado = lerArmazenado();
const ouvintes = new Set<() => void>();

function publicar(novo: Progresso) {
  estado = novo;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(novo));
  } catch {
    // Sem armazenamento (aba anônima, cota cheia): o progresso vale só nesta sessão.
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

function atualizar(alteracao: (atual: Progresso) => Progresso) {
  publicar(alteracao(estado));
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Para quem precisa reagir a qualquer mudança fora de componentes React (ex.: sincronização). */
export const assinarProgresso = assinar;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (evento) => {
    if (evento.key === CHAVE) {
      estado = lerArmazenado();
      ouvintes.forEach((ouvinte) => ouvinte());
    }
  });
}

export function useProgresso(): Progresso {
  return useSyncExternalStore(assinar, () => estado);
}

export function obterProgresso(): Progresso {
  return estado;
}

function comDiaDeEstudo(p: Progresso): Progresso {
  const hoje = dataLocal();
  return p.dias.includes(hoje) ? p : { ...p, dias: [...p.dias, hoje].slice(-400) };
}

function agora(): string {
  return new Date().toISOString();
}

// ---------- Missões ----------

export function registrarAtividade() {
  if (!estado.dias.includes(dataLocal())) atualizar(comDiaDeEstudo);
}

export function abrirMissao(id: string) {
  atualizar((p) => {
    const existente = p.missoes[id];
    const missao: ProgressoMissao = existente
      ? { ...existente, atualizadaEm: agora() }
      : { iniciadaEm: agora(), atualizadaEm: agora(), checkpoints: {}, dicas: {} };
    return { ...p, ultimaMissao: id, missoes: { ...p.missoes, [id]: missao } };
  });
}

export function revelarDica(id: string, checkpoint: number) {
  atualizar((p) => {
    const missao = p.missoes[id];
    if (!missao || missao.checkpoints[checkpoint]) return p;
    const dicas = { ...missao.dicas, [checkpoint]: (missao.dicas[checkpoint] ?? 0) + 1 };
    return { ...p, missoes: { ...p.missoes, [id]: { ...missao, dicas } } };
  });
}

/** Marca o checkpoint como concluído e devolve o XP ganho (0 se já estava concluído). */
export function concluirCheckpoint(id: string, checkpoint: number, xpBase: number, totalCheckpoints: number): number {
  const missao = estado.missoes[id];
  if (!missao || missao.checkpoints[checkpoint]) return 0;
  const dicas = missao.dicas[checkpoint] ?? 0;
  const xp = xpCheckpoint(xpBase, dicas);
  atualizar((p) => {
    const checkpoints = { ...missao.checkpoints, [checkpoint]: { concluidoEm: agora(), xp, dicas } };
    const concluida = Object.keys(checkpoints).length >= totalCheckpoints;
    const atualizada: ProgressoMissao = {
      ...missao,
      checkpoints,
      atualizadaEm: agora(),
      concluidaEm: concluida ? (missao.concluidaEm ?? agora()) : missao.concluidaEm,
    };
    return comDiaDeEstudo({ ...p, xp: p.xp + xp, missoes: { ...p.missoes, [id]: atualizada } });
  });
  return xp;
}

export function lerConsulta(id: string): string | null {
  try {
    return localStorage.getItem(PREFIXO_CONSULTA + id);
  } catch {
    return null;
  }
}

export function salvarConsulta(id: string, sql: string) {
  try {
    localStorage.setItem(PREFIXO_CONSULTA + id, sql);
  } catch {
    // ignora: é só conveniência
  }
}

// ---------- Simulados ----------

export function iniciarProva(id: string): ProvaEmAndamento {
  const existente = estado.simulados[id]?.emAndamento;
  if (existente) return existente;
  const prova: ProvaEmAndamento = { iniciadaEm: agora(), respostas: {}, marcadas: [], atual: 0 };
  atualizar((p) => {
    const simulado = p.simulados[id] ?? { tentativas: [] };
    return { ...p, simulados: { ...p.simulados, [id]: { ...simulado, emAndamento: prova } } };
  });
  return prova;
}

export function atualizarProva(id: string, alteracao: Partial<ProvaEmAndamento>) {
  atualizar((p) => {
    const simulado = p.simulados[id];
    if (!simulado?.emAndamento) return p;
    return {
      ...p,
      simulados: { ...p.simulados, [id]: { ...simulado, emAndamento: { ...simulado.emAndamento, ...alteracao } } },
    };
  });
}

export function responderQuestao(id: string, questaoId: string, resposta: RespostaQuestao) {
  atualizar((p) => {
    const simulado = p.simulados[id];
    if (!simulado?.emAndamento) return p;
    const respostas = { ...simulado.emAndamento.respostas, [questaoId]: resposta };
    return {
      ...p,
      simulados: { ...p.simulados, [id]: { ...simulado, emAndamento: { ...simulado.emAndamento, respostas } } },
    };
  });
}

export function alternarMarcada(id: string, questaoId: string) {
  atualizar((p) => {
    const simulado = p.simulados[id];
    if (!simulado?.emAndamento) return p;
    const atuais = simulado.emAndamento.marcadas;
    const marcadas = atuais.includes(questaoId) ? atuais.filter((q) => q !== questaoId) : [...atuais, questaoId];
    return {
      ...p,
      simulados: { ...p.simulados, [id]: { ...simulado, emAndamento: { ...simulado.emAndamento, marcadas } } },
    };
  });
}

export function descartarProva(id: string) {
  atualizar((p) => {
    const simulado = p.simulados[id];
    if (!simulado) return p;
    return { ...p, simulados: { ...p.simulados, [id]: { tentativas: simulado.tentativas } } };
  });
}

/** Registra a tentativa. XP só conta acertos acima da melhor tentativa anterior. */
export function registrarTentativa(id: string, tentativa: Omit<TentativaSimulado, 'xp'>, xpPorAcerto: number): TentativaSimulado {
  const anteriores = estado.simulados[id]?.tentativas ?? [];
  const melhor = anteriores.reduce((max, t) => Math.max(max, t.acertos), 0);
  const registrada: TentativaSimulado = { ...tentativa, xp: Math.max(0, tentativa.acertos - melhor) * xpPorAcerto };
  atualizar((p) =>
    comDiaDeEstudo({
      ...p,
      xp: p.xp + registrada.xp,
      simulados: { ...p.simulados, [id]: { tentativas: [...anteriores, registrada] } },
    }),
  );
  return registrada;
}

// ---------- Configurações ----------

export function definirModoLivre(ativo: boolean) {
  atualizar((p) => ({ ...p, modoLivre: ativo }));
}

export function apagarProgresso() {
  try {
    Object.keys(localStorage)
      .filter((chave) => chave.startsWith(PREFIXO_CONSULTA))
      .forEach((chave) => localStorage.removeItem(chave));
  } catch {
    // ignora
  }
  publicar(progressoVazio());
}

export function exportarProgresso(): string {
  return JSON.stringify(estado, null, 2);
}

export function importarProgresso(texto: string): boolean {
  try {
    const dados = JSON.parse(texto) as Partial<Progresso>;
    if (dados.versao !== 1 || typeof dados.xp !== 'number') return false;
    publicar({ ...progressoVazio(), ...dados });
    return true;
  } catch {
    return false;
  }
}
