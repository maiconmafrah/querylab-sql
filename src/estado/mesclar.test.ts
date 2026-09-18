import { describe, expect, it } from 'vitest';
import { mesclarProgresso, mesmoConteudo } from './mesclar.ts';
import type { Progresso, TentativaSimulado } from './progresso.ts';

function progresso(parcial: Partial<Progresso>): Progresso {
  return {
    versao: 1,
    xp: 0,
    dias: [],
    missoes: {},
    simulados: {},
    modoLivre: false,
    desafios: {},
    atualizadoEm: '2026-09-01T00:00:00.000Z',
    ...parcial,
  };
}

function tentativa(id: string, entregueEm: string, xp: number): TentativaSimulado {
  return { id, iniciadaEm: entregueEm, entregueEm, duracaoS: 60, respostas: {}, corretas: {}, acertos: xp / 10, total: 6, nota: 50, xp };
}

const checkpoint = (concluidoEm: string, xp: number) => ({ concluidoEm, xp, dicas: 0 });

describe('mesclarProgresso', () => {
  it('não perde os dias estudados em outro aparelho, mesmo quando este mudou por último', () => {
    const nuvem = progresso({ dias: ['2026-09-16', '2026-09-17'], atualizadoEm: '2026-09-17T22:00:00.000Z' });
    const aparelhoDesatualizado = progresso({ dias: ['2026-09-16'], atualizadoEm: '2026-09-18T08:00:00.000Z' });
    const mesclado = mesclarProgresso(aparelhoDesatualizado, nuvem);
    expect(mesclado.dias).toEqual(['2026-09-16', '2026-09-17']);
    expect(mesclado.atualizadoEm).toBe('2026-09-18T08:00:00.000Z');
  });

  it('junta checkpoints, tentativas e desafios e soma o XP de cada coisa uma vez só', () => {
    const a = progresso({
      xp: 110,
      missoes: { m1: { iniciadaEm: '2026-09-10T10:00:00Z', atualizadaEm: '2026-09-10T10:05:00Z', checkpoints: { 0: checkpoint('2026-09-10T10:05:00Z', 50) }, dicas: {} } },
      simulados: { s1: { tentativas: [tentativa('t1', '2026-09-11T10:00:00Z', 60)] } },
    });
    const b = progresso({
      xp: 115,
      missoes: {
        m1: {
          iniciadaEm: '2026-09-10T09:00:00Z',
          atualizadaEm: '2026-09-12T10:00:00Z',
          checkpoints: { 0: checkpoint('2026-09-10T10:05:00Z', 50), 1: checkpoint('2026-09-12T10:00:00Z', 40) },
          dicas: { 1: 2 },
        },
      },
      desafios: { '2026-09-12': { respondidoEm: '2026-09-12T11:00:00Z', escolhida: 0, acertou: true, xp: 25 } },
    });
    const mesclado = mesclarProgresso(a, b);
    expect(mesclado.xp).toBe(50 + 40 + 60 + 25);
    expect(Object.keys(mesclado.missoes.m1!.checkpoints)).toEqual(['0', '1']);
    expect(mesclado.missoes.m1!.iniciadaEm).toBe('2026-09-10T09:00:00Z');
    expect(mesclado.missoes.m1!.dicas).toEqual({ 1: 2 });
    expect(mesclado.simulados.s1!.tentativas).toHaveLength(1);
    expect(Object.keys(mesclado.desafios)).toEqual(['2026-09-12']);
  });

  it('mantém XP antigo que não tem registro detalhado', () => {
    const local = progresso({ xp: 300, desafios: { '2026-09-12': { respondidoEm: '2026-09-12T11:00:00Z', escolhida: 0, acertou: true, xp: 25 } } });
    const nuvem = progresso({ xp: 300, desafios: { '2026-09-12': { respondidoEm: '2026-09-12T11:00:00Z', escolhida: 0, acertou: true, xp: 25 } } });
    expect(mesclarProgresso(local, nuvem).xp).toBe(300);
  });

  it('é idempotente e não depende da ordem dos lados', () => {
    const a = progresso({ xp: 60, dias: ['2026-09-15'], simulados: { s1: { tentativas: [tentativa('t1', '2026-09-15T10:00:00Z', 60)] } } });
    const b = progresso({ xp: 25, dias: ['2026-09-16'], atualizadoEm: '2026-09-16T12:00:00.000Z', desafios: { '2026-09-16': { respondidoEm: '2026-09-16T11:00:00Z', escolhida: 1, acertou: true, xp: 25 } } });
    const ab = mesclarProgresso(a, b);
    expect(mesmoConteudo(ab, mesclarProgresso(b, a))).toBe(true);
    expect(mesmoConteudo(mesclarProgresso(ab, ab), ab)).toBe(true);
    expect(mesmoConteudo(mesclarProgresso(ab, a), ab)).toBe(true);
  });

  it('descarta a prova "em andamento" que já foi entregue em outro aparelho', () => {
    const iniciada = '2026-09-17T10:00:00.000Z';
    const aqui = progresso({ simulados: { s1: { tentativas: [], emAndamento: { iniciadaEm: iniciada, respostas: {}, marcadas: [], atual: 3 } } } });
    const nuvem = progresso({ xp: 40, simulados: { s1: { tentativas: [{ ...tentativa('t9', '2026-09-17T10:20:00.000Z', 40), iniciadaEm: iniciada }] } } });
    const mesclado = mesclarProgresso(aqui, nuvem);
    expect(mesclado.simulados.s1!.emAndamento).toBeUndefined();
    expect(mesclado.simulados.s1!.tentativas).toHaveLength(1);
  });

  it('respeita "Apagar progresso" feito em outro aparelho', () => {
    const zeradoEm = '2026-09-15T12:00:00.000Z';
    const apagado = progresso({ zeradoEm, atualizadoEm: zeradoEm });
    const antigo = progresso({
      xp: 85,
      apelido: 'ana',
      dias: ['2026-09-14', '2026-09-15', '2026-09-16'],
      simulados: { s1: { tentativas: [tentativa('t1', '2026-09-14T10:00:00Z', 60)] } },
      desafios: { '2026-09-16': { respondidoEm: '2026-09-16T10:00:00Z', escolhida: 0, acertou: true, xp: 25 } },
      atualizadoEm: '2026-09-16T10:00:00.000Z',
    });
    const mesclado = mesclarProgresso(apagado, antigo);
    expect(mesclado.xp).toBe(25);
    expect(mesclado.dias).toEqual(['2026-09-16']);
    expect(mesclado.simulados).toEqual({});
    expect(mesclado.apelido).toBeUndefined();
    expect(mesclado.zeradoEm).toBe(zeradoEm);
  });

  it('importar um backup depois de apagar traz o progresso de volta', () => {
    const zeradoEm = '2026-09-15T12:00:00.000Z';
    const apagadoERestaurando = progresso({ zeradoEm, restauradoEm: '2026-09-16T09:00:00.000Z', atualizadoEm: zeradoEm });
    const backupAntigo = progresso({ xp: 60, dias: ['2026-09-14'], simulados: { s1: { tentativas: [tentativa('t1', '2026-09-14T10:00:00Z', 60)] } } });
    const restaurado = mesclarProgresso(apagadoERestaurando, backupAntigo);
    expect(restaurado.xp).toBe(60);
    expect(restaurado.dias).toEqual(['2026-09-14']);

    // A nuvem ainda tem a marca do "apagar", mas o restaurar é mais recente.
    const nuvemApagada = progresso({ zeradoEm, atualizadoEm: zeradoEm });
    expect(mesclarProgresso(restaurado, nuvemApagada).xp).toBe(60);
  });
});
