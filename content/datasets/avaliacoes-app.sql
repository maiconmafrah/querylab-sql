-- Dataset "avaliacoes-app": notas que os clientes dão aos pedidos pelo app.
-- A partir de 01/08/2026 (versão 2.0.1) dar nota passou a ser opcional.

CREATE TABLE avaliacoes (
  avaliacao_id INTEGER PRIMARY KEY,
  pedido_id    INTEGER NOT NULL,
  versao_app   VARCHAR NOT NULL,
  nota         INTEGER,
  comentario   VARCHAR,
  criada_em    TIMESTAMP NOT NULL
);

INSERT INTO avaliacoes
SELECT base.i AS avaliacao_id,
       70000 + base.i * 3 AS pedido_id,
       CASE WHEN base.dia >= 61 THEN '2.0.1' ELSE '1.9.4' END AS versao_app,
       base.nota,
       CASE
         WHEN base.nota IS NULL THEN NULL
         WHEN base.nota >= 4 THEN ['Entrega rápida!', NULL, 'Produto excelente', NULL, 'Chegou antes do prazo',
                                   'Atendimento ótimo', NULL, 'Embalagem caprichada'][(base.i * 11) % 8 + 1]
         ELSE ['Demorou para chegar', NULL, 'Veio com defeito', NULL][(base.i * 5) % 4 + 1]
       END AS comentario,
       TIMESTAMP '2026-06-01 09:00:00'
         + to_days(CAST(base.dia AS INTEGER))
         + to_minutes(CAST((base.i * 41) % 720 AS BIGINT)) AS criada_em
FROM (
  SELECT t.i,
         (t.i * 29) % 92 AS dia,
         CASE
           WHEN (t.i * 29) % 92 >= 61 AND (t.i * 3) % 20 < 7 THEN NULL
           WHEN (t.i * 29) % 92 >= 61 THEN [5, 4, 5, 4, 4, 5, 4, 3, 5, 4][(t.i * 7) % 10 + 1]
           ELSE [5, 4, 5, 3, 4, 5, 4, 2, 5, 4][(t.i * 7) % 10 + 1]
         END AS nota
  FROM range(1, 1105) AS t(i)
) base;
