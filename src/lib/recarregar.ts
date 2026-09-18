// Cada deploy apaga do servidor os arquivos antigos (com hash no nome). Quem estava com o site aberto
// e tenta carregar uma parte sob demanda recarrega uma vez pra pegar a versão nova.
const CHAVE = 'querylab:recarregado-em';
const INTERVALO_MINIMO_MS = 10_000;

function recarregarUmaVez(): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE) ?? 0);
    if (Date.now() - ultima < INTERVALO_MINIMO_MS) return false;
    sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    // Sem sessionStorage não dá pra garantir que não vira um loop de recarregamentos.
    return false;
  }
  window.location.reload();
  return true;
}

/** Faz o import; se o arquivo não existir mais no servidor, recarrega a página (no máximo uma vez a cada 10 s). */
export function carregarComRecarga<T>(importar: () => Promise<T>): Promise<T> {
  return importar().catch((erro: unknown) => {
    if (recarregarUmaVez()) return new Promise<T>(() => {});
    throw erro;
  });
}
