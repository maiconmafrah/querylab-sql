import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { CampoApelido } from '../componentes/Apelido.tsx';
import { BarraProgresso, Carregando, PedirLogin } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { Modal } from '../componentes/Modal.tsx';
import { AtividadeHeatmap, CartaoNivelGrande, Conquistas, Estatistica } from '../componentes/PainelProgresso.tsx';
import { nomeTema, simulados, simuladosDaTrilha, treinamentos } from '../conteudo/index.ts';
import { simuladoAprovado, tentativasSimulado, xpGanhoMissao } from '../conteudo/status.ts';
import { useAutenticacao } from '../estado/autenticacao.ts';
import {
  apagarProgresso,
  definirLembreteSequencia,
  definirModoLivre,
  exportarProgresso,
  importarProgresso,
  useProgresso,
} from '../estado/progresso.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { formatarData } from '../lib/formato.ts';
import { firebaseDisponivel } from '../lib/firebase.ts';
import { calcularSequencia, dataLocal, infoNivel, melhorSequencia } from '../lib/niveis.ts';
import { contarAtividadesPorDia } from '../lib/atividade.ts';

// O e-mail só sai depois que a Cloud Function de functions/ for publicada (ver README); até lá o botão fica escondido.
const LEMBRETE_POR_EMAIL_PUBLICADO = false;

export function Progresso() {
  useTitulo('Progresso');
  const { carregando } = useAutenticacao();

  if (firebaseDisponivel && carregando) return <Carregando texto="Carregando…" />;

  return <ProgressoConteudo />;
}

function ProgressoConteudo() {
  const progresso = useProgresso();
  const { usuario } = useAutenticacao();
  const nivel = infoNivel(progresso.xp);
  const hoje = dataLocal();
  const sequencia = calcularSequencia(progresso.dias, hoje);
  const melhor = melhorSequencia(progresso.dias);
  const contagemAtividade = useMemo(() => contarAtividadesPorDia(progresso), [progresso]);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const seletorArquivo = useRef<HTMLInputElement>(null);

  const concluidas = treinamentos
    .filter((t) => progresso.missoes[t.id]?.concluidaEm)
    .sort((a, b) => progresso.missoes[b.id]!.concluidaEm!.localeCompare(progresso.missoes[a.id]!.concluidaEm!));
  const totalTentativas = simuladosDaTrilha.reduce((soma, s) => soma + tentativasSimulado(s.id, progresso).length, 0);
  const aprovados = simuladosDaTrilha.filter((s) => simuladoAprovado(s, progresso)).length;

  // Desempenho por tema na tentativa mais recente de cada simulado.
  const porTema = new Map<string, { acertos: number; total: number }>();
  for (const simulado of simulados) {
    const ultima = tentativasSimulado(simulado.id, progresso).at(-1);
    if (!ultima) continue;
    for (const questao of simulado.questoes) {
      const atual = porTema.get(questao.tema) ?? { acertos: 0, total: 0 };
      atual.total++;
      if (ultima.corretas[questao.id]) atual.acertos++;
      porTema.set(questao.tema, atual);
    }
  }
  const temas = [...porTema].sort((a, b) => a[1].acertos / a[1].total - b[1].acertos / b[1].total);

  function exportar() {
    const arquivo = new Blob([exportarProgresso()], { type: 'application/json' });
    const endereco = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = endereco;
    link.download = `querylab-progresso-${hoje}.json`;
    link.click();
    URL.revokeObjectURL(endereco);
    setAviso({ tipo: 'ok', texto: 'Backup gerado. Guarde o arquivo para importar em outro navegador.' });
  }

  async function importar(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;
    const ok = importarProgresso(await arquivo.text());
    setAviso(ok ? { tipo: 'ok', texto: 'Progresso importado com sucesso.' } : { tipo: 'erro', texto: 'Esse arquivo não parece um backup do querylab.' });
  }

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">Seu progresso</h1>
          <p className="subtitulo-pagina">Tudo fica salvo neste navegador. Se for trocar de computador, exporte um backup.</p>
        </div>
      </div>

      {firebaseDisponivel && !usuario && (
        <PedirLogin
          titulo="Sincronize seu progresso"
          texto="Esse progresso já está salvo neste navegador. Entre com Google pra levar ele pra outros aparelhos e aparecer no ranking."
        />
      )}

      <div className="progresso__grade">
        <CartaoNivelGrande nivel={nivel} xp={progresso.xp} />
        <Estatistica icone="chama" valor={sequencia} rotulo={sequencia === 1 ? 'dia seguido estudando' : 'dias seguidos estudando'} />
        <Estatistica icone="bandeira" valor={`${concluidas.length}/${treinamentos.length}`} rotulo="missões concluídas" />
        <Estatistica
          icone="prancheta"
          valor={`${aprovados}/${simuladosDaTrilha.length}`}
          rotulo={`simulados aprovados · ${totalTentativas} ${totalTentativas === 1 ? 'tentativa' : 'tentativas'}`}
        />
        <Estatistica icone="grafico" valor={progresso.dias.length} rotulo={progresso.dias.length === 1 ? 'dia de estudo no total' : 'dias de estudo no total'} />
      </div>

      <Conquistas
        atual={sequencia}
        melhor={melhor}
        secretaDesbloqueada={treinamentos.length > 0 && concluidas.length === treinamentos.length}
      />
      <AtividadeHeatmap contagem={contagemAtividade} />

      <div className="progresso__colunas">
        <section>
          <div className="cabecalho-secao">
            <h2 className="titulo-secao">Desempenho por tema</h2>
            <span className="mono">último simulado</span>
          </div>
          {temas.length === 0 ? (
            <div className="vazio">
              <strong>Ainda sem dados.</strong>
              <span>Faça um simulado para ver seus pontos fortes e o que revisar.</span>
              <Link to="/simulados" className="btn btn--sm">
                Ver simulados
              </Link>
            </div>
          ) : (
            <div className="cartao temas-resultado">
              {temas.map(([tema, valor]) => (
                <div key={tema} className="tema-linha">
                  <span className="tema-linha__nome">{nomeTema(tema)}</span>
                  <BarraProgresso
                    valor={valor.acertos / valor.total}
                    cor={valor.acertos === valor.total ? 'lilas' : 'amarelo'}
                    rotulo={`Acertos em ${nomeTema(tema)}`}
                  />
                  <span className="mono tema-linha__valor">
                    {Math.round((valor.acertos / valor.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="cabecalho-secao">
            <h2 className="titulo-secao">Missões concluídas</h2>
            <Link to="/treinamentos?status=concluida" className="link-forte">
              ver no catálogo
            </Link>
          </div>
          {concluidas.length === 0 ? (
            <div className="vazio">
              <strong>Nenhuma missão concluída ainda.</strong>
              <span>Cada missão tem checkpoints; feche todos para ela aparecer aqui.</span>
              <Link to="/trilhas" className="btn btn--sm">
                Escolher uma trilha
              </Link>
            </div>
          ) : (
            <div className="cartao">
              <ul className="lista-concluidas">
                {concluidas.map((t) => (
                  <li key={t.id}>
                    <Link to={`/treinamentos/${t.id}`}>{t.titulo}</Link>
                    <span className="mono">
                      {formatarData(progresso.missoes[t.id]!.concluidaEm!)} · {xpGanhoMissao(t.id, progresso)} XP
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="cartao configuracoes" aria-labelledby="titulo-configuracoes">
        <h2 className="titulo-secao" id="titulo-configuracoes">
          Configurações
        </h2>

        {usuario && (
          <div className="configuracoes__linha">
            <div className="configuracoes__texto">
              <strong>Apelido do ranking</strong>
              <span>
                {progresso.apelido
                  ? `Você aparece no ranking como "${progresso.apelido}".`
                  : 'Defina um apelido pra aparecer no ranking com seu XP.'}
              </span>
            </div>
            <CampoApelido atual={progresso.apelido} />
          </div>
        )}

        {usuario && LEMBRETE_POR_EMAIL_PUBLICADO && (
          <label className="interruptor">
            <input
              type="checkbox"
              checked={progresso.lembreteSequencia !== false}
              onChange={(evento) => definirLembreteSequencia(evento.target.checked)}
            />
            <span className="interruptor__trilho" aria-hidden="true">
              <span />
            </span>
            <span className="configuracoes__texto">
              <strong>Lembrete por e-mail</strong>
              <span>Avisa no seu e-mail do Google quando sua sequência de dias estiver prestes a quebrar.</span>
            </span>
          </label>
        )}

        <label className="interruptor">
          <input type="checkbox" checked={progresso.modoLivre} onChange={(evento) => definirModoLivre(evento.target.checked)} />
          <span className="interruptor__trilho" aria-hidden="true">
            <span />
          </span>
          <span className="configuracoes__texto">
            <strong>Modo livre</strong>
            <span>Libera todas as missões, sem precisar seguir a ordem das trilhas.</span>
          </span>
        </label>

        <div className="configuracoes__linha">
          <div className="configuracoes__texto">
            <strong>Backup do progresso</strong>
            <span>Leve seu XP, suas notas e as missões concluídas para outro navegador.</span>
          </div>
          <div className="configuracoes__botoes">
            <button type="button" className="btn btn--sm" onClick={exportar}>
              <Icone nome="download" tamanho={15} />
              Exportar
            </button>
            <button type="button" className="btn btn--sm" onClick={() => seletorArquivo.current?.click()}>
              <Icone nome="upload" tamanho={15} />
              Importar
            </button>
            <input ref={seletorArquivo} type="file" accept="application/json,.json" hidden onChange={(evento) => void importar(evento)} />
          </div>
        </div>

        <div className="configuracoes__linha">
          <div className="configuracoes__texto">
            <strong>Apagar progresso</strong>
            <span>Zera XP, missões, simulados e as consultas salvas neste navegador.</span>
          </div>
          <button type="button" className="btn btn--sm btn--perigo" onClick={() => setConfirmarApagar(true)}>
            <Icone nome="lixeira" tamanho={15} />
            Apagar tudo
          </button>
        </div>

        {aviso && (
          <div className={`aviso aviso--${aviso.tipo}`} role="status">
            <Icone nome={aviso.tipo === 'ok' ? 'check' : 'alerta'} />
            <span>{aviso.texto}</span>
          </div>
        )}
      </section>

      <Modal
        aberto={confirmarApagar}
        aoFechar={() => setConfirmarApagar(false)}
        titulo="Apagar todo o progresso?"
        acoes={
          <>
            <button type="button" className="btn" data-foco-inicial onClick={() => setConfirmarApagar(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--perigo"
              onClick={() => {
                apagarProgresso();
                setConfirmarApagar(false);
                setAviso({ tipo: 'ok', texto: 'Progresso apagado. Começando do zero.' });
              }}
            >
              <Icone nome="lixeira" tamanho={16} />
              Apagar
            </button>
          </>
        }
      >
        <p>Isso não tem volta. Se quiser guardar uma cópia, exporte um backup antes.</p>
      </Modal>
    </div>
  );
}
