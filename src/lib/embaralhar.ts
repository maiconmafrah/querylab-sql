// Embaralha alternativas de forma determinística: mesma semente, mesma ordem na prova e na correção.

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function geradorAleatorio(semente: number): () => number {
  let estado = semente;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Índices originais das alternativas, na ordem em que devem aparecer. */
export function ordemAlternativas(quantidade: number, semente: string): number[] {
  const ordem = Array.from({ length: quantidade }, (_, i) => i);
  const aleatorio = geradorAleatorio(hash(semente));
  for (let i = ordem.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j]!, ordem[i]!];
  }
  return ordem;
}
