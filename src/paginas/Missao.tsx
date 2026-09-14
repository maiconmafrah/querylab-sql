import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CodigoSql } from '../componentes/CodigoSql.tsx';
import { TagDificuldade } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { Modal } from '../componentes/Modal.tsx';
import { PainelSql } from '../componentes/PainelSql.tsx';
import { buscarSimulado, buscarTreinamento, nomeTema, trilhaDaMissao } from '../conteudo/index.ts';
import { requisitosPendentes, xpGanhoMissao, xpTotalMissao } from '../conteudo/status.ts';
import {
  abrirMissao,
  concluirCheckpoint,
  lerConsulta,
  obterProgresso,
  revelarDica,
  salvarConsulta,
  useProgresso,
  type ProgressoCheckpoint,
} from '../estado/progresso.ts';
import { erroParaExecucao, useAmbiente, usePainelSql, type PainelSqlEstado } from '../hooks/useAmbiente.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { compararResultados, compararValor } from '../lib/comparar.ts';
import { iniciais } from '../lib/formato.ts';
import { xpCheckpoint } from '../lib/niveis.ts';
import type { Checkpoint, MensagemChamado, Treinamento } from '../tipos.ts';
import { NaoEncontrado } from './NaoEncontrado.tsx';

export function PaginaMissao() {
  const { id = '' } = useParams();
  const treinamento = buscarTreinamento(id);
  if (!treinamento) return <NaoEncontrado />;
  return <Missao key={treinamento.id} treinamento={treinamento} />;
}

function Missao({ treinamento }: { treinamento: Treinamento }) {
  useTitulo(treinamento.titulo);
  const progresso = useProgresso();
  const pendentes = requisitosPendentes(treinamento, progresso);
  if (!progresso.missoes[treinamento.id] && pendentes.length > 0) {
    return <MissaoBloqueada treinamento={treinamento} pendentes={pendentes} />;
  }
  return <MissaoAberta treinamento={treinamento} />;
}

function MissaoBloqueada({ treinamento, pendentes }: { treinamento: Treinamento; pendentes: Treinamento[] }) {
  return (
    <div className="pagina">
      <div className="cartao cartao--bloqueado bloqueio">
        <span className="circulo">
          <Icone nome="cadeado" />
        </span>
        <span className="rotulo">Missão bloqueada</span>
        <h1 className="titulo-pagina">{treinamento.titulo}</h1>
        <p>Para liberar esta missão, termine antes:</p>
        <ul className="bloqueio__lista">
          {pendentes.map((pendente) => (
            <li key={pendente.id}>
              <Link to={`/treinamentos/${pendente.id}`} className="link-forte">
                {pendente.titulo}
              </Link>
            </li>
          ))}
        </ul>
        <p className="bloqueio__nota">
          Prefere estudar fora de ordem? Ative o modo livre em{' '}
          <Link to="/progresso" className="link-forte">
            Progresso
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function MissaoAberta({ treinamento }: { treinamento: Treinamento }) {
  const navegar = useNavigate();
  const progresso = useProgresso();
  const missao = progresso.missoes[treinamento.id];
  const trilha = trilhaDaMissao(treinamento.id);
  const posicao = trilha ? trilha.missoes.indexOf(treinamento.id) + 1 : 0;
  const total = treinamento.checkpoints.length;
  const concluidos = treinamento.checkpoints.map((_, i) => Boolean(missao?.checkpoints[i]));
  const atual = concluidos.indexOf(false);

  const estadoAmbiente = useAmbiente(treinamento.dataset);
  const painel = usePainelSql(estadoAmbiente);
  const [consulta, setConsulta] = useState(() => lerConsulta(treinamento.id) ?? treinamento.consulta_inicial ?? '');
  const [selecionado, setSelecionado] = useState(() => (atual === -1 ? total - 1 : atual));
  const [ganho, setGanho] = useState<{ xp: number; chave: number } | null>(null);
  const [missaoConcluida, setMissaoConcluida] = useState(false);

  useEffect(() => {
    abrirMissao(treinamento.id);
  }, [treinamento.id]);

  useEffect(() => {
    const espera = setTimeout(() => salvarConsulta(treinamento.id, consulta), 400);
    return () => clearTimeout(espera);
  }, [consulta, treinamento.id]);

  const aoConcluir = (xp: number) => {
    setGanho({ xp, chave: Date.now() });
    const feitos = Object.keys(obterProgresso().missoes[treinamento.id]?.checkpoints ?? {}).length;
    if (feitos >= total) setMissaoConcluida(true);
  };

  const abrirNoEditor = (sql: string) =>
    setConsulta((texto) => (texto.trim() ? `${texto.trimEnd()}\n\n${sql}` : sql));

  const proxima = trilha && posicao < trilha.missoes.length ? buscarTreinamento(trilha.missoes[posicao]) : undefined;
  const simuladoFinal = trilha && !proxima && trilha.simulado_final ? buscarSimulado(trilha.simulado_final) : undefined;
  const checkpoint = treinamento.checkpoints[selecionado];

  return (
    <div className="missao">
      <header className="topo-missao">
        <div className="topo-missao__esquerda">
          <Link
            to={trilha ? `/trilhas/${trilha.id}` : '/treinamentos'}
            className="btn btn--icone"
            aria-label={trilha ? `Voltar para a trilha ${trilha.titulo}` : 'Voltar para os treinamentos'}
          >
            <Icone nome="seta-esquerda" espessura={2.25} />
          </Link>
          <div className="topo-missao__textos">
            <span className="topo-missao__contexto">
              {trilha ? `Missão ${posicao} · Trilha ${trilha.titulo}` : nomeTema(treinamento.tema)}
            </span>
            <h1 className="topo-missao__titulo">{treinamento.titulo}</h1>
          </div>
        </div>
        <div className="topo-missao__direita">
          <TagDificuldade dificuldade={treinamento.dificuldade} />
          <span className="tag">~{treinamento.duracao_min} min</span>
          <span className="tag tag--lilas">
            {xpGanhoMissao(treinamento.id, progresso)} / {xpTotalMissao(treinamento)} XP
          </span>
          {ganho && ganho.xp > 0 && (
            <span key={ganho.chave} className="xp-ganho" aria-live="polite">
              +{ganho.xp} XP
            </span>
          )}
        </div>
      </header>

      <ol className="stepper" aria-label="Checkpoints da missão">
        {treinamento.checkpoints.map((item, i) => {
          const feito = concluidos[i];
          const liberado = feito || i === atual;
          const classes = ['passo', feito ? 'passo--feito' : liberado ? 'passo--atual' : 'passo--bloqueado'];
          if (i === selecionado) classes.push('passo--selecionado');
          return (
            <li key={i}>
              <button
                type="button"
                className={classes.join(' ')}
                disabled={!liberado}
                onClick={() => setSelecionado(i)}
                aria-current={i === selecionado ? 'step' : undefined}
              >
                <span className="circulo">
                  {feito ? (
                    <Icone nome="check" tamanho={15} espessura={3} />
                  ) : liberado ? (
                    i + 1
                  ) : (
                    <Icone nome="cadeado" tamanho={14} espessura={2.25} />
                  )}
                </span>
                <span className="passo__textos">
                  <span className="passo__titulo">{item.titulo}</span>
                  <span className="passo__sub">
                    {feito ? `+${missao?.checkpoints[i]?.xp ?? 0} XP` : liberado ? 'em andamento' : 'bloqueado'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="missao__corpo">
        <div className="missao__coluna">
          <Chamado mensagens={treinamento.chamado} dataset={treinamento.dataset} aoAbrirNoEditor={abrirNoEditor} />
          <CartaoCheckpoint
            key={selecionado}
            treinamento={treinamento}
            indice={selecionado}
            checkpoint={checkpoint}
            concluido={missao?.checkpoints[selecionado]}
            dicasReveladas={missao?.dicas[selecionado] ?? 0}
            painel={painel}
            consulta={consulta}
            aoConcluir={aoConcluir}
            aoAbrirNoEditor={abrirNoEditor}
            aoProximo={selecionado < total - 1 && concluidos[selecionado] ? () => setSelecionado(selecionado + 1) : undefined}
          />
        </div>
        <PainelSql
          estadoAmbiente={estadoAmbiente}
          painel={painel}
          consulta={consulta}
          aoMudarConsulta={setConsulta}
          nomeArquivo={`${treinamento.id}.sql`}
        />
      </div>

      <Modal
        aberto={missaoConcluida}
        aoFechar={() => setMissaoConcluida(false)}
        titulo="Missão concluída!"
        topo={
          <div className="modal-trofeu">
            <Icone nome="trofeu" tamanho={38} />
          </div>
        }
        acoes={
          <>
            <button type="button" className="btn" onClick={() => setMissaoConcluida(false)}>
              Revisar a missão
            </button>
            {proxima ? (
              <button type="button" className="btn btn--amarelo" data-foco-inicial onClick={() => navegar(`/treinamentos/${proxima.id}`)}>
                Próxima missão
                <Icone nome="seta-direita" />
              </button>
            ) : simuladoFinal ? (
              <button
                type="button"
                className="btn btn--amarelo"
                data-foco-inicial
                onClick={() => navegar(`/simulados?iniciar=${simuladoFinal.id}`)}
              >
                Ir para o simulado
                <Icone nome="seta-direita" />
              </button>
            ) : (
              <button type="button" className="btn btn--amarelo" data-foco-inicial onClick={() => navegar('/treinamentos')}>
                Ver outras missões
              </button>
            )}
          </>
        }
      >
        <p>
          Você fechou <strong>{treinamento.titulo}</strong> e somou{' '}
          <strong>{xpGanhoMissao(treinamento.id, progresso)} XP</strong> nesta missão.
        </p>
        {proxima && <p className="modal__proximo">A seguir: {proxima.titulo}</p>}
        {simuladoFinal && <p className="modal__proximo">Trilha completa! Hora do simulado {simuladoFinal.titulo}.</p>}
      </Modal>
    </div>
  );
}

function Chamado({
  mensagens,
  dataset,
  aoAbrirNoEditor,
}: {
  mensagens: MensagemChamado[];
  dataset: string;
  aoAbrirNoEditor: (sql: string) => void;
}) {
  return (
    <section className="cartao chamado" aria-label="Chamado">
      <div className="chamado__topo">
        <span className="rotulo">Chamado</span>
        <span className="chamado__dataset">
          <Icone nome="banco" tamanho={14} />
          {dataset.replace(/\.sql$/, '')}
        </span>
      </div>
      <div className="chamado__mensagens">
        {mensagens.map((mensagem, i) => {
          const sistema = Boolean(mensagem.log || mensagem.codigo);
          return (
            <div key={i} className="mensagem">
              <span className={sistema ? 'avatar avatar--quadrado' : 'avatar'} aria-hidden="true">
                {sistema ? <Icone nome="banco" tamanho={16} espessura={2.25} /> : iniciais(mensagem.autor)}
              </span>
              <div className="mensagem__conteudo">
                <span className="mensagem__autor">
                  {mensagem.autor}
                  {mensagem.papel && <span> · {mensagem.papel}</span>}
                </span>
                {mensagem.texto && <p className="mensagem__balao">{mensagem.texto}</p>}
                {mensagem.log && <pre className="mensagem__log">{mensagem.log.join('\n')}</pre>}
                {mensagem.codigo && (
                  <div className="mensagem__codigo">
                    <CodigoSql codigo={mensagem.codigo} className="codigo" />
                    <button type="button" className="btn btn--sm" onClick={() => aoAbrirNoEditor(mensagem.codigo!)}>
                      <Icone nome="copiar" tamanho={14} />
                      Abrir no editor
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type EstadoValidacao = { fase: 'ocioso' } | { fase: 'validando' } | { fase: 'erro'; motivo: string };

interface PropsCheckpoint {
  treinamento: Treinamento;
  indice: number;
  checkpoint: Checkpoint;
  concluido?: ProgressoCheckpoint;
  dicasReveladas: number;
  painel: PainelSqlEstado;
  consulta: string;
  aoConcluir: (xp: number) => void;
  aoAbrirNoEditor: (sql: string) => void;
  aoProximo?: () => void;
}

function CartaoCheckpoint({
  treinamento,
  indice,
  checkpoint,
  concluido,
  dicasReveladas,
  painel,
  consulta,
  aoConcluir,
  aoAbrirNoEditor,
  aoProximo,
}: PropsCheckpoint) {
  const idCampo = useId();
  const [resposta, setResposta] = useState('');
  const [validacao, setValidacao] = useState<EstadoValidacao>({ fase: 'ocioso' });
  const [confirmarSolucao, setConfirmarSolucao] = useState(false);
  const { ambiente } = painel;
  const dicas = checkpoint.dicas ?? [];
  const total = treinamento.checkpoints.length;
  const solucao = checkpoint.tipo === 'valor' ? checkpoint.resposta_sql : checkpoint.gabarito_sql;
  const validando = validacao.fase === 'validando';

  async function validar() {
    if (!ambiente || validando) return;
    setValidacao({ fase: 'validando' });
    try {
      if (checkpoint.tipo === 'valor') {
        const esperado = await ambiente.executarGabarito(checkpoint.resposta_sql);
        const veredito = compararValor(resposta, esperado.linhas[0]?.[0] ?? null, checkpoint.tolerancia ?? 0);
        if (!veredito.ok) {
          setValidacao({ fase: 'erro', motivo: veredito.motivo ?? 'Resposta incorreta.' });
          return;
        }
      } else {
        let obtido;
        try {
          obtido = await ambiente.executarIsolado(consulta);
        } catch (erro) {
          painel.setExecucao(erroParaExecucao(erro));
          setValidacao({ fase: 'erro', motivo: 'Sua consulta deu erro. Veja a mensagem no painel de resultado.' });
          return;
        }
        painel.mostrarResultado(obtido);
        const esperado = await ambiente.executarGabarito(checkpoint.gabarito_sql);
        const veredito = compararResultados(esperado, obtido.resultado, {
          ordemImporta: checkpoint.ordem_importa,
          tolerancia: checkpoint.tolerancia,
        });
        if (!veredito.ok) {
          setValidacao({ fase: 'erro', motivo: veredito.motivo ?? 'O resultado não confere.' });
          return;
        }
      }
      setValidacao({ fase: 'ocioso' });
      aoConcluir(concluirCheckpoint(treinamento.id, indice, checkpoint.xp, total));
    } catch (erro) {
      setValidacao({ fase: 'erro', motivo: `Não consegui validar: ${erro instanceof Error ? erro.message : String(erro)}` });
    }
  }

  function verSolucao() {
    setConfirmarSolucao(false);
    aoConcluir(concluirCheckpoint(treinamento.id, indice, 0, total));
  }

  return (
    <section className={`cartao checkpoint${concluido ? ' checkpoint--concluido' : ''}`} aria-labelledby={`${idCampo}-titulo`}>
      <div className="checkpoint__topo">
        <span className="rotulo">
          Checkpoint {indice + 1} de {total} · {checkpoint.tipo === 'valor' ? 'resposta' : 'consulta'}
        </span>
        <span className="tag tag--lilas">
          {concluido ? `+${concluido.xp} XP` : `${xpCheckpoint(checkpoint.xp, dicasReveladas)} XP`}
        </span>
      </div>
      <h2 className="checkpoint__pergunta" id={`${idCampo}-titulo`}>
        {checkpoint.pergunta}
      </h2>

      {concluido ? (
        <>
          <div className="aviso aviso--ok">
            <Icone nome="check" espessura={2.75} />
            <span>
              <strong>Checkpoint concluído.</strong>{' '}
              {concluido.xp === 0 ? 'Você viu a solução, então este não valeu XP.' : `Você ganhou ${concluido.xp} XP.`}
            </span>
          </div>
          {checkpoint.explicacao && <p className="checkpoint__explicacao">{checkpoint.explicacao}</p>}
          <details className="solucao">
            <summary>
              <Icone nome="olho" tamanho={16} />
              Ver a consulta de referência
            </summary>
            <div className="solucao__conteudo">
              <CodigoSql codigo={solucao} />
              <button type="button" className="btn btn--sm" onClick={() => aoAbrirNoEditor(solucao)}>
                <Icone nome="copiar" tamanho={14} />
                Abrir no editor
              </button>
            </div>
          </details>
          {aoProximo && (
            <button type="button" className="btn btn--amarelo checkpoint__proximo" onClick={aoProximo}>
              Próximo checkpoint
              <Icone nome="seta-direita" />
            </button>
          )}
        </>
      ) : (
        <>
          {checkpoint.tipo === 'valor' ? (
            <form
              className="checkpoint__form"
              onSubmit={(evento) => {
                evento.preventDefault();
                void validar();
              }}
            >
              <label className="sr-only" htmlFor={idCampo}>
                Sua resposta
              </label>
              <input
                id={idCampo}
                className="campo"
                value={resposta}
                onChange={(evento) => setResposta(evento.target.value)}
                placeholder={checkpoint.unidade === 'R$' ? 'R$ 0,00' : 'Sua resposta'}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn btn--amarelo" disabled={!ambiente || validando}>
                {validando && <span className="girando" aria-hidden="true" />}
                Validar
              </button>
            </form>
          ) : (
            <div className="checkpoint__query">
              <p className="checkpoint__instrucao">
                Escreva a consulta no editor e clique em validar. Se houver vários comandos, vale o resultado do último.
              </p>
              <button type="button" className="btn btn--amarelo" onClick={() => void validar()} disabled={!ambiente || validando}>
                {validando ? <span className="girando" aria-hidden="true" /> : <Icone nome="check" espessura={2.75} />}
                Validar consulta do editor
              </button>
            </div>
          )}

          {validacao.fase === 'erro' && (
            <div className="aviso aviso--erro" role="alert">
              <Icone nome="x" espessura={2.75} />
              <span>{validacao.motivo}</span>
            </div>
          )}

          <div className="dicas">
            {dicas.slice(0, dicasReveladas).map((dica, i) => (
              <div key={i} className="dica">
                <Icone nome="lampada" tamanho={17} />
                <span>
                  <strong>Dica {i + 1}.</strong> {dica}
                </span>
              </div>
            ))}
            <div className="dicas__acoes">
              {dicasReveladas < dicas.length ? (
                <button type="button" className="btn btn--sm btn--lilas" onClick={() => revelarDica(treinamento.id, indice)}>
                  <Icone nome="lampada" tamanho={15} />
                  Ver dica {dicasReveladas + 1} de {dicas.length}
                  <span className="mono dicas__custo">−10 XP</span>
                </button>
              ) : (
                <button type="button" className="btn btn--sm" onClick={() => setConfirmarSolucao(true)}>
                  <Icone nome="olho" tamanho={15} />
                  Mostrar a solução
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        aberto={confirmarSolucao}
        aoFechar={() => setConfirmarSolucao(false)}
        titulo="Ver a solução?"
        acoes={
          <>
            <button type="button" className="btn" data-foco-inicial onClick={() => setConfirmarSolucao(false)}>
              Continuar tentando
            </button>
            <button type="button" className="btn btn--escuro" onClick={verSolucao}>
              Ver solução (0 XP)
            </button>
          </>
        }
      >
        <p>O checkpoint vai ser marcado como concluído, mas sem XP. Você ainda pode estudar a consulta e seguir para o próximo.</p>
      </Modal>
    </section>
  );
}
