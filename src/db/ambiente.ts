// Banco DuckDB rodando no navegador (WebAssembly) e ambientes isolados por missão/simulado.
import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { Type, type DataType, type Table } from 'apache-arrow';
import type { Celula, ResultadoTabela } from '../lib/comparar.ts';
import { dividirComandos } from '../lib/sql.ts';

let banco: Promise<duckdb.AsyncDuckDB> | null = null;

export function obterBanco(): Promise<duckdb.AsyncDuckDB> {
  banco ??= (async () => {
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
      eh: { mainModule: ehWasm, mainWorker: ehWorker },
    });
    const worker = new Worker(bundle.mainWorker!);
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    await db.open({ query: { castBigIntToDouble: true, castDecimalToDouble: true } });
    return db;
  })().catch((erro) => {
    banco = null;
    throw erro;
  });
  return banco;
}

// ---------- Conversão Arrow -> tabela simples ----------

const NOMES_TIPO: Partial<Record<Type, string>> = {
  [Type.Int]: 'inteiro',
  [Type.Float]: 'decimal',
  [Type.Decimal]: 'decimal',
  [Type.Utf8]: 'texto',
  [Type.LargeUtf8]: 'texto',
  [Type.Bool]: 'booleano',
  [Type.Date]: 'data',
  [Type.Timestamp]: 'data e hora',
  [Type.Time]: 'hora',
  [Type.Interval]: 'intervalo',
  [Type.List]: 'lista',
  [Type.Struct]: 'struct',
  [Type.Map]: 'mapa',
  [Type.Binary]: 'binário',
  [Type.Null]: 'nulo',
};

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function formatarData(ms: number, comHora: boolean): string {
  const d = new Date(ms);
  const data = `${d.getUTCFullYear()}-${doisDigitos(d.getUTCMonth() + 1)}-${doisDigitos(d.getUTCDate())}`;
  if (!comHora) return data;
  return `${data} ${doisDigitos(d.getUTCHours())}:${doisDigitos(d.getUTCMinutes())}:${doisDigitos(d.getUTCSeconds())}`;
}

function paraJson(valor: unknown): string {
  const simples = (v: unknown): unknown => {
    if (typeof v === 'bigint') return Number(v);
    if (v && typeof v === 'object' && 'toJSON' in v && typeof v.toJSON === 'function') return v.toJSON();
    return v;
  };
  return JSON.stringify(simples(valor), (_, v) => simples(v));
}

function converterCelula(valor: unknown, tipo: DataType): Celula {
  if (valor === null || valor === undefined) return null;
  switch (tipo.typeId) {
    case Type.Date:
      return formatarData(Number(valor), false);
    case Type.Timestamp:
      return formatarData(Number(valor), true);
    case Type.Time: {
      const micro = Number(valor);
      const total = Math.floor(micro / 1_000_000);
      return `${doisDigitos(Math.floor(total / 3600))}:${doisDigitos(Math.floor(total / 60) % 60)}:${doisDigitos(total % 60)}`;
    }
    default:
      break;
  }
  if (typeof valor === 'bigint') return Number(valor);
  if (typeof valor === 'number' || typeof valor === 'string' || typeof valor === 'boolean') return valor;
  if (valor instanceof Uint8Array) return Array.from(valor, (b) => b.toString(16).padStart(2, '0')).join('');
  return paraJson(valor);
}

export function tabelaParaResultado(tabela: Table): ResultadoTabela {
  const campos = tabela.schema.fields;
  const vetores = campos.map((_, i) => tabela.getChildAt(i));
  const linhas: Celula[][] = new Array(tabela.numRows);
  for (let r = 0; r < tabela.numRows; r++) {
    linhas[r] = vetores.map((vetor, c) => converterCelula(vetor?.get(r), campos[c].type));
  }
  return {
    colunas: campos.map((campo) => ({ nome: campo.name, tipo: NOMES_TIPO[campo.type.typeId as Type] ?? String(campo.type) })),
    linhas,
  };
}

// ---------- Ambientes ----------

export interface TabelaEsquema {
  nome: string;
  linhas: number;
  colunas: { nome: string; tipo: string }[];
}

export interface ResultadoExecucao {
  resultado: ResultadoTabela;
  comandos: number;
  duracaoMs: number;
}

export class ErroExecucao extends Error {
  readonly comando: number;
  readonly totalComandos: number;

  constructor(mensagem: string, comando: number, totalComandos: number) {
    super(mensagem);
    this.comando = comando;
    this.totalComandos = totalComandos;
  }
}

let contador = 0;

type Conexao = duckdb.AsyncDuckDBConnection;

async function executarComandos(conexao: Conexao, sql: string): Promise<ResultadoExecucao> {
  const comandos = dividirComandos(sql);
  if (comandos.length === 0) throw new ErroExecucao('Não há nenhum comando SQL para executar.', 0, 0);
  const inicio = performance.now();
  let ultima: Table | null = null;
  for (let i = 0; i < comandos.length; i++) {
    try {
      ultima = await conexao.query(comandos[i]);
    } catch (erro) {
      throw new ErroExecucao(erro instanceof Error ? erro.message : String(erro), i + 1, comandos.length);
    }
  }
  return {
    resultado: tabelaParaResultado(ultima!),
    comandos: comandos.length,
    duracaoMs: performance.now() - inicio,
  };
}

/**
 * Cada ambiente tem duas cópias do dataset: a do aluno (pode ser alterada à vontade)
 * e a do gabarito (sempre intacta, usada para validar respostas).
 */
export class Ambiente {
  private readonly aluno: Conexao;
  private readonly gabarito: Conexao;
  private readonly bancoAluno: string;
  private readonly bancoGabarito: string;
  private readonly setup: string;

  private constructor(aluno: Conexao, gabarito: Conexao, id: number, setup: string) {
    this.aluno = aluno;
    this.gabarito = gabarito;
    this.bancoAluno = `aluno_${id}`;
    this.bancoGabarito = `gabarito_${id}`;
    this.setup = setup;
  }

  static async criar(setup: string): Promise<Ambiente> {
    const db = await obterBanco();
    const id = ++contador;
    const ambiente = new Ambiente(await db.connect(), await db.connect(), id, setup);
    await ambiente.montar(ambiente.aluno, ambiente.bancoAluno);
    await ambiente.montar(ambiente.gabarito, ambiente.bancoGabarito);
    return ambiente;
  }

  private async montar(conexao: Conexao, nome: string): Promise<void> {
    await conexao.query(`ATTACH ':memory:' AS ${nome}`);
    await conexao.query(`USE ${nome}`);
    await executarComandos(conexao, this.setup);
  }

  private async desmontar(conexao: Conexao, nome: string): Promise<void> {
    await conexao.query('USE memory');
    await conexao.query(`DETACH DATABASE IF EXISTS ${nome}`);
  }

  /** Executa no banco do aluno. Com vários comandos, devolve o resultado do último. */
  executar(sql: string): Promise<ResultadoExecucao> {
    return executarComandos(this.aluno, sql);
  }

  /** Executa uma consulta do gabarito no banco intacto. */
  async executarGabarito(sql: string): Promise<ResultadoTabela> {
    return (await executarComandos(this.gabarito, sql)).resultado;
  }

  /** Executa a consulta do aluno no banco intacto, desfazendo qualquer alteração depois. */
  async executarIsolado(sql: string): Promise<ResultadoExecucao> {
    await this.gabarito.query('BEGIN TRANSACTION');
    try {
      return await executarComandos(this.gabarito, sql);
    } finally {
      try {
        await this.gabarito.query('ROLLBACK');
      } catch {
        // A consulta encerrou a transação por conta própria (ex.: COMMIT): recria a cópia intacta.
        await this.desmontar(this.gabarito, this.bancoGabarito);
        await this.montar(this.gabarito, this.bancoGabarito);
      }
    }
  }

  /** Volta o banco do aluno ao estado original do dataset. */
  async restaurar(): Promise<void> {
    await this.desmontar(this.aluno, this.bancoAluno);
    await this.montar(this.aluno, this.bancoAluno);
  }

  /** Tabelas e colunas do banco do aluno (inclui tabelas que ele mesmo criou). */
  async esquema(): Promise<TabelaEsquema[]> {
    const colunas = await this.aluno.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_catalog = '${this.bancoAluno}' AND table_schema = 'main'
      ORDER BY table_name, ordinal_position
    `);
    const porTabela = new Map<string, TabelaEsquema>();
    for (const linha of colunas.toArray()) {
      const nome = String(linha.table_name);
      if (!porTabela.has(nome)) porTabela.set(nome, { nome, linhas: 0, colunas: [] });
      porTabela.get(nome)!.colunas.push({ nome: String(linha.column_name), tipo: String(linha.data_type) });
    }
    for (const tabela of porTabela.values()) {
      const contagem = await this.aluno.query(`SELECT COUNT(*) AS n FROM "${tabela.nome.replaceAll('"', '""')}"`);
      tabela.linhas = Number(contagem.toArray()[0]?.n ?? 0);
    }
    return [...porTabela.values()];
  }

  async fechar(): Promise<void> {
    try {
      await this.desmontar(this.aluno, this.bancoAluno);
      await this.desmontar(this.gabarito, this.bancoGabarito);
    } finally {
      await this.aluno.close();
      await this.gabarito.close();
    }
  }
}
