// Carrega todo o conteúdo de /content. Arquivos novos aparecem automaticamente no site.
import type { Dificuldade, QuestaoMultipla, SecaoReferencia, Simulado, Tema, Treinamento, Trilha } from '../tipos.ts';
import temasJson from '../../content/temas.json';
import referenciaJson from '../../content/referencia.json';
import desafiosJson from '../../content/desafios.json';

const modulosTreinamentos = import.meta.glob<Treinamento>('../../content/treinamentos/*.json', {
  eager: true,
  import: 'default',
});
const modulosTrilhas = import.meta.glob<Trilha>('../../content/trilhas/*.json', { eager: true, import: 'default' });
const modulosSimulados = import.meta.glob<Simulado>('../../content/simulados/*.json', {
  eager: true,
  import: 'default',
});
const modulosDatasets = import.meta.glob<string>('../../content/datasets/*.sql', {
  query: '?raw',
  import: 'default',
});

export const temas: Tema[] = temasJson;
export const referencia = referenciaJson as SecaoReferencia[];
export const desafios: QuestaoMultipla[] = desafiosJson as QuestaoMultipla[];

export const trilhas: Trilha[] = Object.values(modulosTrilhas).sort((a, b) => a.numero - b.numero);
export const simulados: Simulado[] = Object.values(modulosSimulados).sort((a, b) => a.numero - b.numero);

const posicaoNaTrilha = new Map<string, number>();
trilhas.forEach((trilha, t) => trilha.missoes.forEach((id, m) => posicaoNaTrilha.set(id, t * 1000 + m)));

export const treinamentos: Treinamento[] = Object.values(modulosTreinamentos).sort(
  (a, b) =>
    (posicaoNaTrilha.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (posicaoNaTrilha.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
    a.titulo.localeCompare(b.titulo, 'pt-BR'),
);

const treinamentosPorId = new Map(treinamentos.map((t) => [t.id, t]));
const simuladosPorId = new Map(simulados.map((s) => [s.id, s]));
const trilhasPorId = new Map(trilhas.map((t) => [t.id, t]));

export const buscarTreinamento = (id: string) => treinamentosPorId.get(id);
export const buscarSimulado = (id: string) => simuladosPorId.get(id);
export const buscarTrilha = (id: string) => trilhasPorId.get(id);

export function trilhaDaMissao(id: string): Trilha | undefined {
  return trilhas.find((trilha) => trilha.missoes.includes(id));
}

export function nomeTema(id: string): string {
  return temas.find((tema) => tema.id === id)?.nome ?? id;
}

export const NOMES_DIFICULDADE: Record<Dificuldade, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

export const datasetsDisponiveis: string[] = Object.keys(modulosDatasets)
  .map((caminho) => caminho.split('/').pop()!)
  .sort();

export async function carregarDataset(arquivo: string): Promise<string> {
  const carregar = modulosDatasets[`../../content/datasets/${arquivo}`];
  if (!carregar) throw new Error(`O dataset "${arquivo}" não existe em content/datasets.`);
  return carregar();
}
