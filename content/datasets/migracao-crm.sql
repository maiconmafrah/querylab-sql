-- Dataset "migracao-crm": clientes do sistema antigo, clientes do CRM novo e pedidos de agosto/2026.
-- A migração de 31/07 copiou para o CRM novo só quem tinha e-mail preenchido.

CREATE TABLE clientes_legado (
  cliente_id INTEGER PRIMARY KEY,
  nome       VARCHAR NOT NULL,
  email      VARCHAR,
  uf         VARCHAR NOT NULL
);

INSERT INTO clientes_legado
SELECT t.i AS cliente_id,
       nomes.primeiro || ' ' || nomes.sobrenome AS nome,
       CASE WHEN t.i IN (7, 15, 23, 38, 44, 52) THEN NULL
            ELSE lower(strip_accents(nomes.primeiro || '.' || nomes.sobrenome)) || t.i || '@email.com' END AS email,
       ['SP', 'RJ', 'MG', 'SP', 'RS', 'PR', 'BA', 'SP', 'PE', 'SC'][(t.i * 3) % 10 + 1] AS uf
FROM range(1, 61) AS t(i)
CROSS JOIN LATERAL (
  SELECT ['Alice', 'Breno', 'Cecília', 'Danilo', 'Emanuele', 'Flávio', 'Graça', 'Heitor', 'Iara', 'Jonas',
          'Kelly', 'Leandro', 'Mônica', 'Nelson', 'Odete', 'Patrício', 'Renata', 'Sérgio', 'Tânia', 'Valter'][(t.i * 7) % 20 + 1] AS primeiro,
         ['Silva', 'Santos', 'Oliveira', 'Costa', 'Rodrigues', 'Alves', 'Nascimento', 'Carvalho', 'Moraes', 'Lima',
          'Ribeiro', 'Fonseca', 'Macedo', 'Pacheco', 'Bezerra'][(t.i * 11) % 15 + 1] AS sobrenome
) nomes;

CREATE TABLE clientes (
  cliente_id INTEGER PRIMARY KEY,
  nome       VARCHAR NOT NULL,
  email      VARCHAR NOT NULL,
  uf         VARCHAR NOT NULL,
  migrado_em TIMESTAMP NOT NULL
);

INSERT INTO clientes
SELECT cliente_id, nome, email, uf, TIMESTAMP '2026-07-31 23:40:00'
FROM clientes_legado
WHERE email IS NOT NULL;

CREATE TABLE pedidos (
  pedido_id   INTEGER PRIMARY KEY,
  cliente_id  INTEGER NOT NULL,
  criado_em   TIMESTAMP NOT NULL,
  status      VARCHAR NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL
);

INSERT INTO pedidos
SELECT 80000 + t.i AS pedido_id,
       1 + ((t.i * 23) % 60) AS cliente_id,
       TIMESTAMP '2026-08-01 08:00:00'
         + to_days(CAST((t.i * 13) % 31 AS INTEGER))
         + to_minutes(CAST((t.i * 29) % 780 AS BIGINT)) AS criado_em,
       CASE WHEN t.i % 10 = 0 THEN 'cancelado' ELSE 'pago' END AS status,
       CAST(35 + (t.i * 131) % 420 + ((t.i * 7) % 100) / 100.0 AS DECIMAL(10, 2)) AS valor_total
FROM range(1, 901) AS t(i);
