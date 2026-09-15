import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CodigoSql } from '../componentes/CodigoSql.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { TabelaPeriodica } from '../componentes/TabelaPeriodica.tsx';
import { referencia } from '../conteudo/index.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { normalizarBusca } from '../lib/formato.ts';

export function Referencia() {
  useTitulo('Referência SQL');
  const localizacao = useLocation();
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!localizacao.hash) return;
    const alvo = document.getElementById(decodeURIComponent(localizacao.hash.slice(1)));
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (alvo.classList.contains('entrada-ref')) {
      alvo.classList.remove('entrada-ref--destaque');
      // Força o navegador a "esquecer" a animação anterior antes de reaplicar a classe.
      void alvo.offsetWidth;
      alvo.classList.add('entrada-ref--destaque');
    }
  }, [localizacao.hash]);

  const termo = normalizarBusca(busca);
  const secoes = referencia
    .map((secao) => ({
      ...secao,
      entradas: secao.entradas.filter(
        (entrada) => !termo || normalizarBusca(`${entrada.titulo} ${entrada.descricao} ${entrada.sintaxe} ${entrada.exemplo}`).includes(termo),
      ),
    }))
    .filter((secao) => secao.entradas.length > 0);

  return (
    <div className="pagina pagina--larga">
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">Referência SQL</h1>
          <p className="subtitulo-pagina">
            Os comandos que aparecem nas missões, com a sintaxe e um exemplo que roda no dataset da loja. Use “Testar” para abrir o
            exemplo no playground.
          </p>
        </div>
        <label className="busca">
          <span className="sr-only">Buscar na referência</span>
          <Icone nome="busca" espessura={2.25} />
          <input
            className="campo"
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar comando ou função…"
          />
        </label>
      </div>

      <TabelaPeriodica />

      <nav className="chips referencia__indice" aria-label="Seções da referência">
        {referencia.map((secao) => (
          <Link key={secao.id} to={`/referencia#${secao.id}`} className="chip">
            {secao.titulo}
          </Link>
        ))}
      </nav>

      {secoes.length === 0 && (
        <div className="vazio">
          <strong>Nada encontrado para “{busca}”.</strong>
          <span>Tente o nome do comando, como JOIN, GROUP BY ou COALESCE.</span>
        </div>
      )}

      {secoes.map((secao) => (
        <section key={secao.id} id={secao.id} className="referencia__secao" aria-labelledby={`titulo-${secao.id}`}>
          <h2 className="titulo-secao" id={`titulo-${secao.id}`}>
            {secao.titulo}
          </h2>
          <div className="referencia__grade">
            {secao.entradas.map((entrada) => (
              <article key={entrada.id} id={`${secao.id}-${entrada.id}`} className="cartao entrada-ref">
                <h3>{entrada.titulo}</h3>
                <p>{entrada.descricao}</p>
                <span className="rotulo">Sintaxe</span>
                <CodigoSql codigo={entrada.sintaxe} className="codigo codigo--claro" />
                <span className="rotulo">Exemplo</span>
                <CodigoSql codigo={entrada.exemplo} />
                {entrada.dica && (
                  <div className="aviso aviso--info">
                    <Icone nome="lampada" tamanho={17} />
                    <span>{entrada.dica}</span>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn--sm btn--amarelo"
                  onClick={() => navegar('/playground', { state: { sql: entrada.exemplo, dataset: 'loja.sql' } })}
                >
                  <Icone nome="play" tamanho={13} />
                  Testar no playground
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
