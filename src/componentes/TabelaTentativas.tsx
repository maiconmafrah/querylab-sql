import { Link } from 'react-router-dom';
import type { TentativaSimulado } from '../estado/progresso.ts';
import { formatarDataHora, formatarDuracao } from '../lib/formato.ts';
import type { Simulado } from '../tipos.ts';

export interface TentativaDoSimulado {
  simulado: Simulado;
  tentativa: TentativaSimulado;
}

export function TabelaTentativas({ tentativas, rotuloProva }: { tentativas: TentativaDoSimulado[]; rotuloProva: string }) {
  return (
    <div className="cartao tabela-historico-rolagem">
      <table className="tabela-historico">
        <thead>
          <tr>
            <th scope="col">{rotuloProva}</th>
            <th scope="col">Entregue</th>
            <th scope="col">Acertos</th>
            <th scope="col">Nota</th>
            <th scope="col">Duração</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tentativas.map(({ simulado, tentativa }) => (
            <tr key={`${simulado.id}:${tentativa.id}`}>
              <td>
                <strong>{simulado.titulo}</strong>
              </td>
              <td className="mono">{formatarDataHora(tentativa.entregueEm)}</td>
              <td className="mono">
                {tentativa.acertos}/{tentativa.total}
              </td>
              <td>
                <span className={`tag ${tentativa.nota >= simulado.nota_minima ? 'tag--menta' : 'tag--coral'}`}>{tentativa.nota}%</span>
              </td>
              <td className="mono">{formatarDuracao(tentativa.duracaoS)}</td>
              <td>
                <Link to={`/simulados/${simulado.id}/resultado/${tentativa.id}`} className="link-forte">
                  ver correção
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
