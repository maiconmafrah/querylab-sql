---
name: planejar-trilha
description: Planeja e constrói trilhas e missões de SQL do QueryLab (content/trilhas, content/treinamentos) começando do absoluto iniciante e evoluindo um conceito por vez. Use sempre que o pedido for para criar, expandir ou completar uma trilha, adicionar missões/treinamentos, ou "fazer uma trilha grandona" de algum tema de SQL — em vez de gerar as missões direto, planeja a progressão inteira primeiro.
---

# Planejar trilha

Construir uma trilha (ex.: "Fundamentos de SQL") não é gerar 3-4 missões e parar. É desenhar a progressão completa do zero até o teto do tema, com uma missão por conceito novo, e só depois codar — uma missão por vez, validando cada uma antes de seguir pra próxima.

Nunca gere várias missões de uma vez sem antes ter o plano aprovado. Esse é o erro mais comum: pular direto pro JSON e acabar com uma trilha curta demais ou com saltos de dificuldade (ex.: ir de SELECT simples direto pra JOIN com agregação).

## Passo 1 — Diagnóstico

Antes de planejar, leia:
- `content/temas.json` — a lista de temas existentes (é o vocabulário de progressão: consultas-basicas → agregacoes → joins → nulls → qualidade-de-dados → datas → subqueries → window-functions). Se a trilha precisar de um tema que não existe, avise o usuário antes de inventar um.
- `content/trilhas/<id>.json` — trilha atual (se já existir) e sua lista `missoes`.
- `content/treinamentos/*.json` das missões já na trilha — pra saber que conceitos já foram ensinados e em que ordem.
- `content/datasets/*.sql` — datasets disponíveis. Prefira reaproveitar um dataset já usado na trilha (dá continuidade à história) e só crie um novo dataset quando o conceito exigir uma estrutura de dados diferente (ex.: chaves órfãs, duplicatas, datas complicadas).
- `src/tipos.ts` — formato exato de `Treinamento`, `Checkpoint`, `Trilha` (não invente campos).

## Passo 2 — Desenhar o plano inteiro (antes de qualquer JSON)

Liste TODAS as missões da trilha, do iniciante de verdade até o objetivo final, uma de cada vez, cada uma introduzindo só 1-2 conceitos novos em cima da anterior. Não pule etapas — se a trilha é "Fundamentos de SQL", ela não pode começar em JOIN ou GROUP BY; tem que começar em SELECT/WHERE puro.

Para cada missão do plano, defina:
- **título provisório** e o **incidente/pedido de negócio** que motiva a missão (a "história" — quem pede, por quê)
- **tema** (de `content/temas.json`)
- **dificuldade**: `facil` | `medio` | `dificil` — e a dificuldade tem que crescer ao longo da trilha, não saltar
- **conceito novo** em relação à missão anterior (uma frase: "primeiro WHERE com um único filtro", "primeiro AND/OR", "primeira agregação sem GROUP BY", "primeiro GROUP BY", "primeiro JOIN", etc.)
- **dataset** a usar

Exemplo de progressão mínima pra uma trilha de fundamentos que realmente começa do zero (ajuste ao caso real, mas essa é a régua de granularidade esperada):
1. facil — SELECT de colunas específicas + LIMIT (sem WHERE ainda)
2. facil — WHERE com um filtro simples (igualdade)
3. facil — WHERE com AND/OR + ORDER BY
4. facil — WHERE com IS NULL / IS NOT NULL
5. medio — agregação simples (COUNT/SUM/AVG) sem GROUP BY
6. medio — GROUP BY + HAVING
7. medio — primeiro JOIN (dois pontos, sem agregação)
8. medio — JOIN + GROUP BY juntos
9. dificil — LEFT JOIN e o que muda com linhas sem par
10. dificil — subquery ou CTE simples

Isso é ilustrativo — o plano real depende do tema pedido. Mas a régua "uma coisa nova por missão, dificuldade só sobe" vale sempre.

## Passo 3 — Validar o plano com o usuário

Apresente o plano (lista numerada com título, tema, dificuldade, conceito novo) e pergunte se o escopo e a ordem fazem sentido antes de escrever qualquer arquivo. Ajuste conforme o feedback. Só depois disso comece a gerar conteúdo.

## Passo 4 — Construir uma missão por vez

Para cada missão do plano, nessa ordem, **uma de cada vez**:

1. Escreva o `content/treinamentos/<id>.json` seguindo o formato de `src/tipos.ts` e o tom das missões existentes (veja `content/treinamentos/nulls-media.json` e `mais-vendidos.json` como referência de estilo):
   - `chamado`: 2-3 mensagens que contam um incidente real de negócio (pessoa pedindo algo, um log ou consulta com problema, um contexto). Nada de enunciado seco de exercício de livro.
   - `consulta_inicial` (opcional): uma consulta exploratória pra aluno ver os dados antes do primeiro checkpoint.
   - `checkpoints`: 2-4, progredindo dentro da própria missão do mais simples pro conceito-alvo. Cada checkpoint tem `dicas` (progressivas, sem entregar a resposta de cara) e `explicacao` (o porquê, não só o que).
   - `dificuldade` e `tema` conforme o plano.
2. Adicione o id da missão em `missoes` de `content/trilhas/<id>.json`, na posição correta.
3. Rode `npm run validar` (valida formato, referências entre arquivos e roda todo SQL no DuckDB). Corrija erros antes de seguir.
4. Só depois de validar, avance pra próxima missão do plano.

Não gere um lote de 5 missões e valide todas no final — os erros ficam mais difíceis de rastrear. Uma missão, um validar, próxima.

## Passo 5 — Simulado final

Quando a trilha estiver completa (todo o plano do passo 2 implementado), revise `simulado_final` em `content/simulados/`: as questões devem cobrir os temas trabalhados na trilha inteira, não só os últimos.

## Passo 6 — Checagem final

Rode `npm run validar` uma última vez com a trilha completa e confira o aviso de "não está em nenhuma trilha" pra garantir que nenhuma missão ficou órfã.
