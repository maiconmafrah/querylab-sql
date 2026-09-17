import { Link } from 'react-router-dom';
import { CartaoDesafio } from '../componentes/CartaoDesafio.tsx';
import { CartaoMissao } from '../componentes/CartaoMissao.tsx';
import { BarraProgresso } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { simulados, treinamentos, trilhaDaMissao, trilhas } from '../conteudo/index.ts';
import {
  checkpointsConcluidos,
  ehNovo,
  melhorTentativa,
  proximaMissao,
  proximoSimulado,
  resumoTrilha,
  statusMissao,
} from '../conteudo/status.ts';
import { useAutenticacao } from '../estado/autenticacao.ts';
import { lerConsulta, useProgresso, type Progresso } from '../estado/progresso.ts';
import { useRanking } from '../estado/ranking.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { firebaseDisponivel } from '../lib/firebase.ts';
import { dataPorExtenso, doisDigitos, formatarNumero, iniciais } from '../lib/formato.ts';
import { calcularSequencia, dataLocal, inicialDiaSemana, ultimosDias } from '../lib/niveis.ts';
import type { Simulado, Treinamento } from '../tipos.ts';

export function Inicio() {
  useTitulo('');
  const progresso = useProgresso();
  const missao = proximaMissao(progresso);
  const simulado = proximoSimulado(progresso) ?? simulados[0];
  const comecou = progresso.xp > 0 || Object.keys(progresso.missoes).length > 0;

  // Sugestões: missões ainda não concluídas, com as liberadas antes das bloqueadas.
  const pendentes = treinamentos
    .filter((t) => t.id !== missao?.id && statusMissao(t, progresso) !== 'concluida')
    .sort((a, b) => Number(statusMissao(a, progresso) === 'bloqueada') - Number(statusMissao(b, progresso) === 'bloqueada'));
  const novas = pendentes.filter((t) => ehNovo(t.publicado_em));
  const sugestoes = (novas.length > 0 ? novas : pendentes).slice(0, 3);

  return (
    <div className="pagina inicio">
      <div className="cabecalho-pagina">
        <div>
          <span className="rotulo">{dataPorExtenso()}</span>
          <h1 className="titulo-pagina">{comecou ? 'Bora continuar a investigação?' : 'Bora resolver seu primeiro incidente?'}</h1>
        </div>
        <Link to="/playground" className="btn">
          <Icone nome="terminal" />
          Abrir o playground
        </Link>
      </div>

      <div className="inicio__grade">
        {missao ? <CartaoContinuar missao={missao} progresso={progresso} /> : <CartaoTudoConcluido />}
        {simulado && <CartaoSimulado simulado={simulado} progresso={progresso} />}
        <CartaoTrilhas progresso={progresso} missaoAtual={missao} />
        <CartaoSequencia progresso={progresso} />
      </div>

      <div className="inicio__secundarios">
        <CartaoDesafio />
        <CartaoRankingResumo />
      </div>

      {sugestoes.length > 0 && (
        <section className="inicio__explorar">
          <div className="cabecalho-secao">
            <h2 className="titulo-secao">{novas.length > 0 ? 'Novas no catálogo' : 'Para explorar'}</h2>
            <Link to="/treinamentos" className="link-forte">
              abrir catálogo
            </Link>
          </div>
          <div className="grade-cartoes">
            {sugestoes.map((t) => (
              <CartaoMissao key={t.id} treinamento={t} progresso={progresso} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CartaoContinuar({ missao, progresso }: { missao: Treinamento; progresso: Progresso }) {
  const emAndamento = statusMissao(missao, progresso) === 'andamento';
  const trilha = trilhaDaMissao(missao.id);
  const feitos = checkpointsConcluidos(missao.id, progresso);
  const consultaSalva = lerConsulta(missao.id);
  const consulta = consultaSalva ?? missao.consulta_inicial;
  const pessoa = missao.chamado.find((mensagem) => mensagem.texto);

  return (
    <article className="cartao cartao--amarelo cartao--destaque continuar">
      <div className="continuar__texto">
        <div className="continuar__etiquetas">
          <span className="tag tag--escuro">{emAndamento ? 'CONTINUE A MISSÃO' : 'COMECE POR AQUI'}</span>
          {trilha && (
            <span className="mono continuar__trilha">
              trilha {doisDigitos(trilha.numero)} · missão {trilha.missoes.indexOf(missao.id) + 1}
            </span>
          )}
        </div>
        <h2 className="continuar__titulo">{missao.titulo}</h2>
        {pessoa && (
          <p className="continuar__pessoa">
            <span className="avatar avatar--pequeno" aria-hidden="true">
              {iniciais(pessoa.autor)}
            </span>
            {emAndamento ? `${pessoa.autor} ainda espera sua resposta.` : `${pessoa.autor} (${pessoa.papel}) abriu um chamado.`}
          </p>
        )}
        <div className="continuar__rodape">
          <ol className="checkpoints-mini" aria-label={`${feitos} de ${missao.checkpoints.length} checkpoints concluídos`}>
            {missao.checkpoints.map((_, i) => (
              <li key={i} className={i < feitos ? 'feito' : i === feitos ? 'atual' : 'bloqueado'}>
                {i < feitos ? (
                  <Icone nome="check" tamanho={14} espessura={3} />
                ) : i === feitos ? (
                  i + 1
                ) : (
                  <Icone nome="cadeado" tamanho={13} espessura={2.5} />
                )}
              </li>
            ))}
          </ol>
          <Link to={`/treinamentos/${missao.id}`} className="btn btn--escuro">
            {emAndamento ? 'Continuar missão' : 'Começar missão'}
            <Icone nome="seta-direita" espessura={2.5} />
          </Link>
        </div>
      </div>
      {consulta && (
        <div className="continuar__codigo">
          <span className="mono">{consultaSalva ? 'sua última consulta' : 'primeira consulta sugerida'}</span>
          <pre>{consulta.split('\n').slice(0, 8).join('\n')}</pre>
        </div>
      )}
    </article>
  );
}

function CartaoTudoConcluido() {
  return (
    <article className="cartao cartao--amarelo cartao--destaque continuar">
      <div className="continuar__texto">
        <span className="tag tag--escuro">TUDO RESOLVIDO</span>
        <h2 className="continuar__titulo">Você concluiu todas as missões disponíveis.</h2>
        <p className="continuar__pessoa">Refaça os simulados para subir sua nota ou crie consultas novas no playground.</p>
        <div className="continuar__rodape">
          <Link to="/playground" className="btn btn--escuro">
            Abrir o playground
            <Icone nome="seta-direita" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CartaoSimulado({ simulado, progresso }: { simulado: Simulado; progresso: Progresso }) {
  const emAndamento = Boolean(progresso.simulados[simulado.id]?.emAndamento);
  const melhor = melhorTentativa(simulado.id, progresso);
  return (
    <article className="cartao cartao--lilas cartao--destaque simulado-inicio">
      <div className="linha-entre">
        <span className="tag">{emAndamento ? 'PROVA EM ANDAMENTO' : 'PRÓXIMO SIMULADO'}</span>
        <span className="mono">nº {doisDigitos(simulado.numero)}</span>
      </div>
      <h2 className="simulado-inicio__titulo">{simulado.titulo}</h2>
      <div className="lista-tags">
        <span className="tag">{simulado.questoes.length} questões</span>
        <span className="tag">{simulado.tempo_min} min</span>
        <span className="tag">mínimo {simulado.nota_minima}%</span>
      </div>
      <p className="simulado-inicio__descricao">{simulado.descricao}</p>
      {melhor && <p className="mono">Sua melhor nota: {melhor.nota}%</p>}
      <Link
        to={emAndamento ? `/simulados/${simulado.id}/prova` : `/simulados?iniciar=${simulado.id}`}
        className="btn simulado-inicio__acao"
      >
        {emAndamento ? 'Continuar prova' : melhor ? 'Tentar de novo' : 'Começar simulado'}
      </Link>
    </article>
  );
}

function CartaoTrilhas({ progresso, missaoAtual }: { progresso: Progresso; missaoAtual?: Treinamento }) {
  return (
    <article className="cartao trilhas-inicio">
      <div className="cabecalho-secao">
        <h2 className="titulo-secao">Suas trilhas</h2>
        <Link to="/trilhas" className="link-forte">
          ver todas
        </Link>
      </div>
      <ul className="trilhas-inicio__lista">
        {trilhas.map((trilha) => {
          const resumo = resumoTrilha(trilha, progresso);
          const completa = resumo.total > 0 && resumo.concluidas === resumo.total;
          const atual = Boolean(missaoAtual && trilha.missoes.includes(missaoAtual.id));
          return (
            <li key={trilha.id}>
              <Link to={`/trilhas/${trilha.id}`} className="trilha-linha">
                <span className={`circulo${completa ? ' circulo--lilas' : atual ? ' circulo--amarelo' : ''}`}>
                  {completa ? <Icone nome="check" tamanho={15} espessura={3} /> : doisDigitos(trilha.numero)}
                </span>
                <span className="trilha-linha__nome">
                  {trilha.titulo}
                  {atual && <span className="tag tag--escuro">atual</span>}
                </span>
                <BarraProgresso
                  valor={resumo.total ? resumo.concluidas / resumo.total : 0}
                  cor={atual ? 'amarelo' : 'lilas'}
                  rotulo={`Progresso na trilha ${trilha.titulo}`}
                  className="trilha-linha__barra"
                />
                <span className="mono trilha-linha__fracao">
                  {resumo.concluidas}/{resumo.total}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function CartaoSequencia({ progresso }: { progresso: Progresso }) {
  const hoje = dataLocal();
  const estudados = new Set(progresso.dias);
  const sequencia = calcularSequencia(progresso.dias, hoje);
  const estudouHoje = estudados.has(hoje);

  return (
    <article className="cartao sequencia">
      <div className="linha-entre">
        <h2 className="titulo-secao">Sequência</h2>
        <span className="tag tag--amarelo sequencia__total">
          <Icone nome="chama" tamanho={14} />
          {sequencia} {sequencia === 1 ? 'dia' : 'dias'}
        </span>
      </div>
      <ol className="sequencia__dias">
        {ultimosDias(hoje, 7).map((dia) => (
          <li key={dia} className={estudados.has(dia) ? 'estudado' : dia === hoje ? 'hoje' : undefined}>
            <span className="mono">{dia === hoje ? 'hoje' : inicialDiaSemana(dia)}</span>
            <span className="sequencia__quadrado">{estudados.has(dia) && <Icone nome="check" tamanho={14} espessura={3} />}</span>
          </li>
        ))}
      </ol>
      <p className="sequencia__texto">
        {estudouHoje
          ? 'Você já estudou hoje. Volte amanhã para manter a sequência.'
          : sequencia > 0
            ? `Rode uma consulta ou resolva um checkpoint hoje para chegar a ${sequencia + 1} dias.`
            : 'Rode uma consulta ou resolva um checkpoint hoje para começar sua sequência.'}
      </p>
    </article>
  );
}

function CartaoRankingResumo() {
  const { usuario } = useAutenticacao();
  const estado = useRanking();
  const TOPO = 5;

  return (
    <article className="cartao ranking-resumo">
      <div className="linha-entre">
        <h2 className="titulo-secao">
          <Icone nome="trofeu" tamanho={17} />
          Ranking
        </h2>
        <Link to="/ranking" className="link-forte">
          ver tudo
        </Link>
      </div>

      {!firebaseDisponivel || estado.fase === 'indisponivel' || estado.fase === 'erro' ? (
        <p className="ranking-resumo__vazio">Ranking indisponível no momento.</p>
      ) : estado.fase === 'requer-login' ? (
        <p className="ranking-resumo__vazio">Entre com Google pra ver o ranking.</p>
      ) : estado.fase === 'carregando' ? (
        <p className="ranking-resumo__vazio">Carregando…</p>
      ) : estado.linhas.length === 0 ? (
        <p className="ranking-resumo__vazio">Ninguém no ranking ainda. Entre com Google e defina um apelido pra ser o primeiro.</p>
      ) : (
        <ol className="ranking-resumo__lista">
          {estado.linhas.slice(0, TOPO).map((linha, i) => (
            <li key={linha.uid} className={linha.uid === usuario?.uid ? 'ranking-resumo__linha ranking-resumo__linha--voce' : 'ranking-resumo__linha'}>
              <span className="ranking-resumo__posicao">{i + 1}</span>
              <span className="ranking-resumo__apelido">{linha.apelido}</span>
              <span className="mono ranking-resumo__xp">{formatarNumero(linha.xp)} XP</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
