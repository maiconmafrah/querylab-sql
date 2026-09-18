import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TagDificuldade } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { Modal } from '../componentes/Modal.tsx';
import { buscarSimulado, simuladosDaTrilha } from '../conteudo/index.ts';
import { TabelaTentativas } from '../componentes/TabelaTentativas.tsx';
import { ehNovo, melhorTentativa, simuladoAprovado, tentativasRecentes, tentativasSimulado } from '../conteudo/status.ts';
import { useProgresso } from '../estado/progresso.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { doisDigitos } from '../lib/formato.ts';
import type { Simulado } from '../tipos.ts';

export function Simulados() {
  const [parametros, setParametros] = useSearchParams();
  const aba = parametros.get('aba') === 'historico' ? 'historico' : 'disponiveis';
  useTitulo(aba === 'historico' ? 'Histórico de simulados' : 'Simulados');
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

  const tentativas = tentativasRecentes(simuladosDaTrilha, progresso);

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">Simulados</h1>
          <p className="subtitulo-pagina">
            Provas com tempo, questões de múltipla escolha e consultas para escrever. No final, você vê o gabarito comentado.
          </p>
        </div>
      </div>

      <div className="abas abas--pagina" role="tablist" aria-label="Simulados">
        <Link to="/simulados" role="tab" className="aba" aria-selected={aba === 'disponiveis'}>
          Disponíveis
        </Link>
        <Link to="/simulados?aba=historico" role="tab" className="aba" aria-selected={aba === 'historico'}>
          Histórico{tentativas.length > 0 ? ` (${tentativas.length})` : ''}
        </Link>
      </div>

      {aba === 'disponiveis' ? (
        <div className="lista-simulados">
          {simuladosDaTrilha.map((simulado) => {
            const emAndamento = Boolean(progresso.simulados[simulado.id]?.emAndamento);
            const melhor = melhorTentativa(simulado.id, progresso);
            const feitas = tentativasSimulado(simulado.id, progresso).length;
            const sqls = simulado.questoes.filter((q) => q.tipo === 'sql').length;
            return (
              <article key={simulado.id} className={`cartao cartao-simulado${emAndamento ? ' cartao--amarelo cartao--destaque' : ''}`}>
                <div className="cartao-simulado__numero">
                  <span className="mono">nº</span>
                  {doisDigitos(simulado.numero)}
                </div>
                <div className="cartao-simulado__conteudo">
                  <div className="lista-tags">
                    {ehNovo(simulado.publicado_em) && feitas === 0 && <span className="tag tag--lilas">Novo</span>}
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
                      {simuladoAprovado(simulado, progresso) ? ' · aprovado' : ''}
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
                    <button type="button" className="btn btn--amarelo" onClick={() => setConfirmar(simulado)}>
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
      ) : tentativas.length === 0 ? (
        <div className="vazio">
          <strong>Nenhum simulado entregue ainda.</strong>
          <span>Quando você entregar uma prova, a nota e a correção ficam guardadas aqui.</span>
          <Link to="/simulados" className="btn btn--sm">
            Ver simulados
          </Link>
        </div>
      ) : (
        <TabelaTentativas tentativas={tentativas} rotuloProva="Simulado" />
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
              São {confirmar.questoes.length} questões em {confirmar.tempo_min} minutos. O cronômetro começa agora e continua
              correndo se você sair da página.
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
