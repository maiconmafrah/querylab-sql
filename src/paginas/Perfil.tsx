import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Carregando, PedirLogin } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { AtividadeHeatmap, CartaoNivelGrande, Conquistas, Estatistica } from '../componentes/PainelProgresso.tsx';
import { treinamentos } from '../conteudo/index.ts';
import { useAutenticacao } from '../estado/autenticacao.ts';
import { usePerfilPublico, type LinhaRanking } from '../estado/ranking.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { firebaseDisponivel } from '../lib/firebase.ts';
import { formatarNumero } from '../lib/formato.ts';
import { calcularSequencia, dataLocal, infoNivel, melhorSequencia } from '../lib/niveis.ts';

export function Perfil() {
  const { uid = '' } = useParams();
  const estado = usePerfilPublico(uid);
  const { usuario } = useAutenticacao();

  useTitulo(estado.fase === 'ok' ? estado.perfil.apelido : 'Perfil');

  return (
    <div className="pagina">
      <Link to="/ranking" className="voltar link-forte">
        <Icone nome="seta-esquerda" tamanho={16} espessura={2.5} />
        Ranking
      </Link>

      {!firebaseDisponivel || estado.fase === 'indisponivel' ? (
        <div className="vazio">
          <strong>Perfil indisponível.</strong>
          <span>Este site não está com o login configurado.</span>
        </div>
      ) : estado.fase === 'requer-login' ? (
        <PedirLogin
          titulo="Faça login para ver perfis"
          texto="Os perfis de quem está no ranking só ficam visíveis pra quem também entrou com Google."
        />
      ) : estado.fase === 'carregando' ? (
        <Carregando texto="Carregando o perfil…" />
      ) : estado.fase === 'erro' ? (
        <div className="vazio">
          <strong>Não deu para carregar esse perfil agora.</strong>
          <span>Tente de novo mais tarde.</span>
        </div>
      ) : estado.fase === 'nao-encontrado' ? (
        <div className="vazio">
          <strong>Esse perfil não existe.</strong>
          <span>Pode ser um link antigo ou alguém que ainda não apareceu no ranking.</span>
        </div>
      ) : (
        <ConteudoPerfil perfil={estado.perfil} voce={estado.perfil.uid === usuario?.uid} />
      )}
    </div>
  );
}

function ConteudoPerfil({ perfil, voce }: { perfil: LinhaRanking; voce: boolean }) {
  const hoje = dataLocal();
  const nivel = infoNivel(perfil.xp);
  const sequencia = calcularSequencia(perfil.dias, hoje);
  const melhor = melhorSequencia(perfil.dias);
  const secretaDesbloqueada = treinamentos.length > 0 && perfil.missoesConcluidas >= treinamentos.length;
  const contagemAtividade = useMemo(() => new Map(perfil.dias.map((dia) => [dia, 1])), [perfil.dias]);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">
            {perfil.apelido}
            {voce && (
              <span className="tag tag--escuro" style={{ marginLeft: 12, verticalAlign: 'middle' }}>
                você
              </span>
            )}
          </h1>
          <p className="subtitulo-pagina">{formatarNumero(perfil.xp)} XP no total.</p>
        </div>
        {voce && (
          <Link to="/progresso" className="btn btn--sm">
            Editar seu progresso
          </Link>
        )}
      </div>

      <div className="progresso__grade">
        <CartaoNivelGrande nivel={nivel} xp={perfil.xp} />
        <Estatistica icone="chama" valor={sequencia} rotulo={sequencia === 1 ? 'dia seguido estudando' : 'dias seguidos estudando'} />
        <Estatistica
          icone="bandeira"
          valor={`${perfil.missoesConcluidas}/${treinamentos.length}`}
          rotulo="missões concluídas"
        />
        <Estatistica icone="grafico" valor={perfil.dias.length} rotulo={perfil.dias.length === 1 ? 'dia de estudo no total' : 'dias de estudo no total'} />
      </div>

      <Conquistas atual={sequencia} melhor={melhor} secretaDesbloqueada={secretaDesbloqueada} />
      <AtividadeHeatmap contagem={contagemAtividade} />
    </>
  );
}
