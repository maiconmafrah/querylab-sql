import { describe, expect, it } from 'vitest';
import { ordemAlternativas } from './embaralhar.ts';

describe('ordemAlternativas', () => {
  it('devolve uma permutação dos índices originais', () => {
    const ordem = ordemAlternativas(4, 'semente');
    expect([...ordem].sort()).toEqual([0, 1, 2, 3]);
  });

  it('é determinística para a mesma semente', () => {
    expect(ordemAlternativas(4, '2026-09-18T00:00:00.000Z:questao')).toEqual(
      ordemAlternativas(4, '2026-09-18T00:00:00.000Z:questao'),
    );
  });

  it('espalha a alternativa original A pelas quatro posições', () => {
    const contagem = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) contagem[ordemAlternativas(4, `tentativa-${i}:q`).indexOf(0)]!++;
    for (const vezes of contagem) {
      expect(vezes).toBeGreaterThan(850);
      expect(vezes).toBeLessThan(1150);
    }
  });

  it('lida com listas de 0 ou 1 item', () => {
    expect(ordemAlternativas(0, 'x')).toEqual([]);
    expect(ordemAlternativas(1, 'x')).toEqual([0]);
  });
});
