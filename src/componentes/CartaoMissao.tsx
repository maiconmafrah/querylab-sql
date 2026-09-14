import { Link } from 'react-router-dom';
import { nomeTema } from '../conteudo/index.ts';
import { checkpointsConcluidos, ehNovo, requisitosPendentes, statusMissao, xpTotalMissao } from '../conteudo/status.ts';
import type { Progresso } from '../estado/progresso.ts';
import type { Treinamento } from '../tipos.ts';
import { Segmentos, TagDificuldade } from './comum.tsx';
import { Icone } from './Icone.tsx';

const CLASSES_STATUS = {
  andamento: 'cartao cartao--amarelo cartao--destaque',
  concluida: 'cartao',
  disponivel: 'cartao',
  bloqueada: 'cartao cartao--bloqueado',
} as const;

export function CartaoMissao({ treinamento, progresso }: { treinamento: Treinamento; progresso: Progresso }) {
  const status = statusMissao(treinamento, progresso);
  const endereco = `/treinamentos/${treinamento.id}`;
  const pendentes = status === 'bloqueada' ? requisitosPendentes(treinamento, progresso) : [];

  return (
    <article className={`${CLASSES_STATUS[status]} cartao-missao`}>
      <div className="lista-tags">
        {ehNovo(treinamento.publicado_em) && status !== 'concluida' && <span className="tag tag--lilas">Nova</span>}
        <span className="tag">{nomeTema(treinamento.tema)}</span>
        <TagDificuldade dificuldade={treinamento.dificuldade} />
      </div>

      <h3 className="cartao-missao__titulo">
        {status === 'bloqueada' ? (
          treinamento.titulo
        ) : (
          <Link to={endereco} className="cartao-missao__link">
            {treinamento.titulo}
          </Link>
        )}
      </h3>
      <p className="cartao-missao__resumo">
        {pendentes.length > 0 ? `Termine “${pendentes[0].titulo}” para liberar.` : treinamento.resumo}
      </p>

      <div className="cartao-missao__rodape">
        <div className="cartao-missao__meta">
          {status === 'andamento' && (
            <Segmentos total={treinamento.checkpoints.length} feitos={checkpointsConcluidos(treinamento.id, progresso)} />
          )}
          <span className="mono">
            {treinamento.duracao_min} min · {xpTotalMissao(treinamento)} XP
          </span>
        </div>
        {status === 'andamento' && (
          <Link to={endereco} className="btn btn--sm btn--escuro cartao-missao__acao">
            Continuar
            <Icone nome="seta-direita" tamanho={14} espessura={2.5} />
          </Link>
        )}
        {status === 'disponivel' && (
          <Link to={endereco} className="btn btn--sm cartao-missao__acao">
            Começar
          </Link>
        )}
        {status === 'concluida' && (
          <span className="tag tag--lilas">
            <Icone nome="check" tamanho={12} espessura={3.25} />
            Concluída
          </span>
        )}
        {status === 'bloqueada' && (
          <span className="tag tag--mudo">
            <Icone nome="cadeado" tamanho={12} espessura={2.75} />
            Bloqueada
          </span>
        )}
      </div>
    </article>
  );
}
