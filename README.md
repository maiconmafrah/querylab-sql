# querylab

Plataforma para treinar SQL resolvendo incidentes de dados que acontecem de verdade: missões com chamados e checkpoints, trilhas, simulados com tempo e um playground livre. O banco de dados (DuckDB) roda **dentro do navegador**, então o site não precisa de servidor.

## Como rodar

Requisito: [Node.js](https://nodejs.org) 24 ou mais novo.

### Com dois cliques

Dê dois cliques em **`Abrir Querylab.bat`**. Uma janela preta abre e faz tudo sozinha:

1. na primeira vez, instala as dependências;
2. monta o site com o conteúdo atual de `content/` (só quando algo mudou);
3. coloca o site no ar e abre o navegador.

A janela mostra dois endereços:

| Endereço | Onde usar |
| --- | --- |
| `http://localhost:4173` | Neste computador |
| `http://<IP do computador>:4173` | Em outro aparelho conectado na mesma rede (celular, notebook, outro PC) |

- O site fica no ar **enquanto a janela estiver aberta**. Para desligar, feche a janela.
- Na primeira vez, o Windows pode perguntar sobre o Firewall. Marque **Redes privadas** e clique em **Permitir**, senão os outros aparelhos não conseguem abrir.
- Criou ou editou uma missão? Feche a janela e dê dois cliques de novo: o site é remontado com o conteúdo novo.
- O progresso fica salvo por aparelho e por endereço. `localhost` e o IP contam como endereços diferentes, então use sempre o mesmo em cada aparelho.

### Pelo terminal

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

| Comando | O que faz |
| --- | --- |
| `npm run abrir` | O mesmo que o `Abrir Querylab.bat`: monta, coloca no ar na rede interna e abre o navegador |
| `npm run dev` | Sobe o site em modo desenvolvimento, recarregando a cada alteração |
| `npm run validar` | Confere todo o conteúdo de `content/` e roda cada resposta e gabarito no DuckDB |
| `npm test` | Roda os testes das regras de correção, níveis e divisão de comandos SQL |
| `npm run build` | Gera a versão final em `dist/` |
| `npm run preview` | Serve a pasta `dist/` localmente para conferir o build |

## Login com Google (progresso na nuvem)

Sem configurar nada, o progresso continua salvo só neste navegador (como sempre foi). Para permitir "Entrar com Google" e acessar o mesmo progresso de qualquer aparelho, é preciso um projeto Firebase gratuito (Authentication + Firestore):

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → aba "Sign-in method" → ative o provedor **Google**.
3. **Firestore Database** → criar banco → modo produção (as regras de segurança já vêm prontas, veja `firestore.rules` neste repositório — cole o conteúdo dele em Firestore → Regras).
4. **Configurações do projeto** → "Seus apps" → app da Web (ícone `</>`) → copie o objeto `firebaseConfig`.
5. Copie `.env.example` para `.env.local` e preencha as seis chaves com os valores do passo 4.
6. Rode `npm run dev` de novo: o botão "Entrar com Google" aparece no menu lateral.

Essas chaves não são segredo (o Firebase é protegido pelas regras do Firestore, não por elas ficarem escondidas), mas para publicar no GitHub Pages via Actions (`.github/workflows/deploy.yml`) é preciso cadastrá-las como **Secrets** do repositório: `Settings → Secrets and variables → Actions → New repository secret`, uma para cada `VITE_FIREBASE_*` do `.env.example`.

## Lembrete por e-mail de sequência

Opcional. Todo dia às 20h (horário de Brasília), uma Cloud Function (`functions/`) confere quem está com uma sequência de dias ativa mas ainda não estudou hoje e enfileira um e-mail de lembrete. Precisa de:

1. **Upgrade do projeto Firebase para o plano Blaze** (pago por uso — Cloud Functions não roda no plano gratuito Spark). Nesse volume de uso, o custo real fica dentro da cota grátis do Blaze, mas é preciso cadastrar um cartão.
2. Instalar a extensão oficial **[Trigger Email from Firestore](https://extensions.dev/extensions/firebase/firestore-send-email)** (Firebase Console → Extensions → procure "Trigger Email") e configurar com as credenciais SMTP de um provedor (ex.: [SendGrid](https://sendgrid.com), tem plano grátis). Aponte a extensão para a coleção `mail` — é nela que a function escreve.
3. Rodar `npm install` dentro de `functions/` e depois `npm run deploy` (ou `firebase deploy --only functions` na raiz).
4. Em `src/paginas/Progresso.tsx`, trocar `LEMBRETE_POR_EMAIL_PUBLICADO` para `true` e publicar o site: só aí o botão "Lembrete por e-mail" aparece pra quem está logado (até isso, ele fica escondido pra não prometer um e-mail que não sai).

Se o site estiver publicado em outro endereço além do padrão do GitHub Pages deste repositório, copie `functions/.env.example` para `functions/.env` e ajuste `SITE_URL` antes do deploy.

Depois de ligado, cada pessoa pode desativar esse aviso a qualquer momento em Progresso → Configurações → "Lembrete por e-mail".

## Estrutura

```
content/              ← todo o conteúdo do site (é aqui que você cria coisas novas)
  datasets/           ← scripts .sql que criam as tabelas de cada missão/simulado
  treinamentos/       ← uma missão por arquivo .json
  trilhas/            ← sequências de missões
  simulados/          ← provas
  temas.json          ← temas usados nos filtros e no desempenho
  referencia.json     ← a página Referência SQL
scripts/              ← validação do conteúdo (npm run validar)
src/
  db/                 ← DuckDB no navegador e ambientes isolados
  lib/                ← regras puras: correção de respostas, níveis, SQL (com testes)
  estado/             ← progresso do aluno (salvo no navegador)
  componentes/        ← editor SQL, tabela de resultado, menu lateral...
  paginas/            ← uma tela por arquivo
  estilos/            ← CSS da direção visual "Missões"
mockups/              ← os mockups de design do projeto
```

Arquivos novos em `content/` aparecem no site automaticamente. Não é preciso registrar nada no código.

## Criando conteúdo

O fluxo é sempre o mesmo:

1. escreva ou reaproveite um dataset em `content/datasets/`;
2. crie o JSON;
3. rode `npm run validar`. O script mostra a resposta esperada de cada checkpoint e aponta qualquer erro.

### Dataset (`content/datasets/nome.sql`)

Um script SQL comum, com `CREATE TABLE` e `INSERT`. Ele roda do zero toda vez que alguém abre a missão.

- Gere dados de forma **determinística**: use `range()` e contas com `%` em vez de `random()`. Assim os números da história batem sempre.
- Dá para reaproveitar o mesmo dataset em várias missões e simulados (o `loja.sql` é usado por vários).

### Treinamento (`content/treinamentos/<id>.json`)

O nome do arquivo precisa ser igual ao `id`.

```json
{
  "id": "minha-missao",
  "titulo": "Título que aparece no card",
  "resumo": "Uma frase sobre o problema, sem entregar a causa.",
  "tema": "joins",
  "dificuldade": "medio",
  "duracao_min": 25,
  "dataset": "loja.sql",
  "publicado_em": "2026-09-20",
  "chamado": [
    { "autor": "Marina", "papel": "Financeiro", "texto": "Mensagem de quem abriu o chamado." },
    { "autor": "pipeline", "papel": "carga_pedidos", "log": ["08:05  timeout", "08:07  retry"] },
    { "autor": "painel", "papel": "consulta do painel", "codigo": "SELECT ..." }
  ],
  "consulta_inicial": "SELECT * FROM pedidos LIMIT 10;",
  "checkpoints": [
    {
      "titulo": "Nome curto",
      "pergunta": "Pergunta com resposta única",
      "tipo": "valor",
      "resposta_sql": "SELECT COUNT(*) FROM pedidos",
      "tolerancia": 0,
      "unidade": "R$",
      "xp": 40,
      "dicas": ["Dica 1", "Dica 2"],
      "explicacao": "Aparece depois que o aluno acerta."
    },
    {
      "titulo": "Nome curto",
      "pergunta": "Peça a consulta dizendo exatamente quais colunas devem sair",
      "tipo": "query",
      "gabarito_sql": "SELECT uf, COUNT(*) AS qtd FROM clientes GROUP BY uf",
      "ordem_importa": false,
      "tolerancia": 0.01,
      "xp": 60,
      "dicas": ["..."],
      "explicacao": "..."
    }
  ]
}
```

Os dois tipos de checkpoint:

- **`valor`**: o aluno digita uma resposta. A `resposta_sql` deve devolver **1 linha e 1 coluna**. Números aceitam `1.234,56`, `1234.56` e `R$ 1.234,56`; textos ignoram maiúsculas e acentos.
- **`query`**: o aluno escreve a consulta. O resultado dela é comparado com o do `gabarito_sql`, com as mesmas colunas, na mesma quantidade de linhas e com os mesmos valores. Com `ordem_importa: true`, a ordem das linhas também conta; nesse caso, garanta que não há empate no `ORDER BY`.

Campos opcionais: `requer` (lista de ids que precisam estar concluídos), `consulta_inicial`, `dicas`, `explicacao`, `tolerancia`, `unidade`.

Missões publicadas nos últimos 14 dias ganham a etiqueta **Nova**.

### Trilha (`content/trilhas/<id>.json`)

```json
{
  "id": "window-functions",
  "numero": 3,
  "titulo": "Window Functions",
  "descricao": "Rankings, acumulados e comparações entre períodos.",
  "missoes": ["missao-1", "missao-2"],
  "simulado_final": "sql-intermediario"
}
```

As missões de uma trilha liberam em ordem. Na página Progresso existe um **modo livre** que ignora essa ordem.

### Simulado (`content/simulados/<id>.json`)

```json
{
  "id": "sql-avancado",
  "numero": 3,
  "titulo": "SQL Avançado",
  "descricao": "...",
  "dificuldade": "dificil",
  "tempo_min": 45,
  "nota_minima": 70,
  "xp_por_acerto": 20,
  "dataset": "loja.sql",
  "publicado_em": "2026-10-01",
  "questoes": [
    {
      "id": "q1",
      "tipo": "multipla",
      "tema": "joins",
      "enunciado": "...",
      "codigo": "SQL opcional mostrado com o enunciado",
      "formato_alternativas": "codigo",
      "alternativas": ["...", "...", "...", "..."],
      "correta": 1,
      "explicacao": "..."
    },
    {
      "id": "q2",
      "tipo": "sql",
      "tema": "agregacoes",
      "enunciado": "...",
      "gabarito_sql": "SELECT ...",
      "ordem_importa": false,
      "explicacao": "..."
    }
  ]
}
```

- `correta` é o índice da alternativa, começando em **0**.
- `formato_alternativas: "codigo"` mostra as alternativas como SQL.
- Questões `sql` exigem o campo `dataset` no simulado.

### Temas e referência

- `content/temas.json` lista os temas válidos. Crie um tema novo antes de usá-lo.
- `content/referencia.json` alimenta a página Referência SQL. Os exemplos rodam no dataset `loja.sql` e também são validados.

## Progresso do aluno

XP, níveis, sequência de dias, missões e notas ficam salvos no `localStorage` do navegador. Na página **Progresso** dá para exportar e importar um backup em JSON.

## Publicando

`npm run build` gera um site estático em `dist/`, que pode ir para Netlify, Vercel, Cloudflare Pages ou GitHub Pages. O site usa caminhos relativos e rotas com `#`, então funciona em qualquer subpasta, sem configuração extra.

Os arquivos do DuckDB (`.wasm`, ~35 MB cada, ~8 MB compactados) são baixados só quando alguém abre uma missão, o playground ou uma prova.
