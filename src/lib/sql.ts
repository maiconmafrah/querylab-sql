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
    // Casos específicos de Binder Error, checados antes do genérico abaixo.
    [/Ambiguous reference to column/i, 'Coluna ambígua'],
    [/must appear in the GROUP BY clause/i, 'Coluna fora do GROUP BY'],
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

/**
 * Tenta traduzir a mensagem crua do DuckDB numa explicação em português, pros erros mais comuns
 * de quem está aprendendo. Devolve null quando não reconhece o formato — nesse caso, mostre a
 * mensagem original.
 */
export function explicarErro(mensagem: string): string | null {
  let m: RegExpExecArray | null;

  if ((m = /Ambiguous reference to column name "([^"]+)" \(use: (.+?)\)/i.exec(mensagem))) {
    const opcoes = m[2].replace(/ or /gi, ' ou ');
    return `A coluna "${m[1]}" existe em mais de uma tabela dessa consulta, e o banco não sabe qual você quer dizer. Use ${opcoes} pra indicar de qual tabela.`;
  }

  if ((m = /column "([^"]+)" must appear in the GROUP BY clause/i.exec(mensagem))) {
    return `A coluna "${m[1]}" não está dentro de uma função de agregação (como COUNT ou SUM), então ela precisa aparecer no GROUP BY.`;
  }

  if ((m = /Referenced column "([^"]+)" not found/i.exec(mensagem))) {
    const candidatos = /Candidate bindings:\s*(.+)/i.exec(mensagem);
    const sugestao = candidatos?.[1].split(',')[0]?.trim();
    return `A coluna "${m[1]}" não existe nessa tabela.${sugestao ? ` Você quis dizer ${sugestao}?` : ''}`;
  }

  if ((m = /Table with name (\S+) does not exist/i.exec(mensagem))) {
    const sugestao = /Did you mean "([^"]+)"/i.exec(mensagem)?.[1];
    return `A tabela "${m[1]}" não existe.${sugestao ? ` Você quis dizer "${sugestao}"?` : ''}`;
  }

  if (/syntax error at end of input/i.test(mensagem)) {
    return 'A consulta parece ter parado no meio — falta alguma coisa no final (uma condição depois do WHERE, um valor, um parêntese fechando).';
  }

  if ((m = /syntax error at or near "([^"]+)"/i.exec(mensagem))) {
    return `Tem alguma coisa estranha perto de "${m[1]}" — confira se não falta uma vírgula, um parêntese ou se não sobrou uma palavra a mais ali.`;
  }

  return null;
}
