// Formatação de números, datas e textos para exibição.

export function formatarNumero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** 754 → "12 min 34 s" */
export function formatarDuracao(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  if (minutos === 0) return `${resto} s`;
  return resto === 0 ? `${minutos} min` : `${minutos} min ${resto} s`;
}

/** 754000 → "12:34" */
export function formatarCronometro(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(total / 60);
  return `${String(minutos).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/[\s_]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : nome.slice(0, 2);
  return letras.toUpperCase();
}

export function dataPorExtenso(data = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(data);
}

export function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** Minúsculas e sem acentos, para buscas. */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
