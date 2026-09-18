-- Dataset "funcionarios": o clássico de entrevista de SQL — funcionários, cargos, salários e
-- hierarquia (gerente_id aponta pro próprio funcionario_id). Usado só na aba Teste de Entrevista.

CREATE TABLE departamentos (
  departamento_id INTEGER PRIMARY KEY,
  nome             VARCHAR NOT NULL
);

INSERT INTO departamentos VALUES
  (1, 'Diretoria'),
  (2, 'Vendas'),
  (3, 'Engenharia'),
  (4, 'Marketing'),
  (5, 'Financeiro'),
  (6, 'RH');

CREATE TABLE funcionarios (
  funcionario_id  INTEGER PRIMARY KEY,
  nome            VARCHAR NOT NULL,
  cargo           VARCHAR NOT NULL,
  salario         DECIMAL(10, 2) NOT NULL,
  departamento_id INTEGER NOT NULL REFERENCES departamentos(departamento_id),
  -- Auto-referência (aponta pro funcionario_id do próprio gerente): sem FK formal de propósito,
  -- porque o DuckDB valida a restrição linha a linha durante o INSERT em lote abaixo.
  gerente_id      INTEGER,
  contratado_em   DATE NOT NULL
);

INSERT INTO funcionarios VALUES
  -- Diretoria
  (1,  'Fernando Duarte',   'CEO',                    45000.00, 1, NULL, '2019-01-10'),

  -- Chefes de departamento (todos reportam ao CEO)
  (2,  'Marina Souza',      'Gerente de Vendas',       14000.00, 2, 1, '2019-03-15'),
  (3,  'Diego Ramos',       'Gerente de Engenharia',   16000.00, 3, 1, '2019-02-20'),
  (4,  'Isabela Ferreira',  'Gerente de Marketing',    13000.00, 4, 1, '2019-05-05'),
  (5,  'Rafael Lima',       'Gerente Financeiro',      13500.00, 5, 1, '2019-04-18'),
  (6,  'Patricia Alves',    'Gerente de RH',           12500.00, 6, 1, '2019-06-01'),

  -- Vendas (reportam à Marina, #2)
  (7,  'Bruno Castro',      'Vendedor Sênior',         15000.00, 2, 2, '2020-01-12'),
  (8,  'Ana Silva',         'Vendedora',                7000.00, 2, 2, '2020-02-14'),
  (9,  'Thales Oliveira',   'Vendedor',                 6500.00, 2, 2, '2020-03-19'),
  (10, 'Renata Costa',      'Vendedora',                6800.00, 2, 2, '2020-07-22'),
  (11, 'Gustavo Pires',     'Vendedor',                 6200.00, 2, 2, '2021-01-11'),
  (12, 'Larissa Mota',      'Vendedora',                7200.00, 2, 2, '2021-05-09'),

  -- Engenharia (reportam ao Diego, #3)
  (13, 'Camila Nogueira',   'Engenheira Principal',    20000.00, 3, 3, '2019-08-14'),
  (14, 'Thiago Mendes',     'Engenheiro Principal',    20000.00, 3, 3, '2020-01-20'),
  (15, 'Carlos Souza',      'Engenheiro Sênior',       12000.00, 3, 3, '2019-11-03'),
  (16, 'Juliana Rocha',     'Engenheira Sênior',       11500.00, 3, 3, '2020-04-17'),
  (17, 'Pedro Almeida',     'Engenheiro Pleno',         9000.00, 3, 3, '2020-09-25'),
  (18, 'Beatriz Lopes',     'Engenheira Pleno',         8800.00, 3, 3, '2021-02-08'),
  (19, 'Vinícius Rezende',  'Engenheiro Júnior',        6500.00, 3, 3, '2022-03-14'),
  (20, 'Yasmin Cardoso',    'Engenheira Júnior',        6300.00, 3, 3, '2022-06-30'),

  -- Marketing (reportam à Isabela, #4)
  (21, 'Ana Silva',         'Analista de Marketing',    6800.00, 4, 4, '2020-05-11'),
  (22, 'Felipe Tavares',    'Analista de Marketing',    6600.00, 4, 4, '2020-08-19'),
  (23, 'Sabrina Dias',      'Analista de Marketing',    6900.00, 4, 4, '2021-03-02'),
  (24, 'Otávio Batista',    'Analista de Marketing',    6400.00, 4, 4, '2021-09-16'),
  (25, 'Manuela Freitas',   'Coordenadora de Marketing', 9500.00, 4, 4, '2019-12-05'),

  -- Financeiro (reportam ao Rafael, #5)
  (26, 'Carlos Souza',      'Analista Financeiro',      7500.00, 5, 5, '2020-06-23'),
  (27, 'Débora Martins',    'Analista Financeiro',      7300.00, 5, 5, '2020-10-14'),
  (28, 'Henrique Barros',   'Analista Financeiro',      7100.00, 5, 5, '2021-04-27'),
  (29, 'Natália Correia',   'Contadora',                8900.00, 5, 5, '2019-09-09'),
  (30, 'Leandro Vieira',    'Analista Financeiro',      7400.00, 5, 5, '2021-11-30'),

  -- RH (reportam à Patricia, #6)
  (31, 'Fernanda Rangel',   'Analista de RH',           6700.00, 6, 6, '2020-02-27'),
  (32, 'Marcelo Nunes',     'Analista de RH',           6600.00, 6, 6, '2020-12-15'),
  (33, 'Priscila Cunha',    'Analista de RH',           6900.00, 6, 6, '2021-06-08'),
  (34, 'Rodrigo Farias',    'Coordenador de RH',        9200.00, 6, 6, '2019-10-21');
