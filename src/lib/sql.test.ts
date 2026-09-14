import { describe, expect, it } from 'vitest';
import { dividirComandos, tipoComando, tituloErro } from './sql.ts';

describe('dividirComandos', () => {
  it('separa comandos por ponto e vírgula', () => {
    expect(dividirComandos('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('ignora ponto e vírgula dentro de strings e comentários', () => {
    const sql = "SELECT 'a;b' AS x; -- comentário; aqui\nSELECT \"col;1\" FROM t /* ; */;";
    expect(dividirComandos(sql)).toEqual(["SELECT 'a;b' AS x", '-- comentário; aqui\nSELECT "col;1" FROM t /* ; */']);
  });

  it('entende aspas escapadas e strings com cifrão', () => {
    expect(dividirComandos("SELECT 'it''s; ok'; SELECT $$a;b$$")).toEqual(["SELECT 'it''s; ok'", 'SELECT $$a;b$$']);
  });

  it('descarta comandos vazios ou só com comentários', () => {
    expect(dividirComandos(';;  -- nada\n; SELECT 1')).toEqual(['SELECT 1']);
    expect(dividirComandos('   ')).toEqual([]);
  });
});

describe('tipoComando', () => {
  it('lê a primeira palavra-chave', () => {
    expect(tipoComando('-- oi\n  select 1')).toBe('SELECT');
    expect(tipoComando('(WITH x AS (SELECT 1) SELECT * FROM x)')).toBe('WITH');
  });
});

describe('tituloErro', () => {
  it('traduz os tipos de erro mais comuns', () => {
    expect(tituloErro('Parser Error: syntax error at or near "FORM"')).toBe('Erro de sintaxe');
    expect(tituloErro('Catalog Error: Table with name x does not exist!')).toBe('Tabela ou função não existe');
    expect(tituloErro('algo inesperado')).toBe('Erro ao executar a consulta');
  });
});
