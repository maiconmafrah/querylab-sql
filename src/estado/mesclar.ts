// Junta o progresso deste aparelho com o da nuvem sem perder nada de nenhum dos lados.
import { dataLocal } from '../lib/niveis.ts';
import type { Progresso, ProgressoMissao, ProgressoSimulado, ProvaEmAndamento, TentativaSimulado } from './progresso.ts';

const LIMITE_DIAS = 400;

function mesclarRegistro<T>(novo: Record<string, T>, velho: Record<string, T>, juntar: (doNovo: T, doVelho: T) => T): Record<string, T> {
  const resultado: Record<string, T> = { ...velho };
  for (const [chave, valor] of Object.entries(novo)) {
    resultado[chave] = chave in velho ? juntar(valor, velho[chave]!) : valor;
  }
  return resultado;
}

const menor = (a: string, b: string) => (a <= b ? a : b);
const maior = (a: string, b: string) => (a >= b ? a : b);

function mesclarMissao(a: ProgressoMissao, b: ProgressoMissao): ProgressoMissao {
  const concluidas = [a.concluidaEm, b.concluidaEm].filter((data): data is string => Boolean(data)).sort();
  return {
    iniciadaEm: menor(a.iniciadaEm, b.iniciadaEm),
    atualizadaEm: maior(a.atualizadaEm, b.atualizadaEm),
    checkpoints: mesclarRegistro(a.checkpoints, b.checkpoints, (x, y) => (x.concluidoEm <= y.concluidoEm ? x : y)),
    dicas: mesclarRegistro(a.dicas, b.dicas, Math.max),
    ...(concluidas[0] ? { concluidaEm: concluidas[0] } : {}),
  };
}

function mesclarSimulado(doNovo: ProgressoSimulado, doVelho: ProgressoSimulado): ProgressoSimulado {
  const porId = new Map<string, TentativaSimulado>();
  for (const tentativa of [...doNovo.tentativas, ...doVelho.tentativas]) {
    if (!porId.has(tentativa.id)) porId.set(tentativa.id, tentativa);
  }
  const tentativas = [...porId.values()].sort((a, b) => a.entregueEm.localeCompare(b.entregueEm));
  // Uma prova entregue em outro aparelho não pode continuar "em andamento" aqui.
  const entregues = new Set(tentativas.map((t) => t.iniciadaEm));
  const emAndamento = [doNovo.emAndamento, doVelho.emAndamento]
    .filter((prova): prova is ProvaEmAndamento => Boolean(prova) && !entregues.has(prova!.iniciadaEm))
    .sort((a, b) => b.iniciadaEm.localeCompare(a.iniciadaEm))[0];
  return emAndamento ? { tentativas, emAndamento } : { tentativas };
}

/** XP de cada coisa que dá XP, por uma chave estável. */
function entradasDeXp(p: Progresso): Map<string, number> {
  const entradas = new Map<string, number>();
  for (const [id, missao] of Object.entries(p.missoes)) {
    for (const [checkpoint, dados] of Object.entries(missao.checkpoints)) entradas.set(`m:${id}:${checkpoint}`, dados.xp);
  }
  for (const [id, simulado] of Object.entries(p.simulados)) {
    for (const tentativa of simulado.tentativas) entradas.set(`s:${id}:${tentativa.id}`, tentativa.xp);
  }
  for (const [data, desafio] of Object.entries(p.desafios)) entradas.set(`d:${data}`, desafio.xp);
  return entradas;
}

const somar = (valores: Iterable<number>) => [...valores].reduce((total, valor) => total + valor, 0);

/** Descarta o que aconteceu antes de um "Apagar progresso" (feito aqui ou em outro aparelho). */
function cortar(p: Progresso, corte: string): Progresso {
  if (!corte || (p.zeradoEm ?? '') >= corte) return p;
  const diaDoCorte = dataLocal(new Date(corte));

  const missoes: Record<string, ProgressoMissao> = {};
  for (const [id, missao] of Object.entries(p.missoes)) {
    if (missao.atualizadaEm <= corte) continue;
    const { concluidaEm, ...resto } = missao;
    missoes[id] = {
      ...resto,
      checkpoints: Object.fromEntries(Object.entries(missao.checkpoints).filter(([, c]) => c.concluidoEm > corte)),
      ...(concluidaEm && concluidaEm > corte ? { concluidaEm } : {}),
    };
  }

  const simulados: Record<string, ProgressoSimulado> = {};
  for (const [id, simulado] of Object.entries(p.simulados)) {
    const tentativas = simulado.tentativas.filter((t) => t.entregueEm > corte);
    const emAndamento = simulado.emAndamento && simulado.emAndamento.iniciadaEm > corte ? simulado.emAndamento : undefined;
    if (tentativas.length || emAndamento) simulados[id] = emAndamento ? { tentativas, emAndamento } : { tentativas };
  }

  const cortado: Progresso = {
    ...p,
    dias: p.dias.filter((dia) => dia > diaDoCorte),
    missoes,
    simulados,
    desafios: Object.fromEntries(Object.entries(p.desafios).filter(([, d]) => d.respondidoEm > corte)),
    zeradoEm: corte,
  };
  return { ...cortado, xp: somar(entradasDeXp(cortado).values()) };
}

const ultima = (...datas: (string | undefined)[]) => datas.map((data) => data ?? '').sort().at(-1)!;

export function mesclarProgresso(a: Progresso, b: Progresso): Progresso {
  const zerado = ultima(a.zeradoEm, b.zeradoEm);
  const restaurado = ultima(a.restauradoEm, b.restauradoEm);
  const corte = zerado > restaurado ? zerado : '';
  const x = cortar(a, corte);
  const y = cortar(b, corte);
  const [novo, velho] = x.atualizadoEm >= y.atualizadoEm ? [x, y] : [y, x];
  // Preferências (apelido, modo livre...) de um lado que foi cortado são de antes do "Apagar progresso".
  const [preferido, reserva] = [novo, velho].filter((lado) => (lado === x ? x === a : y === b));

  // Cada lado soma o XP que só o outro tem. Assim nada conta duas vezes, e XP antigo sem registro não se perde.
  const entradasX = entradasDeXp(x);
  const entradasY = entradasDeXp(y);
  const soEmX = somar([...entradasX].filter(([chave]) => !entradasY.has(chave)).map(([, xp]) => xp));
  const soEmY = somar([...entradasY].filter(([chave]) => !entradasX.has(chave)).map(([, xp]) => xp));

  const mesclado: Progresso = {
    versao: 1,
    xp: Math.max(x.xp + soEmY, y.xp + soEmX),
    dias: [...new Set([...x.dias, ...y.dias])].sort().slice(-LIMITE_DIAS),
    missoes: mesclarRegistro(novo.missoes, velho.missoes, mesclarMissao),
    simulados: mesclarRegistro(novo.simulados, velho.simulados, mesclarSimulado),
    desafios: mesclarRegistro(novo.desafios, velho.desafios, (d1, d2) => (d1.respondidoEm <= d2.respondidoEm ? d1 : d2)),
    modoLivre: preferido?.modoLivre ?? false,
    ultimaMissao: preferido?.ultimaMissao ?? reserva?.ultimaMissao,
    apelido: preferido?.apelido ?? reserva?.apelido,
    lembreteSequencia: preferido?.lembreteSequencia ?? reserva?.lembreteSequencia,
    zeradoEm: zerado || undefined,
    restauradoEm: restaurado || undefined,
    atualizadoEm: novo.atualizadoEm,
  };
  return JSON.parse(JSON.stringify(mesclado)) as Progresso;
}

function canonico(valor: unknown): string {
  return JSON.stringify(valor, (_chave, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

/** Mesmo conteúdo, ignorando a ordem das chaves e a data da última mudança. */
export function mesmoConteudo(a: Progresso, b: Progresso): boolean {
  return canonico({ ...a, atualizadoEm: '' }) === canonico({ ...b, atualizadoEm: '' });
}
