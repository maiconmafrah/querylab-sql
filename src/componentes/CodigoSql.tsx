import type { ReactNode } from 'react';

const PALAVRAS_CHAVE = new Set(
  (
    'SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN LEFT RIGHT FULL INNER OUTER CROSS GROUP BY ORDER HAVING ' +
    'LIMIT OFFSET DISTINCT CASE WHEN THEN ELSE END WITH UNION ALL EXISTS BETWEEN LIKE ILIKE ASC DESC OVER PARTITION ' +
    'FILTER QUALIFY INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE VIEW DROP ALTER PRIMARY KEY INTERVAL DAY MONTH ' +
    'YEAR HOUR MINUTE TRUE FALSE BEGIN COMMIT ROLLBACK USING LATERAL RECURSIVE ROWS RANGE PRECEDING FOLLOWING ' +
    'UNBOUNDED CURRENT ROW CONFLICT DO NOTHING DATE TIMESTAMP INTEGER VARCHAR DECIMAL SHOW TABLES DESCRIBE'
  ).split(' '),
);

const FUNCOES = new Set(
  (
    'COUNT SUM AVG MIN MAX ROUND CAST COALESCE NULLIF DATE_TRUNC EXTRACT DATE_DIFF STRFTIME ROW_NUMBER RANK ' +
    'DENSE_RANK LAG LEAD STRING_AGG LOWER UPPER TRIM LENGTH SUBSTRING ABS ANY_VALUE LIST STRIP_ACCENTS'
  ).split(' '),
);

const TOKEN = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g;

/** Destaque de sintaxe simples para blocos de SQL somente leitura. */
export function destacarSql(codigo: string): ReactNode[] {
  const partes: ReactNode[] = [];
  let texto = '';
  let chave = 0;

  const soltarTexto = () => {
    if (texto) {
      partes.push(texto);
      texto = '';
    }
  };
  const marcar = (classe: string, valor: string) => {
    soltarTexto();
    partes.push(
      <span key={chave++} className={classe}>
        {valor}
      </span>,
    );
  };

  for (const encontrado of codigo.matchAll(TOKEN)) {
    const [valor, comentario, string, numero, palavra] = encontrado;
    if (comentario) {
      marcar('sql-comentario', valor);
    } else if (string) {
      marcar('sql-texto', valor);
    } else if (numero) {
      marcar('sql-numero', valor);
    } else if (palavra) {
      const maiuscula = palavra.toUpperCase();
      const seguidaDeParenteses = /^\s*\(/.test(codigo.slice((encontrado.index ?? 0) + valor.length));
      if (FUNCOES.has(maiuscula) && seguidaDeParenteses) marcar('sql-funcao', valor);
      else if (PALAVRAS_CHAVE.has(maiuscula)) marcar('sql-chave', valor);
      else texto += valor;
    } else {
      texto += valor;
    }
  }
  soltarTexto();
  return partes;
}

export function CodigoSql({ codigo, className = 'codigo' }: { codigo: string; className?: string }) {
  return (
    <pre className={className}>
      <code>{destacarSql(codigo)}</code>
    </pre>
  );
}
