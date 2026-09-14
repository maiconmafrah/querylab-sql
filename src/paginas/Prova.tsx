import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CodigoSql } from '../componentes/CodigoSql.tsx';
import { BarraProgresso, Carregando, TECLA_ATALHO } from '../componentes/comum.tsx';
import { EditorSql } from '../componentes/EditorSql.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { Modal } from '../componentes/Modal.tsx';
import { TabelaResultado } from '../componentes/TabelaResultado.tsx';
import { buscarSimulado, nomeTema } from '../conteudo/index.ts';
import {
  alternarMarcada,
  atualizarProva,
  iniciarProva,
  obterProgresso,
  registrarTentativa,
  responderQuestao,
  useProgresso,
  type RespostaQuestao,
} from '../estado/progresso.ts';
import { erroParaExecucao, useAmbiente, type EstadoExecucao } from '../hooks/useAmbiente.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { compararResultados } from '../lib/comparar.ts';
import { doisDigitos, formatarCronometro } from '../lib/formato.ts';
import type { Questao, QuestaoMultipla, QuestaoSql, Simulado } from '../tipos.ts';
import type { Ambiente } from '../db/ambiente.ts';

export function PaginaProva() {
  const { id = '' } = useParams();
  const simulado = buscarSimulado(id);
  if (!simulado) {
    return (
      <div className="pagina">
        <div className="vazio">
          <strong>Esse simulado não existe.</strong>
          <Link to="/simulados" className="btn btn--sm">
            Ver simulados
          </Link>
        </div>
      </div>
    );
  }
  return <Prova key={simulado.id} simulado={simulado} />;
}

function respondida(questao: Questao, resposta: RespostaQuestao | undefined): boolean {
  return questao.tipo === 'multipla' ? typeof resposta === 'number' : typeof resposta === 'string' && resposta.trim() !== '';
}

function Prova({ simulado }: { simulado: Simulado }) {
  useTitulo(`Prova · ${simulado.titulo}`);
  const navegar = useNavigate();
  const progresso = useProgresso();
  const [provaInicial] = useState(() => iniciarProva(simulado.id));
  const prova = progresso.simulados[simulado.id]?.emAndamento ?? provaInicial;

  const temSql = simulado.questoes.some((q) => q.tipo === 'sql');
  const estadoAmbiente = useAmbiente(temSql ? simulado.dataset : undefined);
  const ambiente = estadoAmbiente.fase === 'pronto' ? estadoAmbiente.ambiente : null;
  const aguardandoBanco = temSql && estadoAmbiente.fase === 'carregando';

  const total = simulado.questoes.length;
  const indice = Math.min(Math.max(prova.atual, 0), total - 1);
  const questao = simulado.questoes[indice];
  const resposta = prova.respostas[questao.id];
  const marcada = prova.marcadas.includes(questao.id);

  const fim = Date.parse(prova.iniciadaEm) + simulado.tempo_min * 60_000;
  const [agora, setAgora] = useState(() => Date.now());
  const restante = fim - agora;
  const esgotado = restante <= 0;

  const [confirmarEntrega, setConfirmarEntrega] = useState(false);
  const [entregando, setEntregando] = useState(false);
  const entregue = useRef(false);

  const qtdRespondidas = simulado.questoes.filter((q) => respondida(q, prova.respostas[q.id])).length;
  const irPara = (posicao: number) => atualizarProva(simulado.id, { atual: Math.min(Math.max(posicao, 0), total - 1) });
  const responder = (valor: RespostaQuestao) => responderQuestao(simulado.id, questao.id, valor);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  async function entregar() {
    if (entregue.current) return;
    entregue.current = true;
    setEntregando(true);
    setConfirmarEntrega(false);

    const estado = obterProgresso().simulados[simulado.id]?.emAndamento ?? prova;
    const corretas: Record<string, boolean> = {};
    for (const q of simulado.questoes) {
      corretas[q.id] = await corrigir(q, estado.respostas[q.id], ambiente);
    }
    const acertos = Object.values(corretas).filter(Boolean).length;
    const entregueEm = new Date();
    const duracaoS = Math.min((entregueEm.getTime() - Date.parse(estado.iniciadaEm)) / 1000, simulado.tempo_min * 60);
    const tentativa = registrarTentativa(
      simulado.id,
      {
        id: `t${entregueEm.getTime()}`,
        iniciadaEm: estado.iniciadaEm,
        entregueEm: entregueEm.toISOString(),
        duracaoS: Math.round(duracaoS),
        respostas: estado.respostas,
        corretas,
        acertos,
        total,
        nota: Math.round((acertos / total) * 100),
      },
      simulado.xp_por_acerto,
    );
    navegar(`/simulados/${simulado.id}/resultado/${tentativa.id}`, { replace: true });
  }

  useEffect(() => {
    if (esgotado && !aguardandoBanco) void entregar();
    // entregar só precisa rodar quando o tempo acaba (ou o banco fica pronto depois disso)
  }, [esgotado, aguardandoBanco]);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement;
      if (confirmarEntrega || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      if (alvo.closest('input, textarea, select, .cm-editor, [contenteditable="true"]')) return;
      if (evento.key === 'ArrowRight') irPara(indice + 1);
      else if (evento.key === 'ArrowLeft') irPara(indice - 1);
      else if (questao.tipo === 'multipla' && evento.key.length === 1) {
        const posicao = evento.key.toLowerCase().charCodeAt(0) - 97;
        if (posicao >= 0 && posicao < questao.alternativas.length) responderQuestao(simulado.id, questao.id, posicao);
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  const emBranco = total - qtdRespondidas;

  return (
    <div className="prova">
      <aside className="prova__trilho">
        <Link to="/" className="marca__icone" aria-label="Sair da prova e ir para o início">
          <Icone nome="banco" tamanho={18} espessura={2.25} />
        </Link>
        <Link to="/simulados" className="btn btn--sm btn--icone prova__sair" aria-label="Sair da prova (o tempo continua correndo)" title="Sair (o tempo continua correndo)">
          <Icone nome="seta-esquerda" tamanho={16} espessura={2.5} />
        </Link>
      </aside>

      <div className="prova__principal">
        <header className="prova__topo">
          <div className="prova__identificacao">
            <span className="tag tag--escuro">SIMULADO {doisDigitos(simulado.numero)} · MODO PROVA</span>
            <span className="prova__titulo">{simulado.titulo}</span>
          </div>
          <div className="prova__progresso">
            <span className="mono">
              questão {indice + 1} de {total}
            </span>
            <BarraProgresso valor={qtdRespondidas / total} rotulo="Questões respondidas" />
          </div>
          <div className="prova__acoes">
            <span className={`cronometro${restante < 5 * 60_000 ? ' cronometro--alerta' : ''}`} role="timer" aria-label="Tempo restante">
              <Icone nome="relogio" tamanho={18} espessura={2.25} />
              {formatarCronometro(restante)}
            </span>
            <button type="button" className="btn btn--escuro" onClick={() => setConfirmarEntrega(true)} disabled={entregando}>
              Entregar prova
            </button>
          </div>
        </header>

        <div className="prova__corpo">
          <section className="cartao cartao--destaque questao" aria-labelledby="enunciado">
            <div className="lista-tags">
              <span className="tag tag--amarelo">QUESTÃO {indice + 1}</span>
              <span className="tag">{nomeTema(questao.tema)}</span>
              <span className="tag">{questao.tipo === 'sql' ? 'escreva a consulta' : 'múltipla escolha'}</span>
            </div>
            <h1 className="questao__enunciado" id="enunciado">
              {questao.enunciado}
            </h1>
            {questao.codigo && <CodigoSql codigo={questao.codigo} />}

            {questao.tipo === 'multipla' ? (
              <Alternativas questao={questao} resposta={resposta} aoResponder={responder} />
            ) : (
              <QuestaoDeSql
                key={questao.id}
                questao={questao}
                resposta={typeof resposta === 'string' ? resposta : ''}
                aoResponder={responder}
                ambiente={ambiente}
                carregando={aguardandoBanco}
              />
            )}

            <div className="questao__navegacao">
              <button type="button" className="btn" onClick={() => irPara(indice - 1)} disabled={indice === 0}>
                <Icone nome="seta-esquerda" espessura={2.5} />
                Anterior
              </button>
              <button
                type="button"
                className={`btn ${marcada ? 'btn--amarelo' : 'btn--lilas'}`}
                aria-pressed={marcada}
                onClick={() => alternarMarcada(simulado.id, questao.id)}
              >
                <Icone nome="marcador" espessura={2.25} />
                {marcada ? 'Marcada para revisar' : 'Marcar para revisar'}
              </button>
              {indice < total - 1 ? (
                <button type="button" className="btn btn--escuro questao__proxima" onClick={() => irPara(indice + 1)}>
                  Próxima
                  <Icone nome="seta-direita" espessura={2.5} />
                </button>
              ) : (
                <button type="button" className="btn btn--amarelo questao__proxima" onClick={() => setConfirmarEntrega(true)}>
                  Revisar e entregar
                </button>
              )}
            </div>
          </section>

          <aside className="prova__lateral">
            <div className="cartao mapa-prova">
              <h2 className="titulo-secao">Mapa da prova</h2>
              <ol className="mapa-prova__grade">
                {simulado.questoes.map((q, i) => {
                  const feita = respondida(q, prova.respostas[q.id]);
                  const revisar = prova.marcadas.includes(q.id);
                  const classe =
                    i === indice ? 'celula celula--atual' : revisar ? 'celula celula--marcada' : feita ? 'celula celula--respondida' : 'celula';
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        className={classe}
                        onClick={() => irPara(i)}
                        aria-current={i === indice ? 'step' : undefined}
                        aria-label={`Questão ${i + 1}${feita ? ', respondida' : ', em branco'}${revisar ? ', marcada para revisar' : ''}`}
                      >
                        {i + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <ul className="legenda">
                <li>
                  <span className="celula-amostra celula--respondida" />
                  Respondida
                </li>
                <li>
                  <span className="celula-amostra celula--marcada" />
                  Para revisar
                </li>
                <li>
                  <span className="celula-amostra celula--atual" />
                  Atual
                </li>
                <li>
                  <span className="celula-amostra" />
                  Em branco
                </li>
              </ul>
            </div>

            <div className="cartao resumo-prova">
              <div>
                <strong>{qtdRespondidas}</strong>
                <span>respondidas</span>
              </div>
              <div>
                <strong>{prova.marcadas.length}</strong>
                <span>para revisar</span>
              </div>
              <div>
                <strong>{emBranco}</strong>
                <span>em branco</span>
              </div>
            </div>

            <p className="prova__dica">
              <span className="avatar avatar--quadrado" aria-hidden="true">
                <Icone nome="trofeu" tamanho={17} />
              </span>
              <span>
                Cada acerto vale <strong>{simulado.xp_por_acerto} XP</strong>. Atalhos: <kbd className="atalho atalho--claro">A</kbd>–
                <kbd className="atalho atalho--claro">D</kbd> escolhem, <kbd className="atalho atalho--claro">←</kbd>{' '}
                <kbd className="atalho atalho--claro">→</kbd> navegam.
              </span>
            </p>
          </aside>
        </div>
      </div>

      <Modal
        aberto={confirmarEntrega}
        aoFechar={() => setConfirmarEntrega(false)}
        titulo="Entregar a prova?"
        acoes={
          <>
            <button type="button" className="btn" data-foco-inicial onClick={() => setConfirmarEntrega(false)}>
              Voltar para a prova
            </button>
            <button type="button" className="btn btn--escuro" onClick={() => void entregar()} disabled={aguardandoBanco}>
              {aguardandoBanco ? 'Preparando a correção…' : 'Entregar agora'}
            </button>
          </>
        }
      >
        <div className="resumo-prova resumo-prova--modal">
          <div>
            <strong>{qtdRespondidas}</strong>
            <span>respondidas</span>
          </div>
          <div>
            <strong>{emBranco}</strong>
            <span>em branco</span>
          </div>
          <div>
            <strong>{prova.marcadas.length}</strong>
            <span>para revisar</span>
          </div>
        </div>
        {emBranco > 0 && <p>Questões em branco contam como erro.</p>}
      </Modal>

      {entregando && (
        <div className="modal-fundo">
          <div className="modal">
            <Carregando texto="Corrigindo sua prova…" />
          </div>
        </div>
      )}
    </div>
  );
}

async function corrigir(questao: Questao, resposta: RespostaQuestao | undefined, ambiente: Ambiente | null): Promise<boolean> {
  if (questao.tipo === 'multipla') return resposta === questao.correta;
  if (typeof resposta !== 'string' || resposta.trim() === '' || !ambiente) return false;
  try {
    const obtido = await ambiente.executarIsolado(resposta);
    const esperado = await ambiente.executarGabarito(questao.gabarito_sql);
    return compararResultados(esperado, obtido.resultado, {
      ordemImporta: questao.ordem_importa,
      tolerancia: questao.tolerancia,
    }).ok;
  } catch {
    return false;
  }
}

function Alternativas({
  questao,
  resposta,
  aoResponder,
}: {
  questao: QuestaoMultipla;
  resposta: RespostaQuestao | undefined;
  aoResponder: (valor: number) => void;
}) {
  return (
    <div className="alternativas" role="radiogroup" aria-labelledby="enunciado">
      {questao.alternativas.map((alternativa, i) => {
        const escolhida = resposta === i;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={escolhida}
            className={`alternativa${escolhida ? ' alternativa--escolhida' : ''}`}
            onClick={() => aoResponder(i)}
          >
            <span className="alternativa__letra">{String.fromCharCode(65 + i)}</span>
            {questao.formato_alternativas === 'codigo' ? (
              <CodigoSql codigo={alternativa} className="alternativa__codigo" />
            ) : (
              <span className="alternativa__texto">{alternativa}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function QuestaoDeSql({
  questao,
  resposta,
  aoResponder,
  ambiente,
  carregando,
}: {
  questao: QuestaoSql;
  resposta: string;
  aoResponder: (valor: string) => void;
  ambiente: Ambiente | null;
  carregando: boolean;
}) {
  const [teste, setTeste] = useState<EstadoExecucao>({ fase: 'ocioso' });

  async function testar() {
    if (!ambiente || !resposta.trim()) return;
    setTeste({ fase: 'rodando' });
    try {
      setTeste({ fase: 'ok', ...(await ambiente.executarIsolado(resposta)) });
    } catch (erro) {
      setTeste(erroParaExecucao(erro));
    }
  }

  return (
    <div className="questao-sql">
      <div className="cartao editor-cartao">
        <div className="editor-cartao__barra">
          <span className="aba-arquivo">
            <Icone nome="terminal" tamanho={14} />
            {questao.id}.sql
          </span>
          <button type="button" className="btn btn--sm btn--amarelo" onClick={() => void testar()} disabled={!ambiente || teste.fase === 'rodando'}>
            <Icone nome="play" tamanho={13} />
            Testar consulta
            <kbd className="atalho">{TECLA_ATALHO} ↵</kbd>
          </button>
        </div>
        <EditorSql valor={resposta} aoMudar={aoResponder} aoExecutar={() => void testar()} alturaMinima={170} textoVazio="Sua resposta é a consulta escrita aqui…" />
      </div>
      <p className="questao-sql__nota">
        A consulta deste editor é a sua resposta. Ela é corrigida quando você entrega a prova, comparando o resultado com o gabarito.
      </p>
      {carregando && <Carregando texto="Preparando o banco para você testar…" />}
      {teste.fase === 'rodando' && <Carregando texto="Rodando…" />}
      {teste.fase === 'erro' && (
        <div className="aviso aviso--erro" role="alert">
          <Icone nome="alerta" />
          <div>
            <strong>{teste.titulo}</strong>
            <pre className="erro-sql__mensagem">{teste.mensagem}</pre>
          </div>
        </div>
      )}
      {teste.fase === 'ok' && (
        <div className="cartao questao-sql__resultado">
          <TabelaResultado resultado={teste.resultado} limite={50} alturaMaxima={260} />
        </div>
      )}
    </div>
  );
}
