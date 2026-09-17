import { Link } from 'react-router-dom';
import { Carregando, PedirLogin } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { useAutenticacao } from '../estado/autenticacao.ts';
import { useProgresso } from '../estado/progresso.ts';
import { useRanking } from '../estado/ranking.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { firebaseDisponivel } from '../lib/firebase.ts';
import { formatarNumero } from '../lib/formato.ts';

export function Ranking() {
  useTitulo('Ranking');
  const { usuario } = useAutenticacao();
  const progresso = useProgresso();
  const estado = useRanking();

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">Ranking</h1>
          <p className="subtitulo-pagina">Apelido e XP de quem entrou com Google e decidiu aparecer aqui.</p>
        </div>
      </div>

      {usuario && !progresso.apelido && (
        <div className="aviso aviso--info" role="status">
          <Icone nome="info" />
          <div>
            <strong>Você ainda não tem um apelido.</strong>
            <span>
              {' '}
              Defina um na <Link to="/progresso">página de Progresso</Link> pra aparecer no ranking com seu XP.
            </span>
          </div>
        </div>
      )}

      {!firebaseDisponivel || estado.fase === 'indisponivel' ? (
        <div className="vazio">
          <strong>Ranking indisponível.</strong>
          <span>Este site não está com o login configurado.</span>
        </div>
      ) : estado.fase === 'requer-login' ? (
        <PedirLogin titulo="Faça login para ver o ranking" texto="O ranking só fica visível pra quem entrou com Google." />
      ) : estado.fase === 'carregando' ? (
        <Carregando texto="Carregando o ranking…" />
      ) : estado.fase === 'erro' ? (
        <div className="vazio">
          <strong>Não deu para carregar o ranking agora.</strong>
          <span>Tente de novo mais tarde.</span>
        </div>
      ) : estado.linhas.length === 0 ? (
        <div className="vazio">
          <strong>Ninguém no ranking ainda.</strong>
          <span>Seja o primeiro: entre com Google e defina um apelido.</span>
        </div>
      ) : (
        <div className="cartao">
          <ol className="lista-ranking">
            {estado.linhas.map((linha, i) => (
              <li key={linha.uid} className={linha.uid === usuario?.uid ? 'linha-ranking linha-ranking--voce' : 'linha-ranking'}>
                <span className={`linha-ranking__posicao${i < 3 ? ` linha-ranking__posicao--${i + 1}` : ''}`}>{i + 1}</span>
                <span className="linha-ranking__apelido">
                  <Link to={`/ranking/${linha.uid}`} className="linha-ranking__link">
                    {linha.apelido}
                  </Link>
                  {linha.uid === usuario?.uid && <span className="tag tag--escuro">você</span>}
                </span>
                <span className="mono linha-ranking__xp">{formatarNumero(linha.xp)} XP</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
