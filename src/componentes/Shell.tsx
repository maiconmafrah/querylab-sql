import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { buscarSimulado, provasDeEntrevista, referencia, simuladosDaTrilha, treinamentos, trilhas } from '../conteudo/index.ts';
import { ehNovo, resumoTrilha, statusMissao } from '../conteudo/status.ts';
import { useProgresso, type Progresso } from '../estado/progresso.ts';
import { calcularSequencia, dataLocal, infoNivel } from '../lib/niveis.ts';
import { formatarNumero } from '../lib/formato.ts';
import { useTema } from '../hooks/useTema.ts';
import { consumirLoginRecente, entrarComGoogle, sair, useAutenticacao } from '../estado/autenticacao.ts';
import { useSincronizarProgresso } from '../estado/sincronizacao.ts';
import { firebaseDisponivel } from '../lib/firebase.ts';
import { ModalApelido } from './Apelido.tsx';
import { BarraProgresso } from './comum.tsx';
import { Icone, IconeGoogle, type NomeIcone } from './Icone.tsx';
import type { Simulado } from '../tipos.ts';

const CHAVE_MENU = 'querylab:menu-aberto';
const GRUPOS_ABERTOS_PADRAO = ['treinamentos', 'trilhas'];

interface ItemFilho {
  rotulo: string;
  para: string;
  ativo: boolean;
  contador?: string | number;
}

interface ItemMenu {
  id: string;
  rotulo: string;
  icone: NomeIcone;
  para?: string;
  ativo: boolean;
  etiqueta?: string;
  filhos?: ItemFilho[];
}

function lerGruposAbertos(): string[] {
  try {
    const salvo = localStorage.getItem(CHAVE_MENU);
    return salvo ? (JSON.parse(salvo) as string[]) : GRUPOS_ABERTOS_PADRAO;
  } catch {
    return GRUPOS_ABERTOS_PADRAO;
  }
}

function montarMenu(caminho: string, busca: URLSearchParams, hash: string, progresso: Progresso): ItemMenu[] {
  const status = busca.get('status');
  const contarStatus = (alvo: string) => treinamentos.filter((t) => statusMissao(t, progresso) === alvo).length;
  const novoSemTentativa = (s: Simulado) => ehNovo(s.publicado_em) && !progresso.simulados[s.id]?.tentativas.length;
  const simuladoNovo = simuladosDaTrilha.some(novoSemTentativa);
  const entrevistaNova = provasDeEntrevista.some(novoSemTentativa);
  // O resultado de uma prova de entrevista mora em /simulados/:id/resultado, mas pertence à aba de entrevista.
  const idNaRota = /^\/simulados\/([^/]+)/.exec(caminho)?.[1];
  const naEntrevista = caminho === '/entrevista' || (idNaRota !== undefined && buscarSimulado(idNaRota)?.categoria === 'entrevista');

  return [
    { id: 'inicio', rotulo: 'Início', icone: 'inicio', para: '/', ativo: caminho === '/' },
    {
      id: 'treinamentos',
      rotulo: 'Treinamentos',
      icone: 'bandeira',
      ativo: caminho.startsWith('/treinamentos'),
      filhos: [
        {
          rotulo: 'Em andamento',
          para: '/treinamentos?status=andamento',
          ativo: caminho === '/treinamentos' && status === 'andamento',
          contador: contarStatus('andamento'),
        },
        {
          rotulo: 'Todos',
          para: '/treinamentos',
          ativo: caminho === '/treinamentos' && !status,
          contador: treinamentos.length,
        },
        {
          rotulo: 'Concluídos',
          para: '/treinamentos?status=concluida',
          ativo: caminho === '/treinamentos' && status === 'concluida',
          contador: contarStatus('concluida'),
        },
      ],
    },
    {
      id: 'simulados',
      rotulo: 'Simulados',
      icone: 'prancheta',
      ativo: caminho.startsWith('/simulados') && !naEntrevista,
      etiqueta: simuladoNovo ? 'novo' : undefined,
      filhos: [
        { rotulo: 'Disponíveis', para: '/simulados', ativo: caminho === '/simulados' && busca.get('aba') !== 'historico' },
        { rotulo: 'Histórico', para: '/simulados?aba=historico', ativo: caminho === '/simulados' && busca.get('aba') === 'historico' },
      ],
    },
    {
      id: 'entrevista',
      rotulo: 'Teste de Entrevista',
      icone: 'maleta',
      para: '/entrevista',
      ativo: naEntrevista,
      etiqueta: entrevistaNova ? 'novo' : undefined,
    },
    {
      id: 'trilhas',
      rotulo: 'Trilhas',
      icone: 'rota',
      ativo: caminho.startsWith('/trilhas'),
      filhos: [
        { rotulo: 'Visão geral', para: '/trilhas', ativo: caminho === '/trilhas' },
        ...trilhas.map((trilha) => {
          const resumo = resumoTrilha(trilha, progresso);
          return {
            rotulo: trilha.titulo,
            para: `/trilhas/${trilha.id}`,
            ativo: caminho === `/trilhas/${trilha.id}`,
            contador: `${resumo.concluidas}/${resumo.total}`,
          };
        }),
      ],
    },
    { id: 'playground', rotulo: 'Playground SQL', icone: 'terminal', para: '/playground', ativo: caminho === '/playground' },
    {
      id: 'referencia',
      rotulo: 'Referência SQL',
      icone: 'livro',
      ativo: caminho === '/referencia',
      filhos: referencia.map((secao) => ({
        rotulo: secao.titulo,
        para: `/referencia#${secao.id}`,
        ativo: caminho === '/referencia' && hash === `#${secao.id}`,
      })),
    },
    { id: 'ranking', rotulo: 'Ranking', icone: 'trofeu', para: '/ranking', ativo: caminho === '/ranking' },
    { id: 'progresso', rotulo: 'Progresso', icone: 'grafico', para: '/progresso', ativo: caminho === '/progresso' },
  ];
}

function BotaoTema() {
  const { tema, alternar } = useTema();
  const escuro = tema === 'escuro';
  return (
    <button
      type="button"
      className="btn btn--sm btn--icone botao-tema"
      aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      onClick={alternar}
    >
      <Icone nome={escuro ? 'sol' : 'lua'} tamanho={17} />
    </button>
  );
}

function ContaWidget() {
  const { carregando, usuario, erro: erroRedirecionamento } = useAutenticacao();
  const status = useSincronizarProgresso();
  const [erro, setErro] = useState<string | null>(null);

  if (!firebaseDisponivel || carregando) return null;

  if (!usuario) {
    const mensagemErro = erro ?? (erroRedirecionamento ? `Não deu para entrar (${erroRedirecionamento}).` : null);
    return (
      <div className="conta-login">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setErro(null);
            entrarComGoogle().catch((erro: unknown) => {
              const codigo = (erro as { code?: string } | undefined)?.code;
              if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') return;
              console.error('Falha no login com Google:', erro);
              setErro(codigo ? `Não deu para entrar (${codigo}).` : 'Não deu para entrar. Tente de novo.');
            });
          }}
        >
          <IconeGoogle />
          Entrar com Google
        </button>
        {mensagemErro && <p className="conta-login__erro">{mensagemErro}</p>}
      </div>
    );
  }

  return (
    <div className="conta">
      {usuario.photoURL ? (
        <img src={usuario.photoURL} alt="" className="conta__foto" referrerPolicy="no-referrer" />
      ) : (
        <span className="avatar conta__foto">{(usuario.displayName ?? usuario.email ?? '?').slice(0, 1).toUpperCase()}</span>
      )}
      <span className="conta__info">
        <span className="conta__nome">{usuario.displayName ?? usuario.email}</span>
        <span className="conta__status">
          {status === 'sincronizando' ? 'sincronizando…' : status === 'erro' ? 'erro ao sincronizar' : 'progresso salvo na nuvem'}
        </span>
      </span>
      <button type="button" className="btn btn--sm btn--icone" aria-label="Sair da conta" title="Sair" onClick={() => void sair()}>
        <Icone nome="x" tamanho={15} />
      </button>
    </div>
  );
}

function Marca() {
  return (
    <Link to="/" className="marca" aria-label="querylab, página inicial">
      <span className="marca__icone">
        <Icone nome="banco" tamanho={18} espessura={2.25} />
      </span>
      <span className="marca__nome">querylab</span>
    </Link>
  );
}

function CartaoNivel({ progresso }: { progresso: Progresso }) {
  const nivel = infoNivel(progresso.xp);
  const sequencia = calcularSequencia(progresso.dias, dataLocal());
  return (
    <Link to="/progresso" className="cartao-nivel">
      <span className="cartao-nivel__topo">
        <span className="cartao-nivel__nivel">Nível {nivel.nivel}</span>
        <span className="cartao-nivel__sequencia" title="Dias seguidos estudando">
          <Icone nome="chama" tamanho={15} />
          {sequencia} {sequencia === 1 ? 'dia' : 'dias'}
        </span>
      </span>
      <span className="cartao-nivel__titulo">{nivel.titulo}</span>
      <BarraProgresso valor={nivel.progresso} rotulo="Progresso até o próximo nível" />
      <span className="cartao-nivel__xp">
        {formatarNumero(progresso.xp)} / {formatarNumero(nivel.xpProximo)} XP
      </span>
    </Link>
  );
}

export function Shell() {
  const localizacao = useLocation();
  const progresso = useProgresso();
  const { usuario } = useAutenticacao();
  const [abertos, setAbertos] = useState<string[]>(lerGruposAbertos);
  const [menuMovelAberto, setMenuMovelAberto] = useState(false);
  const [pedirApelido, setPedirApelido] = useState(false);
  const usuarioAnterior = useRef(usuario);

  useEffect(() => {
    if (usuario && !usuarioAnterior.current && consumirLoginRecente() && !progresso.apelido) {
      setPedirApelido(true);
    }
    usuarioAnterior.current = usuario;
  }, [usuario, progresso.apelido]);

  const menu = montarMenu(localizacao.pathname, new URLSearchParams(localizacao.search), localizacao.hash, progresso);
  const grupoAtivo = menu.find((item) => item.filhos && item.ativo)?.id;

  useEffect(() => {
    setMenuMovelAberto(false);
    // Com âncora (#secao), quem rola é a própria página.
    if (!window.location.hash.includes('#', 1)) window.scrollTo(0, 0);
  }, [localizacao.pathname]);

  useEffect(() => {
    if (grupoAtivo && !abertos.includes(grupoAtivo)) setAbertos((atual) => [...atual, grupoAtivo]);
  }, [grupoAtivo, abertos]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_MENU, JSON.stringify(abertos));
    } catch {
      // ignora
    }
  }, [abertos]);

  const alternarGrupo = (id: string) =>
    setAbertos((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));

  return (
    <div className="app">
      <button type="button" className="pular-conteudo btn btn--amarelo" onClick={() => document.getElementById('conteudo')?.focus()}>
        Pular para o conteúdo
      </button>

      <BotaoTema />

      <header className="barra-movel">
        <Marca />
        <button
          type="button"
          className="btn btn--sm btn--icone"
          aria-label={menuMovelAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuMovelAberto}
          aria-controls="menu-lateral"
          onClick={() => setMenuMovelAberto((aberto) => !aberto)}
        >
          <Icone nome={menuMovelAberto ? 'x' : 'menu'} />
        </button>
      </header>

      {menuMovelAberto && <button type="button" className="fundo-menu" aria-label="Fechar menu" onClick={() => setMenuMovelAberto(false)} />}

      <aside id="menu-lateral" className={`menu-lateral${menuMovelAberto ? ' menu-lateral--aberto' : ''}`}>
        <div className="menu-lateral__marca">
          <Marca />
        </div>

        <nav className="nav" aria-label="Menu principal">
          {menu.map((item) => {
            if (!item.filhos) {
              return (
                <Link
                  key={item.id}
                  to={item.para!}
                  className={`nav__item${item.ativo ? ' nav__item--ativo' : ''}`}
                  aria-current={item.ativo ? 'page' : undefined}
                >
                  <Icone nome={item.icone} tamanho={19} />
                  <span className="nav__rotulo">{item.rotulo}</span>
                </Link>
              );
            }
            const aberto = abertos.includes(item.id);
            return (
              <div key={item.id} className="nav__grupo">
                <button
                  type="button"
                  className={`nav__item${item.ativo ? ' nav__item--grupo-ativo' : ''}`}
                  aria-expanded={aberto}
                  aria-controls={`submenu-${item.id}`}
                  onClick={() => alternarGrupo(item.id)}
                >
                  <Icone nome={item.icone} tamanho={19} />
                  <span className="nav__rotulo">{item.rotulo}</span>
                  {item.etiqueta && <span className="tag tag--lilas nav__etiqueta">{item.etiqueta}</span>}
                  <Icone nome="chevron-direita" tamanho={15} espessura={2.5} className="nav__seta" />
                </button>
                {aberto && (
                  <ul className="nav__sub" id={`submenu-${item.id}`}>
                    {item.filhos.map((filho) => (
                      <li key={filho.para}>
                        <Link
                          to={filho.para}
                          className={`nav__subitem${filho.ativo ? ' nav__subitem--ativo' : ''}`}
                          aria-current={filho.ativo ? 'page' : undefined}
                        >
                          <span>{filho.rotulo}</span>
                          {filho.contador !== undefined && <span className="nav__contador">{filho.contador}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <ContaWidget />
        <CartaoNivel progresso={progresso} />
      </aside>

      <main id="conteudo" className="conteudo" tabIndex={-1}>
        <Outlet />
      </main>

      <ModalApelido aberto={pedirApelido} aoFechar={() => setPedirApelido(false)} />
    </div>
  );
}
