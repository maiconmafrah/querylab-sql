// Utilitários de texto SQL. Sem dependências: usado pelo site, pelos testes e pelo script de validação.

/** Divide um texto em comandos SQL, respeitando strings, identificadores entre aspas e comentários. */
export function dividirComandos(sql: string): string[] {
  const comandos: string[] = [];
  let atual = '';
  let i = 0;

  while (i < sql.length) {
    const c = sql[i];
    const proximo = sql[i + 1];

    if (c === '-' && proximo === '-') {
      const fim = sql.indexOf('\n', i);
      const ate = fim === -1 ? sql.length : fim;
      atual += sql.slice(i, ate);
      i = ate;
      continue;
    }

    if (c === '/' && proximo === '*') {
      const fim = sql.indexOf('*/', i + 2);
      const ate = fim === -1 ? sql.length : fim + 2;
      atual += sql.slice(i, ate);
      i = ate;
      continue;
    }

    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c && sql[j + 1] === c) {
          j += 2;
        } else if (sql[j] === c) {
          break;
        } else {
          j++;
        }
      }
      atual += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    if (c === '$' && proximo === '$') {
      const fim = sql.indexOf('$$', i + 2);
      const ate = fim === -1 ? sql.length : fim + 2;
      atual += sql.slice(i, ate);
      i = ate;
      continue;
    }

    if (c === ';') {
      comandos.push(atual);
      atual = '';
      i++;
      continue;
    }

    atual += c;
    i++;
  }
  comandos.push(atual);

  return comandos.map((comando) => comando.trim()).filter((comando) => removerComentarios(comando).trim() !== '');
}

export function removerComentarios(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Primeira palavra-chave do comando (SELECT, WITH, INSERT...), em maiúsculas. */
export function tipoComando(comando: string): string {
  const palavra = /^[\s(]*([a-zA-Z]+)/.exec(removerComentarios(comando));
  return palavra ? palavra[1].toUpperCase() : '';
}

/** Traduz o começo das mensagens de erro do DuckDB para um título amigável. */
export function tituloErro(mensagem: string): string {
  const tipos: [RegExp, string][] = [
    [/^Parser Error/i, 'Erro de sintaxe'],
    [/^Binder Error/i, 'Coluna ou tabela não encontrada'],
    [/^Catalog Error/i, 'Tabela ou função não existe'],
    [/^Conversion Error/i, 'Erro de conversão de tipo'],
    [/^Constraint Error/i, 'Restrição violada'],
    [/^Invalid Input Error/i, 'Valor inválido'],
    [/^Out of Range Error/i, 'Valor fora do intervalo'],
    [/^Division by zero/i, 'Divisão por zero'],
    [/^Not implemented Error/i, 'Recurso não suportado'],
    [/^TransactionContext Error/i, 'Erro de transação'],
  ];
  return tipos.find(([padrao]) => padrao.test(mensagem))?.[1] ?? 'Erro ao executar a consulta';
}
