// Formato do conteúdo em /content. Qualquer arquivo JSON novo segue estes tipos.

export type Dificuldade = 'facil' | 'medio' | 'dificil';

export interface Tema {
  id: string;
  nome: string;
}

export interface MensagemChamado {
  autor: string;
  papel?: string;
  texto?: string;
  /** Linhas de log exibidas em bloco escuro. */
  log?: string[];
  /** Trecho de SQL anexado à mensagem (ex.: a consulta do painel). */
  codigo?: string;
}

interface CheckpointBase {
  titulo: string;
  pergunta: string;
  xp: number;
  dicas?: string[];
  /** Mostrada depois que o checkpoint é concluído. */
  explicacao?: string;
}

export interface CheckpointValor extends CheckpointBase {
  tipo: 'valor';
  /** Consulta que devolve UMA linha e UMA coluna com a resposta certa. */
  resposta_sql: string;
  tolerancia?: number;
  /** Ex.: "R$" ou "%". Só aparece como dica no campo de resposta. */
  unidade?: string;
}

export interface CheckpointQuery extends CheckpointBase {
  tipo: 'query';
  /** O resultado da consulta do aluno é comparado com o desta. */
  gabarito_sql: string;
  ordem_importa?: boolean;
  tolerancia?: number;
}

export type Checkpoint = CheckpointValor | CheckpointQuery;

export interface Treinamento {
  id: string;
  titulo: string;
  resumo: string;
  tema: string;
  dificuldade: Dificuldade;
  duracao_min: number;
  /** Nome de um arquivo em content/datasets. */
  dataset: string;
  publicado_em: string;
  requer?: string[];
  chamado: MensagemChamado[];
  checkpoints: Checkpoint[];
  consulta_inicial?: string;
}

export interface Trilha {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  /** Ids dos treinamentos, na ordem em que são desbloqueados. */
  missoes: string[];
  simulado_final?: string;
}

interface QuestaoBase {
  id: string;
  tema: string;
  enunciado: string;
  /** SQL mostrado junto do enunciado. */
  codigo?: string;
  explicacao: string;
}

export interface QuestaoMultipla extends QuestaoBase {
  tipo: 'multipla';
  alternativas: string[];
  formato_alternativas?: 'texto' | 'codigo';
  /** Índice (começando em 0) da alternativa correta. */
  correta: number;
}

export interface QuestaoSql extends QuestaoBase {
  tipo: 'sql';
  gabarito_sql: string;
  ordem_importa?: boolean;
  tolerancia?: number;
}

export type Questao = QuestaoMultipla | QuestaoSql;

export interface Simulado {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  dificuldade: Dificuldade;
  tempo_min: number;
  nota_minima: number;
  xp_por_acerto: number;
  /** Obrigatório quando houver questões do tipo "sql". */
  dataset?: string;
  publicado_em: string;
  questoes: Questao[];
}

export interface EntradaReferencia {
  id: string;
  titulo: string;
  descricao: string;
  sintaxe: string;
  exemplo: string;
  dica?: string;
}

export interface SecaoReferencia {
  id: string;
  titulo: string;
  entradas: EntradaReferencia[];
}
