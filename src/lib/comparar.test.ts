import { describe, expect, it } from 'vitest';
import {
  celulasIguais,
  compararResultados,
  compararValor,
  interpretarNumero,
  normalizarCelula,
  type ResultadoTabela,
} from './comparar.ts';

function tabela(colunas: string[], linhas: (string | number | boolean | null)[][]): ResultadoTabela {
  return { colunas: colunas.map((nome) => ({ nome, tipo: 'texto' })), linhas };
}

describe('normalizarCelula', () => {
  it('trata data-hora à meia-noite como data', () => {
    expect(normalizarCelula('2026-08-01 00:00:00')).toBe('2026-08-01');
    expect(normalizarCelula('2026-08-01 10:30:00')).toBe('2026-08-01 10:30:00');
  });
});

describe('celulasIguais', () => {
  it('respeita a tolerância numérica', () => {
    expect(celulasIguais(4.12, 4.13, 0.01)).toBe(true);
    expect(celulasIguais(4.12, 4.14, 0.01)).toBe(false);
    expect(celulasIguais(0.1 + 0.2, 0.3)).toBe(true);
  });

  it('compara nulos e textos numéricos', () => {
    expect(celulasIguais(null, null)).toBe(true);
    expect(celulasIguais(null, 0)).toBe(false);
    expect(celulasIguais('10.5', 10.5)).toBe(true);
    expect(celulasIguais('SP', 'sp')).toBe(false);
  });
});

describe('compararResultados', () => {
  const esperado = tabela(['uf', 'qtd'], [
    ['SP', 12],
    ['RJ', 7],
    ['MG', 6],
  ]);

  it('aceita linhas em outra ordem quando a ordem não importa', () => {
    const obtido = tabela(['uf', 'qtd'], [
      ['MG', 6],
      ['SP', 12],
      ['RJ', 7],
    ]);
    expect(compararResultados(esperado, obtido).ok).toBe(true);
  });

  it('avisa sobre a ordem quando ela importa', () => {
    const obtido = tabela(['uf', 'qtd'], [
      ['MG', 6],
      ['SP', 12],
      ['RJ', 7],
    ]);
    const veredito = compararResultados(esperado, obtido, { ordemImporta: true });
    expect(veredito.ok).toBe(false);
    expect(veredito.motivo).toContain('ORDER BY');
  });

  it('aceita colunas com os mesmos nomes em outra ordem', () => {
    const obtido = tabela(['qtd', 'UF'], [
      [12, 'SP'],
      [7, 'RJ'],
      [6, 'MG'],
    ]);
    expect(compararResultados(esperado, obtido, { ordemImporta: true }).ok).toBe(true);
  });

  it('explica diferenças de colunas e de linhas', () => {
    expect(compararResultados(esperado, tabela(['uf'], [['SP'], ['RJ'], ['MG']])).motivo).toContain('1 coluna');
    expect(compararResultados(esperado, tabela(['uf', 'qtd'], [['SP', 12]])).motivo).toContain('1 linha');
    const errado = tabela(['uf', 'qtd'], [
      ['SP', 12],
      ['RJ', 8],
      ['MG', 6],
    ]);
    expect(compararResultados(esperado, errado).motivo).toContain('1 linha não confere');
  });

  it('pareia valores próximos mesmo quando a ordenação difere', () => {
    const a = tabela(['x'], [[1.004], [1.001]]);
    const b = tabela(['x'], [[1.0], [1.005]]);
    expect(compararResultados(a, b, { tolerancia: 0.01 }).ok).toBe(true);
  });
});

describe('interpretarNumero', () => {
  it('entende formatos brasileiros e internacionais', () => {
    expect(interpretarNumero('1.234,56')).toEqual([1234.56]);
    expect(interpretarNumero('1,234.56')).toEqual([1234.56]);
    expect(interpretarNumero('R$ 8.099,60')).toEqual([8099.6]);
    expect(interpretarNumero('4,29')).toEqual([4.29]);
    expect(interpretarNumero('12%')).toEqual([12]);
    expect(interpretarNumero('1.234')).toEqual([1.234, 1234]);
    expect(interpretarNumero('abc')).toEqual([]);
  });
});

describe('compararValor', () => {
  it('valida números com tolerância', () => {
    expect(compararValor('277.118,70', 277118.7, 0.01).ok).toBe(true);
    expect(compararValor('380', 380).ok).toBe(true);
    expect(compararValor('381', 380).ok).toBe(false);
  });

  it('avisa quando está quase certo', () => {
    expect(compararValor('4,3', 4.29, 0.005).motivo).toContain('Quase');
  });

  it('ignora maiúsculas e acentos em textos', () => {
    expect(compararValor('protetor solar fps 50', 'Protetor Solar FPS 50').ok).toBe(true);
    expect(compararValor('Sérum', 'serum').ok).toBe(true);
  });

  it('pede uma resposta quando o campo está vazio', () => {
    expect(compararValor('   ', 10).motivo).toContain('Digite');
  });
});
