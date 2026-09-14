import { describe, expect, it } from 'vitest';
import { dividirComandos, explicarErro, tipoComando, tituloErro } from './sql.ts';

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

  it('reconhece os casos específicos de Binder Error antes do genérico', () => {
    expect(tituloErro('Binder Error: Ambiguous reference to column name "cliente_id" (use: "c.cliente_id" or "p.cliente_id")')).toBe(
      'Coluna ambígua',
    );
    expect(
      tituloErro('Binder Error: column "valor_total" must appear in the GROUP BY clause or must be part of an aggregate function.'),
    ).toBe('Coluna fora do GROUP BY');
    expect(tituloErro('Binder Error: Referenced column "nom" not found in FROM clause!')).toBe('Coluna ou tabela não encontrada');
  });
});

describe('explicarErro', () => {
  it('explica coluna não encontrada, sugerindo o candidato mais próximo', () => {
    const mensagem = 'Binder Error: Referenced column "nom" not found in FROM clause!\nCandidate bindings: "nome", "email"';
    expect(explicarErro(mensagem)).toBe('A coluna "nom" não existe nessa tabela. Você quis dizer "nome"?');
  });

  it('explica tabela não encontrada, sugerindo o nome certo', () => {
    const mensagem = 'Catalog Error: Table with name cliente does not exist!\nDid you mean "clientes"?';
    expect(explicarErro(mensagem)).toBe('A tabela "cliente" não existe. Você quis dizer "clientes"?');
  });

  it('explica coluna ambígua entre duas tabelas', () => {
    const mensagem = 'Binder Error: Ambiguous reference to column name "cliente_id" (use: "c.cliente_id" or "p.cliente_id")';
    expect(explicarErro(mensagem)).toBe(
      'A coluna "cliente_id" existe em mais de uma tabela dessa consulta, e o banco não sabe qual você quer dizer. Use "c.cliente_id" ou "p.cliente_id" pra indicar de qual tabela.',
    );
  });

  it('explica coluna fora do GROUP BY', () => {
    const mensagem = 'Binder Error: column "valor_total" must appear in the GROUP BY clause or must be part of an aggregate function.';
    expect(explicarErro(mensagem)).toBe(
      'A coluna "valor_total" não está dentro de uma função de agregação (como COUNT ou SUM), então ela precisa aparecer no GROUP BY.',
    );
  });

  it('explica erro de sintaxe perto de um token e no fim da consulta', () => {
    expect(explicarErro('Parser Error: syntax error at or near "FROM"')).toBe(
      'Tem alguma coisa estranha perto de "FROM" — confira se não falta uma vírgula, um parêntese ou se não sobrou uma palavra a mais ali.',
    );
    expect(explicarErro('Parser Error: syntax error at end of input')).toBe(
      'A consulta parece ter parado no meio — falta alguma coisa no final (uma condição depois do WHERE, um valor, um parêntese fechando).',
    );
  });

  it('devolve null para mensagens que não reconhece', () => {
    expect(explicarErro('Out of Range Error: algo bem específico')).toBeNull();
  });
});
