import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarraProgresso, Segmentos, TagDificuldade } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { buscarTreinamento, buscarTrilha, trilhas } from '../conteudo/index.ts';
import {
  checkpointsConcluidos,
  melhorTentativa,
  resumoTrilha,
  ROTULOS_STATUS,
  statusMissao,
  xpGanhoMissao,
  xpTotalMissao,
} from '../conteudo/status.ts';
import { useProgresso, type Progresso } from '../estado/progresso.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { doisDigitos, formatarNumero } from '../lib/formato.ts';
import type { Simulado, Treinamento, Trilha } from '../tipos.ts';
import { NaoEncontrado } from './NaoEncontrado.tsx';

export function Trilhas() {
  useTitulo('Trilhas');
  const progresso = useProgresso();

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">Trilhas</h1>
          <p className="subtitulo-pagina">
            Sequências de missões que vão do básico à investigação de incidentes. Cada trilha fecha com um simulado.
          </p>
        </div>
      </div>
      <div className="lista-trilhas">
        {trilhas.map((trilha) => {
          const resumo = resumoTrilha(trilha, progresso);
          const completa = resumo.total > 0 && resumo.concluidas === resumo.total;
          return (
            <article key={trilha.id} className={`cartao cartao-trilha${completa ? ' cartao--lilas' : ''}`}>
              <span className="cartao-trilha__numero">{doisDigitos(trilha.numero)}</span>
              <div className="cartao-trilha__conteudo">
                <div className="lista-tags">
                  <span className="tag">{resumo.total} missões</span>
                  <span className="tag">{formatarNumero(resumo.xpTotal)} XP</span>
                  {resumo.simulado && <span className="tag tag--amarelo">simulado final: {resumo.simulado.titulo}</span>}
                </div>
                <h2 className="cartao-trilha__titulo">
                  <Link to={`/trilhas/${trilha.id}`} className="cartao-missao__link">
                    {trilha.titulo}
                  </Link>
                </h2>
                <p className="cartao-trilha__descricao">{trilha.descricao}</p>
                <div className="cartao-trilha__progresso">
                  <BarraProgresso valor={resumo.total ? resumo.concluidas / resumo.total : 0} rotulo={`Progresso em ${trilha.titulo}`} />
                  <span className="mono">
                    {resumo.concluidas} de {resumo.total} missões · {resumo.xp}/{resumo.xpTotal} XP
                  </span>
                </div>
              </div>
              <Link to={`/trilhas/${trilha.id}`} className="btn btn--amarelo cartao-missao__acao">
                {resumo.concluidas === 0 ? 'Começar' : completa ? 'Revisar' : 'Continuar'}
                <Icone nome="seta-direita" espessura={2.5} />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function PaginaTrilha() {
  const { id = '' } = useParams();
  const trilha = buscarTrilha(id);
  if (!trilha) return <NaoEncontrado />;
  return <MapaTrilha key={trilha.id} trilha={trilha} />;
}

type No = { tipo: 'missao'; treinamento: Treinamento } | { tipo: 'simulado'; simulado: Simulado };

function colunasPara(largura: number): number {
  if (largura >= 1000) return 4;
  if (largura >= 720) return 3;
  if (largura >= 460) return 2;
  return 1;
}

function MapaTrilha({ trilha }: { trilha: Trilha }) {
  useTitulo(trilha.titulo);
  const progresso = useProgresso();
  const resumo = resumoTrilha(trilha, progresso);
  const missoes = trilha.missoes.map((id) => buscarTreinamento(id)).filter((t): t is Treinamento => t !== undefined);
  const idAtual =
    missoes.find((t) => statusMissao(t, progresso) === 'andamento')?.id ??
    missoes.find((t) => statusMissao(t, progresso) === 'disponivel')?.id;

  const nos: No[] = [
    ...missoes.map((treinamento): No => ({ tipo: 'missao', treinamento })),
    ...(resumo.simulado ? [{ tipo: 'simulado', simulado: resumo.simulado } as No] : []),
  ];

  const grade = useRef<HTMLDivElement>(null);
  const [colunas, setColunas] = useState(4);
  const [caminho, setCaminho] = useState({ d: '', largura: 0, altura: 0 });

  useLayoutEffect(() => {
    const elemento = grade.current;
    if (!elemento) return;
    const medir = () => {
      setColunas(colunasPara(elemento.clientWidth));
      const pontos = Array.from(elemento.querySelectorAll<HTMLElement>('[data-no]'))
        .sort((a, b) => Number(a.dataset.no) - Number(b.dataset.no))
        .map((no) => ({ x: no.offsetLeft + no.offsetWidth / 2, y: no.offsetTop + no.offsetHeight / 2 }));
      setCaminho({
        d: pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${Math.round(p.x)} ${Math.round(p.y)}`).join(' '),
        largura: elemento.scrollWidth,
        altura: elemento.scrollHeight,
      });
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [colunas, nos.length]);

  return (
    <div className="pagina pagina--larga">
      <Link to="/trilhas" className="voltar link-forte">
        <Icone nome="seta-esquerda" tamanho={16} espessura={2.5} />
        Todas as trilhas
      </Link>
      <div className="cabecalho-pagina cabecalho-trilha">
        <div>
          <span className="tag cabecalho-trilha__numero">TRILHA {doisDigitos(trilha.numero)}</span>
          <h1 className="titulo-pagina">{trilha.titulo}</h1>
          <p className="subtitulo-pagina">{trilha.descricao}</p>
        </div>
        <div className="cartao progresso-trilha">
          <div className="linha-entre">
            <strong>Progresso da trilha</strong>
            <span className="mono">
              {resumo.concluidas} de {resumo.total} missões
            </span>
          </div>
          <div className="progresso-trilha__xp">
            <span>{formatarNumero(resumo.xp)}</span>
            <span className="mono">/ {formatarNumero(resumo.xpTotal)} XP</span>
          </div>
          <BarraProgresso valor={resumo.xpTotal ? resumo.xp / resumo.xpTotal : 0} rotulo="XP conquistado na trilha" />
        </div>
      </div>

      <div className="mapa" ref={grade} style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
        <svg className="mapa__caminho" width={caminho.largura} height={caminho.altura} aria-hidden="true">
          <path d={caminho.d} />
        </svg>
        {nos.map((no, i) => {
          const linha = Math.floor(i / colunas);
          const coluna = linha % 2 === 0 ? i % colunas : colunas - 1 - (i % colunas);
          return (
            <div key={i} data-no={i} className="mapa__celula" style={{ gridRow: linha + 1, gridColumn: coluna + 1 }}>
              {no.tipo === 'missao' ? (
                <NoMissao treinamento={no.treinamento} numero={i + 1} progresso={progresso} destaque={no.treinamento.id === idAtual} />
              ) : (
                <NoSimulado simulado={no.simulado} progresso={progresso} trilhaCompleta={resumo.concluidas === resumo.total} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NoMissao({
  treinamento,
  numero,
  progresso,
  destaque,
}: {
  treinamento: Treinamento;
  numero: number;
  progresso: Progresso;
  destaque: boolean;
}) {
  const status = statusMissao(treinamento, progresso);
  const endereco = `/treinamentos/${treinamento.id}`;
  const classes = ['cartao', 'no-mapa'];
  if (status === 'bloqueada') classes.push('cartao--bloqueado');
  else if (destaque) classes.push('cartao--amarelo', 'no-mapa--atual');

  const etiqueta = {
    concluida: 'tag tag--lilas',
    andamento: 'tag tag--escuro',
    disponivel: 'tag',
    bloqueada: 'tag tag--mudo',
  }[status];

  return (
    <article className={classes.join(' ')}>
      <div className="no-mapa__topo">
        <span className={`circulo${status === 'concluida' ? ' circulo--lilas' : ''}`}>
          {status === 'concluida' ? <Icone nome="check" tamanho={16} espessura={3} /> : numero}
        </span>
        <span className={etiqueta}>
          {status === 'bloqueada' && <Icone nome="cadeado" tamanho={11} espessura={2.75} />}
          {ROTULOS_STATUS[status]}
        </span>
      </div>
      <h3 className="no-mapa__titulo">
        {status === 'bloqueada' ? (
          treinamento.titulo
        ) : (
          <Link to={endereco} className="cartao-missao__link">
            {treinamento.titulo}
          </Link>
        )}
      </h3>
      <div className="lista-tags">
        <TagDificuldade dificuldade={treinamento.dificuldade} />
        <span className="tag">{treinamento.duracao_min} min</span>
        <span className="tag">{xpTotalMissao(treinamento)} XP</span>
      </div>
      <div className="no-mapa__rodape">
        {status === 'concluida' && (
          <span className="mono">
            {treinamento.checkpoints.length}/{treinamento.checkpoints.length} checkpoints · {xpGanhoMissao(treinamento.id, progresso)} XP
          </span>
        )}
        {status === 'andamento' && (
          <>
            <Segmentos total={treinamento.checkpoints.length} feitos={checkpointsConcluidos(treinamento.id, progresso)} />
            <Link to={endereco} className="btn btn--sm btn--escuro cartao-missao__acao">
              Continuar
              <Icone nome="seta-direita" tamanho={14} espessura={2.5} />
            </Link>
          </>
        )}
        {status === 'disponivel' && (
          <Link to={endereco} className={`btn btn--sm cartao-missao__acao${destaque ? ' btn--escuro' : ''}`}>
            Começar
            <Icone nome="seta-direita" tamanho={14} espessura={2.5} />
          </Link>
        )}
        {status === 'bloqueada' && <span className="mono">libera ao terminar a missão anterior</span>}
      </div>
    </article>
  );
}

function NoSimulado({ simulado, progresso, trilhaCompleta }: { simulado: Simulado; progresso: Progresso; trilhaCompleta: boolean }) {
  const melhor = melhorTentativa(simulado.id, progresso);
  return (
    <article className="cartao cartao--escuro no-mapa no-mapa--simulado">
      <div className="no-mapa__topo">
        <span className="circulo circulo--amarelo">
          <Icone nome="trofeu" tamanho={18} />
        </span>
        <span className="tag tag--lilas">chefão da trilha</span>
      </div>
      <h3 className="no-mapa__titulo">
        <Link to={`/simulados?iniciar=${simulado.id}`} className="cartao-missao__link">
          Simulado: {simulado.titulo}
        </Link>
      </h3>
      <p className="no-mapa__texto">
        {simulado.questoes.length} questões · {simulado.tempo_min} min ·{' '}
        {trilhaCompleta ? 'pronto para você' : 'recomendado depois das missões'}
      </p>
      {melhor && <span className="mono no-mapa__texto">melhor nota: {melhor.nota}%</span>}
    </article>
  );
}
