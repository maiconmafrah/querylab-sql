import { describe, expect, it } from 'vitest';
import { calcularSequencia, infoNivel, inicialDiaSemana, somarDias, ultimosDias, xpCheckpoint, xpParaNivel } from './niveis.ts';

describe('níveis', () => {
  it('calcula o nível pelo XP acumulado', () => {
    expect(xpParaNivel(1)).toBe(0);
    expect(xpParaNivel(2)).toBe(200);
    expect(infoNivel(0).nivel).toBe(1);
    expect(infoNivel(199).nivel).toBe(1);
    expect(infoNivel(200).nivel).toBe(2);
    expect(infoNivel(400).progresso).toBeCloseTo(0.5);
  });

  it('desconta 10 XP por dica, com piso de 40%', () => {
    expect(xpCheckpoint(50, 0)).toBe(50);
    expect(xpCheckpoint(50, 2)).toBe(30);
    expect(xpCheckpoint(50, 5)).toBe(20);
  });
});

describe('sequência de estudo', () => {
  const hoje = '2026-09-13';

  it('conta dias seguidos até hoje', () => {
    expect(calcularSequencia(['2026-09-11', '2026-09-12', '2026-09-13'], hoje)).toBe(3);
  });

  it('mantém a sequência se ainda não estudou hoje', () => {
    expect(calcularSequencia(['2026-09-11', '2026-09-12'], hoje)).toBe(2);
  });

  it('zera quando pulou um dia', () => {
    expect(calcularSequencia(['2026-09-10', '2026-09-11'], hoje)).toBe(0);
  });

  it('atravessa a virada do mês', () => {
    expect(somarDias('2026-09-01', -1)).toBe('2026-08-31');
    expect(ultimosDias(hoje, 3)).toEqual(['2026-09-11', '2026-09-12', '2026-09-13']);
    expect(inicialDiaSemana('2026-09-13')).toBe('D');
  });
});
