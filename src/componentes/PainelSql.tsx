import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EstadoAmbiente, PainelSqlEstado } from '../hooks/useAmbiente.ts';
import { formatarNumero } from '../lib/formato.ts';
import { Carregando, TECLA_ATALHO } from './comum.tsx';
import { EditorSql, type EditorSqlHandle } from './EditorSql.tsx';
import { Icone } from './Icone.tsx';
import { TabelaResultado } from './TabelaResultado.tsx';

interface Props {
  estadoAmbiente: EstadoAmbiente;
  painel: PainelSqlEstado;
  consulta: string;
  aoMudarConsulta: (sql: string) => void;
  nomeArquivo?: string;
  alturaEditor?: number;
  alturaResultado?: number;
  /** Botões extras na barra do editor (ex.: validar). */
  acoes?: ReactNode;
}

function nomeSeguro(tabela: string): string {
  return /^[a-z_][a-z0-9_]*$/.test(tabela) ? tabela : `"${tabela.replaceAll('"', '""')}"`;
}

export function PainelSql({
  estadoAmbiente,
  painel,
  consulta,
  aoMudarConsulta,
  nomeArquivo = 'consulta.sql',
  alturaEditor = 240,
  alturaResultado = 380,
  acoes,
}: Props) {
  const editor = useRef<EditorSqlHandle>(null);
  const [aba, setAba] = useState<'resultado' | 'tabelas'>('resultado');
  const { execucao } = painel;
  const pronto = estadoAmbiente.fase === 'pronto';
  const rodando = execucao.fase === 'rodando';

  useEffect(() => {
    if (execucao.fase === 'ok' || execucao.fase === 'erro') setAba('resultado');
  }, [execucao]);

  const rodar = (selecao: string | null) => {
    if (!pronto || rodando) return;
    void painel.executar(selecao ?? consulta);
  };

  const espiar = (tabela: string) => {
    const sql = `SELECT *\nFROM ${nomeSeguro(tabela)}\nLIMIT 20;`;
    aoMudarConsulta(sql);
    void painel.executar(sql);
  };

  return (
    <section className="painel-sql" aria-label="Editor de SQL e resultado">
      <div className="cartao editor-cartao">
        <div className="editor-cartao__barra">
          <div className="editor-cartao__arquivo">
            <span className="aba-arquivo">
              <Icone nome="terminal" tamanho={14} />
              {nomeArquivo}
            </span>
            <StatusBanco estado={estadoAmbiente} />
          </div>
          <div className="editor-cartao__acoes">
            {acoes}
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => void painel.restaurar()}
              disabled={!pronto || rodando}
              title="Volta as tabelas ao estado original do dataset"
            >
              <Icone nome="restaurar" tamanho={15} />
              <span className="some-estreito">Restaurar dataset</span>
            </button>
            <button
              type="button"
              className="btn btn--sm btn--amarelo"
              onClick={() => rodar(editor.current?.selecao() ?? null)}
              disabled={!pronto || rodando}
            >
              {rodando ? <span className="girando" aria-hidden="true" /> : <Icone nome="play" tamanho={13} />}
              Rodar
              <kbd className="atalho">{TECLA_ATALHO} ↵</kbd>
            </button>
          </div>
        </div>
        <EditorSql
          ref={editor}
          valor={consulta}
          aoMudar={aoMudarConsulta}
          aoExecutar={rodar}
          esquema={painel.autocompletar}
          alturaMinima={alturaEditor}
        />
      </div>

      <div className="cartao resultado-cartao">
        <div className="resultado-cartao__cabecalho">
          <div className="abas" role="tablist" aria-label="Painel de resultado">
            <button type="button" role="tab" className="aba" aria-selected={aba === 'resultado'} onClick={() => setAba('resultado')}>
              Resultado
            </button>
            <button type="button" role="tab" className="aba" aria-selected={aba === 'tabelas'} onClick={() => setAba('tabelas')}>
              Tabelas{painel.esquema ? ` (${painel.esquema.length})` : ''}
            </button>
          </div>
          {aba === 'resultado' && execucao.fase === 'ok' && (
            <div className="lista-tags">
              <span className="tag tag--menta">
                {formatarNumero(execucao.resultado.linhas.length)} {execucao.resultado.linhas.length === 1 ? 'linha' : 'linhas'}
              </span>
              <span className="tag">{Math.max(1, Math.round(execucao.duracaoMs))} ms</span>
              {execucao.comandos > 1 && <span className="tag">{execucao.comandos} comandos</span>}
            </div>
          )}
        </div>
        <div className="resultado-cartao__corpo" role="tabpanel" aria-live="polite">
          {aba === 'tabelas' ? (
            <ListaTabelas painel={painel} pronto={pronto} aoEspiar={espiar} />
          ) : (
            <CorpoResultado estadoAmbiente={estadoAmbiente} painel={painel} alturaResultado={alturaResultado} />
          )}
        </div>
      </div>
    </section>
  );
}

function StatusBanco({ estado }: { estado: EstadoAmbiente }) {
  if (estado.fase === 'carregando') {
    return (
      <span className="status-banco">
        <span className="girando girando--pequeno" aria-hidden="true" />
        preparando banco
      </span>
    );
  }
  if (estado.fase === 'erro') {
    return <span className="status-banco status-banco--erro">banco com erro</span>;
  }
  return (
    <span className="status-banco">
      <span className="status-banco__ponto" aria-hidden="true" />
      DuckDB pronto
    </span>
  );
}

function CorpoResultado({
  estadoAmbiente,
  painel,
  alturaResultado,
}: {
  estadoAmbiente: EstadoAmbiente;
  painel: PainelSqlEstado;
  alturaResultado: number;
}) {
  if (estadoAmbiente.fase === 'carregando') {
    return <Carregando texto="Preparando o banco de dados no seu navegador. Na primeira vez pode levar alguns segundos." />;
  }
  if (estadoAmbiente.fase === 'erro') {
    return (
      <div className="aviso aviso--erro erro-sql" role="alert">
        <Icone nome="alerta" />
        <div>
          <strong>Não foi possível iniciar o banco de dados.</strong>
          <pre>{estadoAmbiente.mensagem}</pre>
        </div>
      </div>
    );
  }

  const { execucao } = painel;
  switch (execucao.fase) {
    case 'rodando':
      return <Carregando texto="Rodando…" />;
    case 'erro':
      return (
        <div className="aviso aviso--erro erro-sql" role="alert">
          <Icone nome="alerta" />
          <div>
            <strong>
              {execucao.titulo}
              {execucao.total > 1 ? ` (no comando ${execucao.comando} de ${execucao.total})` : ''}
            </strong>
            <pre>{execucao.mensagem}</pre>
          </div>
        </div>
      );
    case 'ok':
      return <TabelaResultado resultado={execucao.resultado} alturaMaxima={alturaResultado} />;
    default:
      return (
        <div className="estado-painel">
          {execucao.aviso ? (
            <div className="aviso aviso--ok">
              <Icone nome="check" />
              {execucao.aviso}
            </div>
          ) : (
            <p>
              Escreva uma consulta e clique em <strong>Rodar</strong> ou aperte{' '}
              <kbd className="atalho atalho--claro">{TECLA_ATALHO} ↵</kbd>. Com um trecho selecionado, só ele é executado.
            </p>
          )}
        </div>
      );
  }
}

function ListaTabelas({
  painel,
  pronto,
  aoEspiar,
}: {
  painel: PainelSqlEstado;
  pronto: boolean;
  aoEspiar: (tabela: string) => void;
}) {
  if (!pronto || painel.esquema === null) return <Carregando texto="Lendo as tabelas…" />;
  if (painel.esquema.length === 0) return <p className="estado-painel">Nenhuma tabela neste banco.</p>;
  return (
    <div className="lista-tabelas">
      {painel.esquema.map((tabela) => (
        <div key={tabela.nome} className="tabela-esquema">
          <div className="tabela-esquema__topo">
            <span className="tabela-esquema__nome">
              <Icone nome="tabela" tamanho={15} />
              {tabela.nome}
            </span>
            <span className="tag">{formatarNumero(tabela.linhas)} linhas</span>
          </div>
          <ul className="tabela-esquema__colunas">
            {tabela.colunas.map((coluna) => (
              <li key={coluna.nome}>
                {coluna.nome}
                <span>{coluna.tipo.toLowerCase()}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--sm" onClick={() => aoEspiar(tabela.nome)}>
            <Icone nome="olho" tamanho={15} />
            Espiar
          </button>
        </div>
      ))}
    </div>
  );
}
