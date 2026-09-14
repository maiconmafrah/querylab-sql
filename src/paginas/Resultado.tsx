import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CodigoSql } from '../componentes/CodigoSql.tsx';
import { BarraProgresso } from '../componentes/comum.tsx';
import { Icone } from '../componentes/Icone.tsx';
import { buscarSimulado, nomeTema } from '../conteudo/index.ts';
import { useProgresso } from '../estado/progresso.ts';
import { useTitulo } from '../hooks/useTitulo.ts';
import { formatarDataHora, formatarDuracao } from '../lib/formato.ts';
import { NaoEncontrado } from './NaoEncontrado.tsx';

export function Resultado() {
  const { id = '', tentativa: idTentativa = '' } = useParams();
  const progresso = useProgresso();
  const simulado = buscarSimulado(id);
  const tentativa = progresso.simulados[id]?.tentativas.find((t) => t.id === idTentativa);
  useTitulo(simulado ? `Resultado · ${simulado.titulo}` : 'Resultado');
  const [soErros, setSoErros] = useState(false);

  if (!simulado || !tentativa) return <NaoEncontrado />;

  const aprovado = tentativa.nota >= simulado.nota_minima;
  const porTema = new Map<string, { acertos: number; total: number }>();
  for (const questao of simulado.questoes) {
    const atual = porTema.get(questao.tema) ?? { acertos: 0, total: 0 };
    atual.total++;
    if (tentativa.corretas[questao.id]) atual.acertos++;
    porTema.set(questao.tema, atual);
  }
  const questoes = simulado.questoes
    .map((questao, indice) => ({ questao, indice }))
    .filter(({ questao }) => !soErros || !tentativa.corretas[questao.id]);

  return (
    <div className="pagina">
      <Link to="/simulados?aba=historico" className="voltar link-forte">
        <Icone nome="seta-esquerda" tamanho={16} espessura={2.5} />
        Histórico de simulados
      </Link>

      <section className={`cartao cartao--destaque placar${aprovado ? ' cartao--lilas' : ''}`}>
        <div className={`placar__nota${aprovado ? '' : ' placar__nota--abaixo'}`}>
          <span className="placar__numero">
            {tentativa.nota}
            <small>%</small>
          </span>
          <span className="mono">nota</span>
        </div>
        <div className="placar__resumo">
          <div className="lista-tags">
            <span className={`tag ${aprovado ? 'tag--menta' : 'tag--coral'}`}>
              <Icone nome={aprovado ? 'check' : 'x'} tamanho={12} espessura={3} />
              {aprovado ? 'Aprovado' : 'Abaixo da nota mínima'}
            </span>
            <span className="tag tag--amarelo">+{tentativa.xp} XP</span>
          </div>
          <h1 className="placar__titulo">{simulado.titulo}</h1>
          <p className="placar__detalhes">
            {tentativa.acertos} de {tentativa.total} questões certas · nota mínima {simulado.nota_minima}% ·{' '}
            {formatarDuracao(tentativa.duracaoS)} · entregue em {formatarDataHora(tentativa.entregueEm)}
          </p>
          {tentativa.xp === 0 && tentativa.acertos > 0 && (
            <p className="placar__nota-xp">O XP só conta acertos acima da sua melhor tentativa anterior.</p>
          )}
        </div>
        <div className="placar__acoes">
          <Link to={`/simulados?iniciar=${simulado.id}`} className="btn btn--amarelo">
            <Icone nome="restaurar" />
            Refazer simulado
          </Link>
          <Link to="/simulados" className="btn">
            Outros simulados
          </Link>
        </div>
      </section>

      <section className="resultado__secao">
        <h2 className="titulo-secao">Desempenho por tema</h2>
        <div className="cartao temas-resultado">
          {[...porTema].map(([tema, valor]) => (
            <div key={tema} className="tema-linha">
              <span className="tema-linha__nome">{nomeTema(tema)}</span>
              <BarraProgresso
                valor={valor.acertos / valor.total}
                cor={valor.acertos === valor.total ? 'lilas' : 'amarelo'}
                rotulo={`Acertos em ${nomeTema(tema)}`}
              />
              <span className="mono tema-linha__valor">
                {valor.acertos}/{valor.total}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="resultado__secao">
        <div className="cabecalho-secao">
          <h2 className="titulo-secao">Gabarito comentado</h2>
          <button type="button" className="chip" aria-pressed={soErros} onClick={() => setSoErros((valor) => !valor)}>
            Mostrar só o que errei
          </button>
        </div>
        <div className="gabarito">
          {questoes.length === 0 && (
            <div className="vazio">
              <strong>Nenhum erro nesta tentativa.</strong>
              <span>Você acertou todas as questões.</span>
            </div>
          )}
          {questoes.map(({ questao, indice }) => {
            const certa = tentativa.corretas[questao.id];
            const resposta = tentativa.respostas[questao.id];
            const emBranco = resposta === undefined || resposta === null || (typeof resposta === 'string' && resposta.trim() === '');
            return (
              <article key={questao.id} className="cartao questao-corrigida">
                <div className="linha-entre">
                  <div className="lista-tags">
                    <span className="tag tag--escuro">QUESTÃO {indice + 1}</span>
                    <span className="tag">{nomeTema(questao.tema)}</span>
                  </div>
                  <span className={`tag ${certa ? 'tag--menta' : 'tag--coral'}`}>
                    <Icone nome={certa ? 'check' : 'x'} tamanho={12} espessura={3} />
                    {certa ? 'Acertou' : emBranco ? 'Em branco' : 'Errou'}
                  </span>
                </div>
                <h3 className="questao-corrigida__enunciado">{questao.enunciado}</h3>
                {questao.codigo && <CodigoSql codigo={questao.codigo} />}

                {questao.tipo === 'multipla' ? (
                  <ul className="alternativas-corrigidas">
                    {questao.alternativas.map((alternativa, j) => {
                      const correta = j === questao.correta;
                      const escolhida = j === resposta;
                      return (
                        <li key={j} className={correta ? 'correta' : escolhida ? 'errada' : undefined}>
                          <span className="alternativa__letra">{String.fromCharCode(65 + j)}</span>
                          <div className="alternativas-corrigidas__texto">
                            {questao.formato_alternativas === 'codigo' ? (
                              <CodigoSql codigo={alternativa} className="alternativa__codigo" />
                            ) : (
                              <span>{alternativa}</span>
                            )}
                          </div>
                          {correta && <span className="tag">correta</span>}
                          {escolhida && <span className="tag tag--escuro">sua resposta</span>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="respostas-sql">
                    <div>
                      <span className="rotulo">Sua consulta</span>
                      {emBranco ? <p className="respostas-sql__vazio mono">em branco</p> : <CodigoSql codigo={String(resposta)} />}
                    </div>
                    <div>
                      <span className="rotulo">Consulta de referência</span>
                      <CodigoSql codigo={questao.gabarito_sql} />
                    </div>
                  </div>
                )}

                <div className="aviso aviso--info">
                  <Icone nome="lampada" tamanho={17} />
                  <span>{questao.explicacao}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
