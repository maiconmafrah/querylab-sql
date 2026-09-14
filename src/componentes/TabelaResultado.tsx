import type { Celula, ResultadoTabela } from '../lib/comparar.ts';
import { formatarNumero } from '../lib/formato.ts';

const TIPOS_NUMERICOS = new Set(['inteiro', 'decimal']);

function exibir(valor: Celula): string {
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  return String(valor);
}

interface Props {
  resultado: ResultadoTabela;
  limite?: number;
  alturaMaxima?: number;
}

export function TabelaResultado({ resultado, limite = 500, alturaMaxima = 420 }: Props) {
  if (resultado.colunas.length === 0) {
    return <p className="estado-painel">Comando executado. Ele não devolve linhas.</p>;
  }
  if (resultado.linhas.length === 0) {
    return <p className="estado-painel">A consulta rodou, mas não devolveu nenhuma linha.</p>;
  }

  const visiveis = resultado.linhas.slice(0, limite);
  const numericas = resultado.colunas.map((coluna) => TIPOS_NUMERICOS.has(coluna.tipo));

  return (
    <>
      <div className="tabela-resultado-rolagem" style={{ maxHeight: alturaMaxima }}>
        <table className="tabela-resultado">
          <thead>
            <tr>
              {resultado.colunas.map((coluna, i) => (
                <th key={i} className={numericas[i] ? 'num' : undefined} scope="col">
                  {coluna.nome}
                  <small>{coluna.tipo}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((linha, r) => (
              <tr key={r}>
                {linha.map((valor, c) =>
                  valor === null ? (
                    <td key={c} className="celula-nula">
                      NULL
                    </td>
                  ) : (
                    <td key={c} className={numericas[c] ? 'num' : undefined}>
                      {exibir(valor)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resultado.linhas.length > limite && (
        <p className="tabela-resultado-nota">
          Mostrando as primeiras {formatarNumero(limite)} de {formatarNumero(resultado.linhas.length)} linhas.
        </p>
      )}
    </>
  );
}
