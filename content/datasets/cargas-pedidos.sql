-- Dataset "cargas-pedidos": pedidos de 01 a 12/09/2026 carregados em lotes diários, e o log das cargas.
-- A carga do lote 3391 deu timeout, foi reexecutada e gravou os pedidos de 12/09 duas vezes.

CREATE TABLE cargas_log (
  lote          VARCHAR NOT NULL,
  job           VARCHAR NOT NULL,
  evento        VARCHAR NOT NULL,
  registrado_em TIMESTAMP NOT NULL,
  mensagem      VARCHAR NOT NULL
);

INSERT INTO cargas_log
SELECT CAST(3380 + d.d AS VARCHAR), 'carga_pedidos', 'inicio',
       TIMESTAMP '2026-09-02 08:02:00' + to_days(CAST(d.d AS INTEGER)), 'lote iniciado'
FROM range(0, 12) AS d(d)
UNION ALL
SELECT CAST(3380 + d.d AS VARCHAR), 'carga_pedidos', 'fim',
       TIMESTAMP '2026-09-02 08:06:00' + to_days(CAST(d.d AS INTEGER)), 'lote concluído'
FROM range(0, 11) AS d(d)
UNION ALL
SELECT * FROM (VALUES
  ('3391',   'carga_pedidos',     'erro',        TIMESTAMP '2026-09-13 08:05:00', 'timeout ao confirmar a escrita; retry automático agendado'),
  ('3391-r', 'carga_pedidos',     'inicio',      TIMESTAMP '2026-09-13 08:05:30', 'retry do lote 3391'),
  ('3391-r', 'carga_pedidos',     'fim',         TIMESTAMP '2026-09-13 08:07:00', 'lote concluído'),
  ('3391-r', 'painel_financeiro', 'atualizacao', TIMESTAMP '2026-09-13 08:19:00', 'painel atualizado')
);

-- Sem chave primária: nada impede que o mesmo pedido seja gravado duas vezes.
CREATE TABLE pedidos (
  pedido_id  INTEGER NOT NULL,
  cliente_id INTEGER NOT NULL,
  valor      DECIMAL(10, 2) NOT NULL,
  criado_em  TIMESTAMP NOT NULL,
  lote_carga VARCHAR NOT NULL
);

INSERT INTO pedidos
SELECT 910000 + t.i AS pedido_id,
       1000 + (t.i * 31) % 2400 AS cliente_id,
       CAST(25 + (t.i * 97) % 1400 + ((t.i * 13) % 100) / 100.0 AS DECIMAL(10, 2)) AS valor,
       TIMESTAMP '2026-09-01 07:00:00'
         + to_days(CAST((t.i - 1) // 380 AS INTEGER))
         + to_minutes(CAST((t.i * 37) % 900 AS BIGINT)) AS criado_em,
       CAST(3380 + (t.i - 1) // 380 AS VARCHAR) AS lote_carga
FROM range(1, 4561) AS t(i);

-- O retry gravou o lote inteiro de novo.
INSERT INTO pedidos
SELECT pedido_id, cliente_id, valor, criado_em, lote_carga || '-r'
FROM pedidos
WHERE lote_carga = '3391';
