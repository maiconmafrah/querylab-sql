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

export interface ProgressoDesafio {
  respondidoEm: string;
  escolhida: number;
  acertou: boolean;
  xp: number;
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
  /** Apelido público, mostrado no ranking. Só existe pra quem já definiu um. */
  apelido?: string;
  /** Chave: data (AAAA-MM-DD) do desafio. */
  desafios: Record<string, ProgressoDesafio>;
  /**
   * Quando este progresso mudou pela última vez NESTE aparelho. Usado só pra decidir se um
   * snapshot que chega da nuvem é mais novo que o que já está na tela — nunca é mostrado.
   */
  atualizadoEm: string;
  /** Avisar por e-mail quando a sequência de dias estiver prestes a quebrar. Padrão: ativado. */
  lembreteSequencia?: boolean;
}

/** Sentinela "nunca atualizado": qualquer dado real da nuvem é sempre mais novo que isso. */
const NUNCA_ATUALIZADO = '1970-01-01T00:00:00.000Z';

function progressoVazio(): Progresso {
  return { versao: 1, xp: 0, dias: [], missoes: {}, simulados: {}, modoLivre: false, desafios: {}, atualizadoEm: NUNCA_ATUALIZADO };
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
  publicar({ ...alteracao(estado), atualizadoEm: new Date().toISOString() });
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

// ---------- Desafio diário ----------

/** Registra a resposta do desafio do dia. Não faz nada se aquele dia já tiver resposta. */
export function responderDesafio(data: string, escolhida: number, acertou: boolean, xp: number): void {
  atualizar((p) => {
    if (p.desafios[data]) return p;
    const ganho = acertou ? xp : 0;
    return comDiaDeEstudo({
      ...p,
      xp: p.xp + ganho,
      desafios: { ...p.desafios, [data]: { respondidoEm: agora(), escolhida, acertou, xp: ganho } },
    });
  });
}

// ---------- Configurações ----------

export function definirLembreteSequencia(ativo: boolean) {
  atualizar((p) => ({ ...p, lembreteSequencia: ativo }));
}

export function definirModoLivre(ativo: boolean) {
  atualizar((p) => ({ ...p, modoLivre: ativo }));
}

/** Apelido público (2 a 24 caracteres) mostrado no ranking. */
export function definirApelido(nome: string): boolean {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if (limpo.length < 2 || limpo.length > 24) return false;
  atualizar((p) => ({ ...p, apelido: limpo }));
  return true;
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
