// Índice visual da Referência SQL: os comandos organizados como elementos de uma tabela periódica.
// Cada elemento só guarda pra onde pular — a explicação de verdade mora no card da entrada, embaixo.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

interface Grupo {
  nome: string;
  cor: string;
}

interface Elemento {
  sim: string;
  nome: string;
  grupo: number;
  /** Âncora do card de destino: `${secaoId}-${entradaId}` em Referencia.tsx. */
  alvo: string;
}

const GRUPOS: Grupo[] = [
  { nome: 'Consulta básica', cor: 'var(--amarelo)' },
  { nome: 'Operadores de filtro', cor: 'var(--menta)' },
  { nome: 'Agregação', cor: 'var(--azul)' },
  { nome: 'Junção de tabelas', cor: 'var(--lilas)' },
  { nome: 'Subqueries e CTEs', cor: 'var(--pessego)' },
  { nome: 'Window functions', cor: 'var(--coral)' },
  { nome: 'Manipulação de dados', cor: 'var(--sauge)' },
  { nome: 'Conversão e tratamento', cor: 'var(--rosa)' },
];

const ELEMENTOS: Elemento[] = [
  // ---- 0. Consulta básica ----
  { sim: 'Se', nome: 'SELECT', grupo: 0, alvo: 'consultas-select' },
  { sim: 'Fr', nome: 'FROM', grupo: 0, alvo: 'consultas-select' },
  { sim: 'Wh', nome: 'WHERE', grupo: 0, alvo: 'consultas-where' },
  { sim: 'Di', nome: 'DISTINCT', grupo: 0, alvo: 'consultas-distinct' },
  { sim: 'Ob', nome: 'ORDER BY', grupo: 0, alvo: 'consultas-order-by-limit' },
  { sim: 'Lo', nome: 'LIMIT/OFFSET', grupo: 0, alvo: 'consultas-order-by-limit' },
  { sim: 'As', nome: 'AS', grupo: 0, alvo: 'consultas-as' },

  // ---- 1. Operadores de filtro ----
  { sim: 'Cp', nome: '= != > <', grupo: 1, alvo: 'consultas-comparadores' },
  { sim: 'Ao', nome: 'AND / OR', grupo: 1, alvo: 'consultas-and-or' },
  { sim: 'In', nome: 'IN', grupo: 1, alvo: 'consultas-in-between-like' },
  { sim: 'Bt', nome: 'BETWEEN', grupo: 1, alvo: 'consultas-in-between-like' },
  { sim: 'Lk', nome: 'LIKE', grupo: 1, alvo: 'consultas-in-between-like' },
  { sim: 'Nl', nome: 'IS NULL', grupo: 1, alvo: 'nulls-is-null' },

  // ---- 2. Agregação ----
  { sim: 'Ct', nome: 'COUNT()', grupo: 2, alvo: 'agregacoes-funcoes-agregacao' },
  { sim: 'Sm', nome: 'SUM()', grupo: 2, alvo: 'agregacoes-funcoes-agregacao' },
  { sim: 'Av', nome: 'AVG()', grupo: 2, alvo: 'agregacoes-funcoes-agregacao' },
  { sim: 'Mx', nome: 'MIN/MAX()', grupo: 2, alvo: 'agregacoes-funcoes-agregacao' },
  { sim: 'Gb', nome: 'GROUP BY', grupo: 2, alvo: 'agregacoes-group-by' },
  { sim: 'Hv', nome: 'HAVING', grupo: 2, alvo: 'agregacoes-having' },
  { sim: 'Sa', nome: 'STRING_AGG', grupo: 2, alvo: 'agregacoes-string-agg' },
  { sim: 'Pv', nome: 'Pivot', grupo: 2, alvo: 'agregacoes-pivot' },
  { sim: 'Ru', nome: 'ROLLUP', grupo: 2, alvo: 'agregacoes-rollup' },

  // ---- 3. Junção de tabelas ----
  { sim: 'Ij', nome: 'INNER JOIN', grupo: 3, alvo: 'joins-inner-join' },
  { sim: 'Lj', nome: 'LEFT JOIN', grupo: 3, alvo: 'joins-left-join' },
  { sim: 'Rj', nome: 'RIGHT JOIN', grupo: 3, alvo: 'joins-right-join' },
  { sim: 'Fj', nome: 'FULL OUTER', grupo: 3, alvo: 'joins-full-outer-join' },
  { sim: 'On', nome: 'ON', grupo: 3, alvo: 'joins-inner-join' },
  { sim: 'Sj', nome: 'SELF JOIN', grupo: 3, alvo: 'joins-self-join' },
  { sim: 'Xj', nome: 'CROSS JOIN', grupo: 3, alvo: 'joins-cross-join' },
  { sim: 'Un', nome: 'UNION', grupo: 3, alvo: 'joins-union' },
  { sim: 'Ie', nome: 'INTERSECT', grupo: 3, alvo: 'joins-intersect-except' },

  // ---- 4. Subqueries e CTEs ----
  { sim: 'Sw', nome: 'Subquery WHERE', grupo: 4, alvo: 'subqueries-subquery-where' },
  { sim: 'Sf', nome: 'Subquery FROM', grupo: 4, alvo: 'subqueries-subquery-from' },
  { sim: 'Ex', nome: 'EXISTS', grupo: 4, alvo: 'joins-anti-join' },
  { sim: 'Wi', nome: 'WITH ... AS', grupo: 4, alvo: 'subqueries-cte' },
  { sim: 'Wr', nome: 'WITH RECURSIVE', grupo: 4, alvo: 'subqueries-with-recursive' },

  // ---- 5. Window functions ----
  { sim: 'Rn', nome: 'ROW_NUMBER()', grupo: 5, alvo: 'window-functions-ranking' },
  { sim: 'Rk', nome: 'RANK()', grupo: 5, alvo: 'window-functions-ranking' },
  { sim: 'Pb', nome: 'PARTITION BY', grupo: 5, alvo: 'window-functions-ranking' },
  { sim: 'Ll', nome: 'LAG/LEAD', grupo: 5, alvo: 'window-functions-lag-lead' },
  { sim: 'Ov', nome: 'SUM() OVER', grupo: 5, alvo: 'window-functions-soma-acumulada' },
  { sim: 'Rb', nome: 'ROWS BETWEEN', grupo: 5, alvo: 'window-functions-rows-between' },
  { sim: 'Fv', nome: 'FIRST_VALUE()', grupo: 5, alvo: 'window-functions-first-last-value' },

  // ---- 6. Manipulação de dados ----
  { sim: 'Ins', nome: 'INSERT INTO', grupo: 6, alvo: 'manipulacao-insert' },
  { sim: 'Up', nome: 'UPDATE', grupo: 6, alvo: 'manipulacao-update' },
  { sim: 'De', nome: 'DELETE', grupo: 6, alvo: 'manipulacao-delete' },
  { sim: 'Cr', nome: 'CREATE TABLE', grupo: 6, alvo: 'manipulacao-create-table' },
  { sim: 'Al', nome: 'ALTER TABLE', grupo: 6, alvo: 'manipulacao-alter-table' },
  { sim: 'Pk', nome: 'PK / FK', grupo: 6, alvo: 'manipulacao-chaves' },
  { sim: 'Cv', nome: 'CREATE VIEW', grupo: 6, alvo: 'manipulacao-create-view' },

  // ---- 7. Conversão e tratamento ----
  { sim: 'Ca', nome: 'CAST()', grupo: 7, alvo: 'consultas-cast' },
  { sim: 'Co', nome: 'COALESCE()', grupo: 7, alvo: 'nulls-coalesce' },
  { sim: 'Cw', nome: 'CASE WHEN', grupo: 7, alvo: 'consultas-case-when' },
  { sim: 'Fd', nome: 'Datas', grupo: 7, alvo: 'datas-date-trunc' },
  { sim: 'Ft', nome: 'Texto', grupo: 7, alvo: 'consultas-funcoes-texto' },
  { sim: 'Ni', nome: 'NULLIF()', grupo: 7, alvo: 'nulls-nullif' },
];

export function TabelaPeriodica() {
  const porGrupo = GRUPOS.map((_, i) => ELEMENTOS.filter((e) => e.grupo === i));

  return (
    <section className="tabela-periodica" aria-label="Tabela periódica do SQL — clique num elemento para ir até ele">
      {porGrupo.map((itens, i) => (
        <div className="tabela-periodica__linha" key={GRUPOS[i]!.nome}>
          <div className="tabela-periodica__rotulo" style={{ '--cor': GRUPOS[i]!.cor } as CSSProperties}>
            <b>{GRUPOS[i]!.nome}</b>
          </div>
          {itens.map((e) => (
            <Link
              key={e.alvo + e.sim}
              to={`/referencia#${e.alvo}`}
              className="elemento-sql"
              style={{ '--cor': GRUPOS[e.grupo]!.cor } as CSSProperties}
              title={e.nome}
            >
              <span className="elemento-sql__sim">{e.sim}</span>
              <span className="elemento-sql__nome">{e.nome}</span>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}
