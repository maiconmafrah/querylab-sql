// Valida todo o conteúdo de /content: formato dos JSON, referências entre arquivos
// e se todas as consultas (respostas, gabaritos e exemplos) rodam no DuckDB.
// Uso: npm run validar
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { DuckDBConnection } from '@duckdb/node-api';
import { compararResultados, type Celula } from '../src/lib/comparar.ts';
import type { Checkpoint, QuestaoMultipla, SecaoReferencia, Simulado, Tema, Treinamento, Trilha } from '../src/tipos.ts';
import { executar, novaConexao } from './duckdb-node.ts';

const PASTA = 'content';
const DIFICULDADES = ['facil', 'medio', 'dificil'];

let erros = 0;
let avisos = 0;

function falha(onde: string, mensagem: string) {
  erros++;
  console.log(`  [erro]  ${onde}: ${mensagem}`);
}

function aviso(onde: string, mensagem: string) {
  avisos++;
  console.log(`  [aviso] ${onde}: ${mensagem}`);
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message.split('\n')[0] : String(erro);
}

function lerJson<T>(caminho: string): T | null {
  try {
    return JSON.parse(readFileSync(caminho, 'utf8')) as T;
  } catch (erro) {
    falha(caminho, `JSON inválido (${mensagemDe(erro)})`);
    return null;
  }
}

function lerPasta<T>(pasta: string): { arquivo: string; dados: T }[] {
  const diretorio = join(PASTA, pasta);
  if (!existsSync(diretorio)) return [];
  return readdirSync(diretorio)
    .filter((nome) => nome.endsWith('.json'))
    .flatMap((nome) => {
      const dados = lerJson<T>(join(diretorio, nome));
      return dados ? [{ arquivo: `${pasta}/${nome}`, dados }] : [];
    });
}

type TipoCampo = 'texto' | 'numero' | 'lista';

function exigirCampos(onde: string, objeto: unknown, campos: Record<string, TipoCampo>) {
  const registro = (objeto ?? {}) as Record<string, unknown>;
  for (const [campo, tipo] of Object.entries(campos)) {
    const valor = registro[campo];
    const valido =
      tipo === 'lista'
        ? Array.isArray(valor)
        : tipo === 'numero'
          ? typeof valor === 'number' && Number.isFinite(valor)
          : typeof valor === 'string' && valor.trim() !== '';
    if (!valido) falha(onde, `campo "${campo}" ausente ou inválido (esperado: ${tipo})`);
  }
}

function formatar(valor: Celula): string {
  if (valor === null) return 'NULL';
  return typeof valor === 'string' ? `"${valor}"` : String(valor);
}

async function conectar(dataset: string, onde: string): Promise<DuckDBConnection | null> {
  const caminho = join(PASTA, 'datasets', dataset);
  if (!existsSync(caminho)) {
    falha(onde, `dataset "${dataset}" não existe em content/datasets`);
    return null;
  }
  const conexao = await novaConexao();
  try {
    await executar(conexao, readFileSync(caminho, 'utf8'));
    return conexao;
  } catch (erro) {
    falha(`datasets/${dataset}`, `erro ao montar o dataset: ${mensagemDe(erro)}`);
    return null;
  }
}

async function validarGabarito(
  conexao: DuckDBConnection,
  onde: string,
  rotulo: string,
  sql: unknown,
  ordemImporta?: boolean,
  tolerancia?: number,
) {
  if (typeof sql !== 'string' || sql.trim() === '') {
    falha(onde, 'gabarito_sql ausente');
    return;
  }
  try {
    const primeira = await executar(conexao, sql);
    const segunda = await executar(conexao, sql);
    if (primeira.linhas.length === 0) aviso(onde, 'o gabarito não devolve nenhuma linha');
    if (ordemImporta && !/order\s+by/i.test(sql)) aviso(onde, 'ordem_importa é true, mas o gabarito não tem ORDER BY');
    if (!compararResultados(primeira, segunda, { ordemImporta, tolerancia }).ok) {
      falha(onde, 'o gabarito devolve resultados diferentes a cada execução');
    }
    console.log(
      `      ${rotulo}: ${primeira.linhas.length} linha(s) × ${primeira.colunas.length} coluna(s) [${primeira.colunas.map((c) => c.nome).join(', ')}]`,
    );
  } catch (erro) {
    falha(onde, `gabarito_sql falhou: ${mensagemDe(erro)}`);
  }
}

async function validarCheckpoint(conexao: DuckDBConnection, onde: string, checkpoint: Checkpoint) {
  exigirCampos(onde, checkpoint, { titulo: 'texto', pergunta: 'texto', tipo: 'texto', xp: 'numero' });
  if (checkpoint.tipo === 'valor') {
    try {
      const resultado = await executar(conexao, checkpoint.resposta_sql);
      if (resultado.colunas.length !== 1 || resultado.linhas.length !== 1) {
        falha(onde, `resposta_sql deve devolver 1 linha e 1 coluna (devolveu ${resultado.linhas.length} × ${resultado.colunas.length})`);
        return;
      }
      if (resultado.linhas[0][0] === null) aviso(onde, 'a resposta esperada é NULL');
      console.log(`      ${checkpoint.titulo}: resposta = ${formatar(resultado.linhas[0][0])}`);
    } catch (erro) {
      falha(onde, `resposta_sql falhou: ${mensagemDe(erro)}`);
    }
  } else if (checkpoint.tipo === 'query') {
    await validarGabarito(conexao, onde, checkpoint.titulo, checkpoint.gabarito_sql, checkpoint.ordem_importa, checkpoint.tolerancia);
  } else {
    falha(onde, `tipo "${(checkpoint as { tipo: string }).tipo}" inválido (use "valor" ou "query")`);
  }
}

// ---------- Temas ----------
console.log('\nTemas');
const temas = lerJson<Tema[]>(join(PASTA, 'temas.json')) ?? [];
const idsTemas = new Set(temas.map((tema) => tema.id));
if (idsTemas.size !== temas.length) falha('temas.json', 'há ids de tema repetidos');
console.log(`      ${temas.length} temas`);

// ---------- Desafio diário ----------
console.log('\nDesafio diário');
const desafios = lerJson<QuestaoMultipla[]>(join(PASTA, 'desafios.json')) ?? [];
const idsDesafios = new Set<string>();
for (const [indice, desafio] of desafios.entries()) {
  const onde = `desafios.json #${indice + 1}`;
  exigirCampos(onde, desafio, { id: 'texto', tema: 'texto', enunciado: 'texto', explicacao: 'texto' });
  if (idsDesafios.has(desafio.id)) falha(onde, `id "${desafio.id}" repetido`);
  idsDesafios.add(desafio.id);
  if (!idsTemas.has(desafio.tema)) falha(onde, `tema "${desafio.tema}" não existe em temas.json`);
  if (desafio.tipo !== 'multipla') falha(onde, `tipo "${desafio.tipo}" inválido (o desafio diário só aceita "multipla")`);
  const alternativas = desafio.alternativas ?? [];
  if (alternativas.length < 2) falha(onde, 'precisa de pelo menos 2 alternativas');
  if (!Number.isInteger(desafio.correta) || desafio.correta < 0 || desafio.correta >= alternativas.length) {
    falha(onde, `"correta" deve ser um índice entre 0 e ${alternativas.length - 1}`);
  }
}
console.log(`      ${desafios.length} desafios`);

// ---------- Simulados ----------
console.log('\nSimulados');
const simulados = lerPasta<Simulado>('simulados');
const idsSimulados = new Set<string>();
for (const { arquivo, dados: simulado } of simulados) {
  exigirCampos(arquivo, simulado, {
    id: 'texto',
    numero: 'numero',
    titulo: 'texto',
    descricao: 'texto',
    dificuldade: 'texto',
    tempo_min: 'numero',
    nota_minima: 'numero',
    xp_por_acerto: 'numero',
    publicado_em: 'texto',
    questoes: 'lista',
  });
  console.log(`  ${simulado.id}`);
  if (basename(arquivo, '.json') !== simulado.id) falha(arquivo, `o id "${simulado.id}" deve ser igual ao nome do arquivo`);
  if (idsSimulados.has(simulado.id)) falha(arquivo, `id "${simulado.id}" repetido`);
  idsSimulados.add(simulado.id);
  if (!DIFICULDADES.includes(simulado.dificuldade)) falha(arquivo, `dificuldade "${simulado.dificuldade}" inválida`);
  if (simulado.nota_minima < 0 || simulado.nota_minima > 100) falha(arquivo, 'nota_minima deve ficar entre 0 e 100');

  const questoes = simulado.questoes ?? [];
  if (questoes.length === 0) falha(arquivo, 'o simulado precisa de pelo menos uma questão');
  const idsQuestoes = new Set<string>();
  const temSql = questoes.some((questao) => questao.tipo === 'sql');
  if (temSql && !simulado.dataset) falha(arquivo, 'há questões do tipo "sql", então o campo "dataset" é obrigatório');
  const conexao = simulado.dataset ? await conectar(simulado.dataset, arquivo) : null;

  for (const [indice, questao] of questoes.entries()) {
    const onde = `${arquivo} questão ${indice + 1}`;
    exigirCampos(onde, questao, { id: 'texto', tipo: 'texto', tema: 'texto', enunciado: 'texto', explicacao: 'texto' });
    if (idsQuestoes.has(questao.id)) falha(onde, `id "${questao.id}" repetido`);
    idsQuestoes.add(questao.id);
    if (!idsTemas.has(questao.tema)) falha(onde, `tema "${questao.tema}" não existe em temas.json`);

    if (questao.tipo === 'multipla') {
      const alternativas = questao.alternativas ?? [];
      if (alternativas.length < 2) falha(onde, 'precisa de pelo menos 2 alternativas');
      if (!Number.isInteger(questao.correta) || questao.correta < 0 || questao.correta >= alternativas.length) {
        falha(onde, `"correta" deve ser um índice entre 0 e ${alternativas.length - 1}`);
      }
      if (new Set(alternativas).size !== alternativas.length) aviso(onde, 'há alternativas repetidas');
    } else if (questao.tipo === 'sql') {
      if (conexao) await validarGabarito(conexao, onde, questao.id, questao.gabarito_sql, questao.ordem_importa, questao.tolerancia);
    } else {
      falha(onde, `tipo "${(questao as { tipo: string }).tipo}" inválido (use "multipla" ou "sql")`);
    }
  }
}

// ---------- Treinamentos ----------
console.log('\nTreinamentos');
const treinamentos = lerPasta<Treinamento>('treinamentos');
const idsTreinamentos = new Set(treinamentos.map(({ dados }) => dados.id));
const vistos = new Set<string>();
for (const { arquivo, dados: treinamento } of treinamentos) {
  exigirCampos(arquivo, treinamento, {
    id: 'texto',
    titulo: 'texto',
    resumo: 'texto',
    tema: 'texto',
    dificuldade: 'texto',
    duracao_min: 'numero',
    dataset: 'texto',
    publicado_em: 'texto',
    chamado: 'lista',
    checkpoints: 'lista',
  });
  console.log(`  ${treinamento.id}`);
  if (basename(arquivo, '.json') !== treinamento.id) falha(arquivo, `o id "${treinamento.id}" deve ser igual ao nome do arquivo`);
  if (vistos.has(treinamento.id)) falha(arquivo, `id "${treinamento.id}" repetido`);
  vistos.add(treinamento.id);
  if (!idsTemas.has(treinamento.tema)) falha(arquivo, `tema "${treinamento.tema}" não existe em temas.json`);
  if (!DIFICULDADES.includes(treinamento.dificuldade)) falha(arquivo, `dificuldade "${treinamento.dificuldade}" inválida`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(treinamento.publicado_em ?? '')) falha(arquivo, 'publicado_em deve estar no formato AAAA-MM-DD');
  for (const requisito of treinamento.requer ?? []) {
    if (!idsTreinamentos.has(requisito)) falha(arquivo, `requer "${requisito}", que não existe`);
  }
  for (const [indice, mensagem] of (treinamento.chamado ?? []).entries()) {
    if (!mensagem.texto && !mensagem.log && !mensagem.codigo) falha(`${arquivo} chamado ${indice + 1}`, 'precisa de texto, log ou codigo');
  }
  if (!treinamento.checkpoints?.length) {
    falha(arquivo, 'precisa de pelo menos um checkpoint');
    continue;
  }

  const conexao = await conectar(treinamento.dataset, arquivo);
  if (!conexao) continue;
  if (treinamento.consulta_inicial) {
    try {
      await executar(conexao, treinamento.consulta_inicial);
    } catch (erro) {
      falha(`${arquivo} consulta_inicial`, mensagemDe(erro));
    }
  }
  for (const [indice, checkpoint] of treinamento.checkpoints.entries()) {
    await validarCheckpoint(conexao, `${arquivo} checkpoint ${indice + 1}`, checkpoint);
  }
}

// ---------- Trilhas ----------
console.log('\nTrilhas');
const trilhas = lerPasta<Trilha>('trilhas');
const trilhaDaMissao = new Map<string, string>();
const numerosTrilha = new Set<number>();
for (const { arquivo, dados: trilha } of trilhas) {
  exigirCampos(arquivo, trilha, { id: 'texto', numero: 'numero', titulo: 'texto', descricao: 'texto', missoes: 'lista' });
  console.log(`  ${trilha.id}: ${trilha.missoes?.length ?? 0} missões`);
  if (basename(arquivo, '.json') !== trilha.id) falha(arquivo, `o id "${trilha.id}" deve ser igual ao nome do arquivo`);
  if (numerosTrilha.has(trilha.numero)) falha(arquivo, `número ${trilha.numero} repetido`);
  numerosTrilha.add(trilha.numero);
  for (const missao of trilha.missoes ?? []) {
    if (!idsTreinamentos.has(missao)) falha(arquivo, `missão "${missao}" não existe em content/treinamentos`);
    const outra = trilhaDaMissao.get(missao);
    if (outra) falha(arquivo, `a missão "${missao}" já está na trilha "${outra}"`);
    trilhaDaMissao.set(missao, trilha.id);
  }
  if (trilha.simulado_final && !idsSimulados.has(trilha.simulado_final)) {
    falha(arquivo, `simulado_final "${trilha.simulado_final}" não existe`);
  }
}
for (const id of idsTreinamentos) {
  if (!trilhaDaMissao.has(id)) aviso(`treinamentos/${id}.json`, 'não está em nenhuma trilha (vai aparecer só no catálogo)');
}

// ---------- Referência ----------
console.log('\nReferência SQL');
const referencia = lerJson<SecaoReferencia[]>(join(PASTA, 'referencia.json')) ?? [];
const conexaoReferencia = await conectar('loja.sql', 'referencia.json');
let exemplos = 0;
for (const secao of referencia) {
  exigirCampos(`referencia.json ${secao.id}`, secao, { id: 'texto', titulo: 'texto', entradas: 'lista' });
  for (const entrada of secao.entradas ?? []) {
    const onde = `referencia.json ${secao.id}/${entrada.id}`;
    exigirCampos(onde, entrada, { id: 'texto', titulo: 'texto', descricao: 'texto', sintaxe: 'texto', exemplo: 'texto' });
    if (!conexaoReferencia) continue;
    try {
      await executar(conexaoReferencia, entrada.exemplo);
      exemplos++;
    } catch (erro) {
      falha(onde, `o exemplo não roda no dataset loja.sql: ${mensagemDe(erro)}`);
    }
  }
}
console.log(`      ${exemplos} exemplos executados`);

console.log(
  `\n${erros === 0 ? 'Conteúdo válido.' : `${erros} erro(s) encontrado(s).`}${avisos > 0 ? ` ${avisos} aviso(s).` : ''}\n`,
);
process.exit(erros === 0 ? 0 : 1);
