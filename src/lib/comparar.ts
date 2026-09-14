// Comparação de resultados de consultas e de respostas digitadas.
// Arquivo sem dependências: é usado pelo site e pelo script `npm run validar`.

export type Celula = string | number | boolean | null;

export interface Coluna {
  nome: string;
  tipo: string;
}

export interface ResultadoTabela {
  colunas: Coluna[];
  linhas: Celula[][];
}

export interface OpcoesComparacao {
  ordemImporta?: boolean;
  tolerancia?: number;
}

export interface Veredito {
  ok: boolean;
  motivo?: string;
}

const LIMITE_PAREAMENTO = 3000;

export function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralTexto}`;
}

/** Datas-hora à meia-noite viram só data, para `DATE` e `TIMESTAMP` compararem igual. */
export function normalizarCelula(valor: Celula): Celula {
  if (typeof valor === 'string') {
    const meiaNoite = /^(\d{4}-\d{2}-\d{2})[ T]00:00:00(?:\.0+)?$/.exec(valor);
    return meiaNoite ? meiaNoite[1] : valor;
  }
  if (typeof valor === 'number' && Object.is(valor, -0)) return 0;
  return valor;
}

function comoNumero(valor: Celula): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(valor)) return Number(valor);
  return null;
}

export function celulasIguais(a: Celula, b: Celula, tolerancia = 0): boolean {
  const x = normalizarCelula(a);
  const y = normalizarCelula(b);
  if (x === null || y === null) return x === y;
  if (typeof x === 'number' || typeof y === 'number') {
    const nx = comoNumero(x);
    const ny = comoNumero(y);
    if (nx === null || ny === null) return false;
    const margem = tolerancia + 1e-9 * Math.max(1, Math.abs(nx), Math.abs(ny));
    return Math.abs(nx - ny) <= margem;
  }
  return x === y;
}

function linhasIguais(a: Celula[], b: Celula[], tolerancia: number): boolean {
  return a.length === b.length && a.every((celula, i) => celulasIguais(celula, b[i], tolerancia));
}

function chave(linha: Celula[]): string {
  return JSON.stringify(
    linha.map((celula) => {
      const valor = normalizarCelula(celula);
      return typeof valor === 'number' ? Math.round(valor * 1e6) / 1e6 : valor;
    }),
  );
}

function contarLinhasSemPar(esperadas: Celula[][], obtidas: Celula[][], tolerancia: number): number {
  const ordenar = (linhas: Celula[][]) =>
    linhas.map((linha) => ({ linha, chave: chave(linha) })).sort((p, q) => (p.chave < q.chave ? -1 : p.chave > q.chave ? 1 : 0));
  const a = ordenar(esperadas);
  const b = ordenar(obtidas);

  let diferentes = 0;
  for (let i = 0; i < a.length; i++) {
    if (!b[i] || !linhasIguais(a[i].linha, b[i].linha, tolerancia)) diferentes++;
  }
  if (diferentes === 0 || a.length > LIMITE_PAREAMENTO) return diferentes;

  // Valores muito próximos podem ordenar diferente: faz o pareamento um a um.
  const usadas = new Array<boolean>(b.length).fill(false);
  let semPar = 0;
  for (const { linha } of a) {
    const indice = b.findIndex((outra, j) => !usadas[j] && linhasIguais(linha, outra.linha, tolerancia));
    if (indice === -1) semPar++;
    else usadas[indice] = true;
  }
  return semPar;
}

function linhasBatem(esperadas: Celula[][], obtidas: Celula[][], ordemImporta: boolean, tolerancia: number): boolean {
  if (esperadas.length !== obtidas.length) return false;
  if (ordemImporta) return esperadas.every((linha, i) => linhasIguais(linha, obtidas[i], tolerancia));
  return contarLinhasSemPar(esperadas, obtidas, tolerancia) === 0;
}

/** Se as colunas têm os mesmos nomes em outra ordem, devolve o resultado reordenado. */
function reordenarPorNome(colunasEsperadas: Coluna[], obtido: ResultadoTabela): ResultadoTabela | null {
  const nomesEsperados = colunasEsperadas.map((c) => c.nome.toLowerCase());
  const nomesObtidos = obtido.colunas.map((c) => c.nome.toLowerCase());
  if (new Set(nomesObtidos).size !== nomesObtidos.length) return null;
  const indices = nomesEsperados.map((nome) => nomesObtidos.indexOf(nome));
  if (indices.some((i) => i === -1)) return null;
  if (indices.every((indice, i) => indice === i)) return null;
  return {
    colunas: indices.map((i) => obtido.colunas[i]),
    linhas: obtido.linhas.map((linha) => indices.map((i) => linha[i])),
  };
}

export function compararResultados(
  esperado: ResultadoTabela,
  obtido: ResultadoTabela,
  opcoes: OpcoesComparacao = {},
): Veredito {
  const ordemImporta = opcoes.ordemImporta ?? false;
  const tolerancia = opcoes.tolerancia ?? 0;

  if (obtido.colunas.length !== esperado.colunas.length) {
    return {
      ok: false,
      motivo: `Sua consulta retornou ${plural(obtido.colunas.length, 'coluna', 'colunas')}, mas o esperado são ${esperado.colunas.length}.`,
    };
  }
  if (obtido.linhas.length !== esperado.linhas.length) {
    return {
      ok: false,
      motivo: `Sua consulta retornou ${plural(obtido.linhas.length, 'linha', 'linhas')}, mas o esperado são ${esperado.linhas.length.toLocaleString('pt-BR')}.`,
    };
  }

  const candidatos = [obtido];
  const reordenado = reordenarPorNome(esperado.colunas, obtido);
  if (reordenado) candidatos.push(reordenado);

  for (const candidato of candidatos) {
    if (linhasBatem(esperado.linhas, candidato.linhas, ordemImporta, tolerancia)) return { ok: true };
  }

  if (ordemImporta && candidatos.some((c) => linhasBatem(esperado.linhas, c.linhas, false, tolerancia))) {
    return { ok: false, motivo: 'Os valores estão certos, mas a ordem das linhas não. Confira o ORDER BY.' };
  }

  const semPar = Math.min(
    ...candidatos.map((c) => contarLinhasSemPar(esperado.linhas, c.linhas, tolerancia)),
  );
  return {
    ok: false,
    motivo: `A quantidade de linhas e colunas bate, mas ${plural(semPar, 'linha não confere', 'linhas não conferem')} com o resultado esperado.`,
  };
}

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Interpretações possíveis de um número digitado ("1.234,56", "1234.56", "R$ 10", "12%"). */
export function interpretarNumero(entrada: string): number[] {
  let texto = entrada.trim().replace(/^R\$\s*/i, '').replace(/\s*%$/, '').replace(/\s+/g, '');
  if (texto === '') return [];
  const candidatos: string[] = [];

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');
  if (temVirgula && temPonto) {
    texto =
      texto.lastIndexOf(',') > texto.lastIndexOf('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(/,/g, '');
    candidatos.push(texto);
  } else if (temVirgula) {
    const partes = texto.split(',');
    candidatos.push(partes.length === 2 ? `${partes[0]}.${partes[1]}` : texto.replace(/,/g, ''));
  } else if (temPonto) {
    const partes = texto.split('.');
    if (partes.length > 2) {
      candidatos.push(texto.replace(/\./g, ''));
    } else {
      candidatos.push(texto);
      // "1.234" também pode ser mil duzentos e trinta e quatro.
      if (/^-?\d{1,3}\.\d{3}$/.test(texto)) candidatos.push(texto.replace('.', ''));
    }
  } else {
    candidatos.push(texto);
  }

  return candidatos.filter((c) => /^-?\d+(\.\d+)?$/.test(c)).map(Number);
}

export function compararValor(entrada: string, esperado: Celula, tolerancia = 0): Veredito {
  const texto = entrada.trim();
  if (texto === '') return { ok: false, motivo: 'Digite uma resposta antes de validar.' };

  const alvo = normalizarCelula(esperado);

  if (alvo === null) {
    return /^(null|nulo|vazio)$/i.test(texto)
      ? { ok: true }
      : { ok: false, motivo: 'Essa não é a resposta esperada. Confira sua consulta e tente de novo.' };
  }

  if (typeof alvo === 'number') {
    const numeros = interpretarNumero(texto);
    if (numeros.length === 0) {
      return { ok: false, motivo: 'A resposta esperada é um número. Use só dígitos, com vírgula ou ponto nos decimais.' };
    }
    if (numeros.some((n) => celulasIguais(n, alvo, tolerancia))) return { ok: true };
    const perto = numeros.some((n) => Math.abs(n - alvo) <= Math.abs(alvo) * 0.01);
    return {
      ok: false,
      motivo: perto
        ? 'Quase! O valor está muito perto do esperado. Confira arredondamento e casas decimais.'
        : 'Esse não é o valor esperado. Confira sua consulta e tente de novo.',
    };
  }

  if (typeof alvo === 'boolean') {
    const verdadeiro = /^(true|verdadeiro|sim)$/i.test(texto);
    const falso = /^(false|falso|nao|não)$/i.test(texto);
    return (alvo && verdadeiro) || (!alvo && falso)
      ? { ok: true }
      : { ok: false, motivo: 'Essa não é a resposta esperada. Responda com sim ou não.' };
  }

  const iguais = semAcento(texto).toLowerCase() === semAcento(String(alvo)).trim().toLowerCase();
  return iguais ? { ok: true } : { ok: false, motivo: 'Essa não é a resposta esperada. Confira sua consulta e tente de novo.' };
}
