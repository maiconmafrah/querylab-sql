import { useSearchParams } from 'react-router-dom';
import { CartaoMissao } from '../componentes/CartaoMissao.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { NOMES_DIFICULDADE, nomeTema, temas, treinamentos } from '../conteudo/index.ts';
import { statusMissao, type StatusMissao } from '../conteudo/status.ts';
import { useProgresso } from '../estado/progresso.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { normalizarBusca } from '../lib/formato.ts';

const FILTROS_STATUS: { valor: StatusMissao | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos os status' },
  { valor: 'andamento', rotulo: 'Em andamento' },
  { valor: 'disponivel', rotulo: 'Disponíveis' },
  { valor: 'concluida', rotulo: 'Concluídos' },
  { valor: 'bloqueada', rotulo: 'Bloqueados' },
];

const TITULOS: Partial<Record<StatusMissao, string>> = {
  andamento: 'Em andamento',
  concluida: 'Concluídos',
};

export function Catalogo() {
  const progresso = useProgresso();
  const [parametros, setParametros] = useSearchParams();
  const status = parametros.get('status') ?? '';
  const tema = parametros.get('tema') ?? '';
  const dificuldade = parametros.get('dificuldade') ?? '';
  const busca = parametros.get('q') ?? '';
  const titulo = TITULOS[status as StatusMissao] ?? 'Treinamentos';
  useTitulo(titulo);

  const atualizar = (chave: string, valor: string) => {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    setParametros(novos, { replace: true });
  };

  const temasUsados = temas.filter((t) => treinamentos.some((treinamento) => treinamento.tema === t.id));
  const termo = normalizarBusca(busca);
  const filtrados = treinamentos.filter((t) => {
    if (status && statusMissao(t, progresso) !== status) return false;
    if (tema && t.tema !== tema) return false;
    if (dificuldade && t.dificuldade !== dificuldade) return false;
    if (!termo) return true;
    const texto = [t.titulo, t.resumo, nomeTema(t.tema), ...t.checkpoints.map((c) => c.pergunta)].join(' ');
    return normalizarBusca(texto).includes(termo);
  });
  const filtrando = Boolean(status || tema || dificuldade || busca);

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">{titulo}</h1>
          <p className="subtitulo-pagina">
            Incidentes de dados para resolver com SQL. Cada missão traz um chamado, um dataset e checkpoints que valem XP.
          </p>
        </div>
        <label className="busca">
          <span className="sr-only">Buscar treinamentos</span>
          <Icone nome="busca" espessura={2.25} />
          <input
            className="campo"
            type="search"
            value={busca}
            onChange={(evento) => atualizar('q', evento.target.value)}
            placeholder="Buscar por tema, tabela ou comando…"
          />
        </label>
      </div>

      <div className="filtros">
        <div className="chips" role="group" aria-label="Filtrar por tema">
          <button type="button" className="chip" aria-pressed={!tema} onClick={() => atualizar('tema', '')}>
            Todos os temas
          </button>
          {temasUsados.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chip"
              aria-pressed={tema === t.id}
              onClick={() => atualizar('tema', tema === t.id ? '' : t.id)}
            >
              {t.nome}
            </button>
          ))}
        </div>
        <div className="selects">
          <label>
            <span className="sr-only">Dificuldade</span>
            <select className="campo" value={dificuldade} onChange={(evento) => atualizar('dificuldade', evento.target.value)}>
              <option value="">Todas as dificuldades</option>
              {Object.entries(NOMES_DIFICULDADE).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select className="campo" value={status} onChange={(evento) => atualizar('status', evento.target.value)}>
              {FILTROS_STATUS.map((filtro) => (
                <option key={filtro.valor} value={filtro.valor}>
                  {filtro.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtrados.length > 0 ? (
        <div className="grade-cartoes">
          {filtrados.map((t) => (
            <CartaoMissao key={t.id} treinamento={t} progresso={progresso} />
          ))}
        </div>
      ) : (
        <div className="vazio">
          <strong>Nenhuma missão com esses filtros.</strong>
          <span>{status === 'concluida' ? 'Conclua uma missão para ela aparecer aqui.' : 'Tente outra combinação de filtros.'}</span>
          <button type="button" className="btn btn--sm" onClick={() => setParametros(new URLSearchParams(), { replace: true })}>
            Limpar filtros
          </button>
        </div>
      )}

      <p className="rodape-lista mono">
        {filtrando
          ? `mostrando ${filtrados.length} de ${treinamentos.length} missões`
          : `${treinamentos.length} missões no catálogo`}
      </p>
    </div>
  );
}
