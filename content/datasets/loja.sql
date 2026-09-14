-- Dataset "loja": clientes, produtos, pedidos e itens de uma loja on-line fictícia.
-- Usado na trilha Fundamentos e nos simulados.

CREATE TABLE clientes (
  cliente_id    INTEGER PRIMARY KEY,
  nome          VARCHAR NOT NULL,
  email         VARCHAR,
  cidade        VARCHAR NOT NULL,
  uf            VARCHAR NOT NULL,
  cadastrado_em DATE NOT NULL
);

INSERT INTO clientes VALUES
  (1,  'Ana Souza',        'ana.souza@email.com',        'São Paulo',            'SP', '2025-01-12'),
  (2,  'Bruno Lima',       'bruno.lima@email.com',       'Rio de Janeiro',       'RJ', '2025-01-20'),
  (3,  'Carla Mendes',     'carla.mendes@email.com',     'Belo Horizonte',       'MG', '2025-02-03'),
  (4,  'Diego Rocha',      NULL,                         'Campinas',             'SP', '2025-02-15'),
  (5,  'Elisa Martins',    'elisa.martins@email.com',    'Porto Alegre',         'RS', '2025-02-28'),
  (6,  'Felipe Araújo',    'felipe.araujo@email.com',    'Curitiba',             'PR', '2025-03-09'),
  (7,  'Gabriela Nunes',   'gabriela.nunes@email.com',   'Salvador',             'BA', '2025-03-18'),
  (8,  'Henrique Castro',  'henrique.castro@email.com',  'Recife',               'PE', '2025-03-30'),
  (9,  'Isabela Ferreira', 'isabela.ferreira@email.com', 'São Paulo',            'SP', '2025-04-07'),
  (10, 'João Pereira',     'joao.pereira@email.com',     'Niterói',              'RJ', '2025-04-19'),
  (11, 'Karina Duarte',    'karina.duarte@email.com',    'Uberlândia',           'MG', '2025-05-02'),
  (12, 'Lucas Barbosa',    NULL,                         'Santos',               'SP', '2025-05-14'),
  (13, 'Mariana Teixeira', 'mariana.teixeira@email.com', 'Florianópolis',        'SC', '2025-05-25'),
  (14, 'Nicolas Freitas',  'nicolas.freitas@email.com',  'Londrina',             'PR', '2025-06-06'),
  (15, 'Olívia Cardoso',   'olivia.cardoso@email.com',   'São Paulo',            'SP', '2025-06-17'),
  (16, 'Pedro Almeida',    'pedro.almeida@email.com',    'Rio de Janeiro',       'RJ', '2025-06-29'),
  (17, 'Quésia Ramos',     'quesia.ramos@email.com',     'Juiz de Fora',         'MG', '2025-07-10'),
  (18, 'Rafael Gomes',     'rafael.gomes@email.com',     'Caxias do Sul',        'RS', '2025-07-21'),
  (19, 'Sabrina Lopes',    'sabrina.lopes@email.com',    'Ribeirão Preto',       'SP', '2025-08-02'),
  (20, 'Tiago Moreira',    'tiago.moreira@email.com',    'Feira de Santana',     'BA', '2025-08-13'),
  (21, 'Úrsula Pinto',     'ursula.pinto@email.com',     'São Paulo',            'SP', '2025-08-25'),
  (22, 'Vinícius Correia', 'vinicius.correia@email.com', 'Petrópolis',           'RJ', '2025-09-05'),
  (23, 'Wesley Vieira',    NULL,                         'Contagem',             'MG', '2025-09-16'),
  (24, 'Yasmin Ribeiro',   'yasmin.ribeiro@email.com',   'Maringá',              'PR', '2025-09-28'),
  (25, 'Zeca Monteiro',    'zeca.monteiro@email.com',    'Sorocaba',             'SP', '2025-10-09'),
  (26, 'Amanda Cunha',     'amanda.cunha@email.com',     'Pelotas',              'RS', '2025-10-20'),
  (27, 'Bernardo Dias',    'bernardo.dias@email.com',    'Rio de Janeiro',       'RJ', '2025-11-01'),
  (28, 'Camila Farias',    'camila.farias@email.com',    'São Paulo',            'SP', '2025-11-12'),
  (29, 'Davi Batista',     'davi.batista@email.com',     'Olinda',               'PE', '2025-11-23'),
  (30, 'Eduarda Melo',     'eduarda.melo@email.com',     'Joinville',            'SC', '2025-12-04'),
  (31, 'Fábio Rezende',    'fabio.rezende@email.com',    'Belo Horizonte',       'MG', '2025-12-15'),
  (32, 'Giovana Prado',    'giovana.prado@email.com',    'Guarulhos',            'SP', '2025-12-27'),
  (33, 'Hugo Siqueira',    'hugo.siqueira@email.com',    'Duque de Caxias',      'RJ', '2026-01-07'),
  (34, 'Ingrid Azevedo',   'ingrid.azevedo@email.com',   'Cascavel',             'PR', '2026-01-18'),
  (35, 'Júlio Tavares',    'julio.tavares@email.com',    'Santa Maria',          'RS', '2026-01-30'),
  (36, 'Lara Campos',      'lara.campos@email.com',      'São Paulo',            'SP', '2026-02-10'),
  (37, 'Márcio Brandão',   'marcio.brandao@email.com',   'Vitória da Conquista', 'BA', '2026-02-21'),
  (38, 'Natália Queiroz',  'natalia.queiroz@email.com',  'Osasco',               'SP', '2026-03-05'),
  (39, 'Otávio Lacerda',   'otavio.lacerda@email.com',   'Nova Iguaçu',          'RJ', '2026-03-16'),
  (40, 'Paula Xavier',     'paula.xavier@email.com',     'Montes Claros',        'MG', '2026-03-28');

CREATE TABLE produtos (
  produto_id INTEGER PRIMARY KEY,
  nome       VARCHAR NOT NULL,
  categoria  VARCHAR NOT NULL,
  preco      DECIMAL(10, 2) NOT NULL
);

INSERT INTO produtos VALUES
  (1,  'Fone Bluetooth Pulse',      'Eletrônicos', 249.90),
  (2,  'Carregador Turbo 30W',      'Eletrônicos',  89.90),
  (3,  'Smartwatch Fit 2',          'Eletrônicos', 599.00),
  (4,  'Caixa de Som Mini',         'Eletrônicos', 179.50),
  (5,  'Jogo de Panelas Inox',      'Casa',        459.00),
  (6,  'Luminária de Mesa LED',     'Casa',        129.90),
  (7,  'Kit Toalhas Algodão',       'Casa',         99.90),
  (8,  'Organizador de Gavetas',    'Casa',         49.90),
  (9,  'Guia Prático de Consultas', 'Livros',       89.00),
  (10, 'Números que Falam',         'Livros',       74.50),
  (11, 'Automação com Python',      'Livros',       99.00),
  (12, 'Painéis que Convencem',     'Livros',       69.90),
  (13, 'Tapete de Yoga',            'Esporte',     119.00),
  (14, 'Garrafa Térmica 1L',        'Esporte',      79.90),
  (15, 'Halteres 5kg (par)',        'Esporte',     149.00),
  (16, 'Corda de Pular',            'Esporte',      34.90),
  (17, 'Protetor Solar FPS 50',     'Beleza',       59.90),
  (18, 'Sérum Vitamina C',          'Beleza',      119.90),
  (19, 'Kit Skincare Noturno',      'Beleza',      219.00),
  (20, 'Escova Secadora',           'Beleza',      289.00);

CREATE TABLE itens_pedido (
  pedido_id      INTEGER NOT NULL,
  produto_id     INTEGER NOT NULL,
  quantidade     INTEGER NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL
);

-- Cada pedido tem de 1 a 3 itens. Alguns produtos aparecem com mais frequência (os campeões de venda).
INSERT INTO itens_pedido
SELECT itens.pedido_id,
       itens.produto_id,
       SUM(itens.quantidade) AS quantidade,
       ANY_VALUE(pr.preco) AS preco_unitario
FROM (
  SELECT p.i AS pedido_id,
         [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          17, 17, 14, 1, 9, 12, 17, 3][((p.i * 7 + k.k * 11 + (p.i * p.i) % 13) % 28) + 1] AS produto_id,
         1 + ((p.i * 3 + k.k * 5 + (p.i * p.i) % 7) % 4) AS quantidade
  FROM range(1, 601) AS p(i)
  CROSS JOIN range(0, 3) AS k(k)
  WHERE k.k <= ((p.i * 5) % 7) % 3
) itens
JOIN produtos pr ON pr.produto_id = itens.produto_id
GROUP BY itens.pedido_id, itens.produto_id;

CREATE TABLE pedidos (
  pedido_id   INTEGER PRIMARY KEY,
  cliente_id  INTEGER NOT NULL,
  criado_em   TIMESTAMP NOT NULL,
  status      VARCHAR NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL
);

INSERT INTO pedidos
SELECT p.i AS pedido_id,
       1 + ((p.i * 17 + (p.i * p.i) % 11) % 37) AS cliente_id,
       TIMESTAMP '2026-06-01 08:00:00'
         + to_days(CAST((p.i * 37 + (p.i * p.i) % 41) % 90 AS INTEGER))
         + to_minutes(CAST((p.i * 53 + (p.i * p.i) % 97) % 840 AS BIGINT)) AS criado_em,
       CASE WHEN p.i % 13 = 0 THEN 'cancelado'
            WHEN p.i % 9 = 0 THEN 'pendente'
            ELSE 'pago' END AS status,
       t.total AS valor_total
FROM range(1, 601) AS p(i)
JOIN (
  SELECT pedido_id, SUM(quantidade * preco_unitario) AS total
  FROM itens_pedido
  GROUP BY pedido_id
) t ON t.pedido_id = p.i;
