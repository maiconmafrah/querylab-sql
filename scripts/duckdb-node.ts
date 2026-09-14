// Executa SQL no DuckDB nativo (Node) e devolve resultados no mesmo formato usado pelo site.
import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import type { Celula, ResultadoTabela } from '../src/lib/comparar.ts';

export async function novaConexao(): Promise<DuckDBConnection> {
  const instancia = await DuckDBInstance.create(':memory:');
  return instancia.connect();
}

function converter(valor: unknown, tipo: string): Celula {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'bigint') return Number(valor);
  if (typeof valor === 'number' || typeof valor === 'boolean' || typeof valor === 'string') return valor;
  if (valor instanceof Date) {
    const iso = valor.toISOString();
    return tipo === 'DATE' ? iso.slice(0, 10) : iso.slice(0, 19).replace('T', ' ');
  }
  if (valor instanceof Uint8Array) {
    return Array.from(valor, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return JSON.stringify(valor, (_, v) => (typeof v === 'bigint' ? Number(v) : v));
}

/** Executa um ou mais comandos e devolve o resultado do último. */
export async function executar(conexao: DuckDBConnection, sql: string): Promise<ResultadoTabela> {
  const comandos = await conexao.extractStatements(sql);
  let ultimo: ResultadoTabela = { colunas: [], linhas: [] };
  for (let i = 0; i < comandos.count; i++) {
    const preparado = await comandos.prepare(i);
    const leitor = await preparado.runAndReadAll();
    const tipos = leitor.columnTypes().map((tipo) => tipo.toString());
    ultimo = {
      colunas: leitor.columnNames().map((nome, j) => ({ nome, tipo: tipos[j] })),
      linhas: leitor.getRowsJS().map((linha) => linha.map((valor, j) => converter(valor, tipos[j]))),
    };
  }
  return ultimo;
}
