import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TagDificuldade } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { Modal } from '../componentes/Modal.tsx';
import { TabelaTentativas } from '../componentes/TabelaTentativas.tsx';
import { buscarSimulado, provasDeEntrevista } from '../conteudo/index.ts';
import { melhorTentativa, tentativasRecentes, tentativasSimulado } from '../conteudo/status.ts';
import { useProgresso, type Progresso } from '../estado/progresso.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import type { Simulado } from '../tipos.ts';

const DICAS_ENTREVISTA = [
  { icone: 'lampada', texto: 'Fale seu raciocínio enquanto escreve — o entrevistador quer ver como você pensa, não só o resultado final.' },
  { icone: 'marcador', texto: 'Comece pelo FROM: identifique as tabelas e como elas se relacionam antes de escrever o SELECT.' },
  { icone: 'relogio', texto: 'Travou? Diga em voz alta o que você tentaria (documentação, EXPLAIN, um exemplo menor) — isso conta mais do que o silêncio.' },
] as const;

export function Entrevista() {
  const [parametros, setParametros] = useSearchParams();
  const aba = parametros.get('aba') === 'historico' ? 'historico' : 'provas';
  useTitulo(aba === 'historico' ? 'Histórico de entrevista' : 'Teste de Entrevista');
  const progresso = useProgresso();
  const navegar = useNavigate();
  const [confirmar, setConfirmar] = useState<Simulado | null>(null);
  const idIniciar = parametros.get('iniciar');

  useEffect(() => {
    if (!idIniciar) return;
    const simulado = buscarSimulado(idIniciar);
    const novos = new URLSearchParams(parametros);
    novos.delete('iniciar');
    setParametros(novos, { replace: true });
    if (!simulado) return;
    if (progresso.simulados[simulado.id]?.emAndamento) navegar(`/simulados/${simulado.id}/prova`);
    else setConfirmar(simulado);
  }, [idIniciar, navegar, parametros, progresso.simulados, setParametros]);

  const tentativas = tentativasRecentes(provasDeEntrevista, progresso);

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <p className="rotulo entrevista__rotulo">
            <Icone nome="maleta" tamanho={14} />
            Fora da trilha · sem incidente de loja dessa vez
          </p>
          <h1 className="titulo-pagina">Teste de Entrevista</h1>
          <p className="subtitulo-pagina">
            Duas provas com as perguntas que mais caem de verdade num teste técnico de SQL — segundo maior salário, quem
            ganha mais que o chefe, duplicatas, ranking por departamento. A base aqui não é a loja: é uma empresa
            fictícia com funcionários, cargos e salários, o cenário clássico de qualquer entrevista.
          </p>
        </div>
      </div>

      <div className="abas abas--pagina" role="tablist" aria-label="Teste de Entrevista">
        <Link to="/entrevista" role="tab" className="aba" aria-selected={aba === 'provas'}>
          Provas
        </Link>
        <Link to="/entrevista?aba=historico" role="tab" className="aba" aria-selected={aba === 'historico'}>
          Histórico{tentativas.length > 0 ? ` (${tentativas.length})` : ''}
        </Link>
      </div>

      {aba === 'provas' ? (
        <ListaProvas progresso={progresso} aoComecar={setConfirmar} />
      ) : tentativas.length === 0 ? (
        <div className="vazio">
          <strong>Nenhuma prova de entrevista entregue ainda.</strong>
          <span>Cada tentativa fica guardada aqui com a nota e a correção — e vai junto pra nuvem se você entrar com Google.</span>
          <Link to="/entrevista" className="btn btn--sm">
            Ver provas
          </Link>
        </div>
      ) : (
        <TabelaTentativas tentativas={tentativas} rotuloProva="Prova" />
      )}

      <Modal
        aberto={confirmar !== null}
        aoFechar={() => setConfirmar(null)}
        titulo={confirmar ? `Começar ${confirmar.titulo}?` : ''}
        acoes={
          <>
            <button type="button" className="btn" onClick={() => setConfirmar(null)}>
              Agora não
            </button>
            <button
              type="button"
              className="btn btn--amarelo"
              data-foco-inicial
              onClick={() => confirmar && navegar(`/simulados/${confirmar.id}/prova`)}
            >
              <Icone nome="relogio" />
              Começar a prova
            </button>
          </>
        }
      >
        {confirmar && (
          <ul className="lista-regras">
            <li>
              <Icone nome="relogio" tamanho={16} />
              São {confirmar.questoes.length} questões em {confirmar.tempo_min} minutos. O cronômetro começa agora e
              continua correndo se você sair da página.
            </li>
            <li>
              <Icone nome="marcador" tamanho={16} />
              Dá para marcar questões para revisar e voltar nelas antes de entregar.
            </li>
            <li>
              <Icone nome="trofeu" tamanho={16} />
              Nota mínima de {confirmar.nota_minima}%. Cada acerto vale {confirmar.xp_por_acerto} XP.
            </li>
          </ul>
        )}
      </Modal>
    </div>
  );
}

function ListaProvas({ progresso, aoComecar }: { progresso: Progresso; aoComecar: (simulado: Simulado) => void }) {
  return (
    <>
      <div className="lista-simulados">
        {provasDeEntrevista.map((simulado) => {
          const emAndamento = Boolean(progresso.simulados[simulado.id]?.emAndamento);
          const melhor = melhorTentativa(simulado.id, progresso);
          const feitas = tentativasSimulado(simulado.id, progresso).length;
          const sqls = simulado.questoes.filter((q) => q.tipo === 'sql').length;
          return (
            <article
              key={simulado.id}
              className={`cartao cartao-simulado cartao-simulado--entrevista${emAndamento ? ' cartao--amarelo cartao--destaque' : ''}`}
            >
              <div className="cartao-simulado__numero">
                <Icone nome="maleta" tamanho={20} espessura={2} />
              </div>
              <div className="cartao-simulado__conteudo">
                <div className="lista-tags">
                  <span className="tag tag--escuro">Entrevista</span>
                  <TagDificuldade dificuldade={simulado.dificuldade} />
                  <span className="tag">{simulado.questoes.length} questões</span>
                  {sqls > 0 && <span className="tag">{sqls} de SQL</span>}
                  <span className="tag">{simulado.tempo_min} min</span>
                  <span className="tag">mínimo {simulado.nota_minima}%</span>
                </div>
                <h2 className="cartao-simulado__titulo">{simulado.titulo}</h2>
                <p className="cartao-simulado__descricao">{simulado.descricao}</p>
                {melhor && (
                  <p className="mono cartao-simulado__historico">
                    melhor nota {melhor.nota}% · {feitas} {feitas === 1 ? 'tentativa' : 'tentativas'}
                    {melhor.nota >= simulado.nota_minima ? ' · aprovado' : ''}
                  </p>
                )}
              </div>
              <div className="cartao-simulado__acoes">
                {emAndamento ? (
                  <Link to={`/simulados/${simulado.id}/prova`} className="btn btn--escuro">
                    Continuar prova
                    <Icone nome="seta-direita" espessura={2.5} />
                  </Link>
                ) : (
                  <button type="button" className="btn btn--amarelo" onClick={() => aoComecar(simulado)}>
                    <Icone nome="play" tamanho={14} />
                    {melhor ? 'Tentar de novo' : 'Começar'}
                  </button>
                )}
                {melhor && (
                  <Link to={`/simulados/${simulado.id}/resultado/${melhor.id}`} className="link-forte">
                    ver melhor correção
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section className="cartao entrevista-dicas">
        <h2 className="titulo-secao">Antes de começar</h2>
        <ul className="entrevista-dicas__lista">
          {DICAS_ENTREVISTA.map((dica) => (
            <li key={dica.texto}>
              <Icone nome={dica.icone} tamanho={17} />
              <span>{dica.texto}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
