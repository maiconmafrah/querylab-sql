// Cartões de nível, estatística, conquistas e mapa de atividade — usados tanto na página de
// Progresso (dados do próprio navegador) quanto no Perfil público (dados sincronizados do ranking).
import { useMemo } from 'react';
import { BarraProgresso } from './comum.tsx';
import { Icone, type NomeIcone } from './Icone.tsx';
import { formatarData, formatarNumero } from '../lib/formato.ts';
import { gradeAtividade, totalPulsos } from '../lib/atividade.ts';
import { CONQUISTAS_SEQUENCIA, dataLocal, TITULOS_NIVEL, type InfoNivel } from '../lib/niveis.ts';

export function CartaoNivelGrande({ nivel, xp }: { nivel: InfoNivel; xp: number }) {
  return (
    <article className="cartao cartao--lilas cartao--destaque nivel-grande">
      <span className="rotulo">Nível atual</span>
      <div className="nivel-grande__linha">
        <span className="nivel-grande__numero">{nivel.nivel}</span>
        <div>
          <strong className="nivel-grande__titulo">{nivel.titulo}</strong>
          <span className="mono">
            {formatarNumero(xp)} XP · faltam {formatarNumero(nivel.xpProximo - xp)} para o nível {nivel.nivel + 1}
          </span>
        </div>
      </div>
      <BarraProgresso valor={nivel.progresso} rotulo="Progresso até o próximo nível" />
      <span className="mono">próximo título: {TITULOS_NIVEL[Math.min(nivel.nivel, TITULOS_NIVEL.length - 1)]}</span>
    </article>
  );
}

export function Estatistica({ icone, valor, rotulo }: { icone: NomeIcone; valor: string | number; rotulo: string }) {
  return (
    <article className="cartao estatistica">
      <span className="avatar avatar--quadrado" aria-hidden="true">
        <Icone nome={icone} tamanho={17} />
      </span>
      <strong className="estatistica__valor">{valor}</strong>
      <span className="estatistica__rotulo">{rotulo}</span>
    </article>
  );
}

export function Conquistas({ atual, melhor, secretaDesbloqueada }: { atual: number; melhor: number; secretaDesbloqueada: boolean }) {
  const proxima = CONQUISTAS_SEQUENCIA.find((c) => melhor < c.dias);
  const desbloqueadas = CONQUISTAS_SEQUENCIA.filter((c) => melhor >= c.dias).length + (secretaDesbloqueada ? 1 : 0);

  return (
    <section className="secao-conquistas">
      <div className="cabecalho-secao">
        <h2 className="titulo-secao">Conquistas</h2>
        <span className="mono">
          {desbloqueadas} de {CONQUISTAS_SEQUENCIA.length + 1}
          {proxima && ` · faltam ${Math.max(0, proxima.dias - atual)} dias para ${proxima.nome}`}
        </span>
      </div>
      <div className="conquistas__grade">
        {CONQUISTAS_SEQUENCIA.map((c) => {
          const desbloqueada = melhor >= c.dias;
          const ehProxima = !desbloqueada && c.id === proxima?.id;
          return (
            <article
              key={c.id}
              className={`conquista${desbloqueada ? ' conquista--desbloqueada' : ''}${ehProxima ? ' conquista--atual' : ''}`}
            >
              <span className={`circulo${desbloqueada ? ' circulo--lilas' : ' circulo--bloqueado'}`}>{c.dias}</span>
              <span className="conquista__nome">{c.nome}</span>
              <span className="conquista__legenda mono">
                {c.dias === 1 ? 'primeiro dia' : `${c.dias} dias`}
                {ehProxima && ` · faltam ${Math.max(0, c.dias - atual)}`}
              </span>
            </article>
          );
        })}
        <article className={`conquista${secretaDesbloqueada ? ' conquista--desbloqueada' : ''}`}>
          <span className={`circulo${secretaDesbloqueada ? ' circulo--lilas' : ' circulo--bloqueado'}`}>?</span>
          <span className="conquista__nome">{secretaDesbloqueada ? 'Buraco negro' : '???'}</span>
          <span className="conquista__legenda mono">{secretaDesbloqueada ? 'todas as missões concluídas' : 'secreta'}</span>
        </article>
      </div>
    </section>
  );
}

export function AtividadeHeatmap({ contagem }: { contagem: Map<string, number> }) {
  const hoje = dataLocal();
  const semanas = useMemo(() => gradeAtividade(hoje, contagem, 53), [hoje, contagem]);
  const inicio = semanas[0]!.dias[0]!.iso;
  const pulsos = useMemo(() => totalPulsos(contagem, inicio), [contagem, inicio]);

  return (
    <section className="secao-atividade">
      <div className="cabecalho-secao">
        <h2 className="titulo-secao">Atividade</h2>
        <span className="mono">
          {pulsos} {pulsos === 1 ? 'pulso' : 'pulsos'} nos últimos 12 meses
        </span>
      </div>
      <div className="cartao atividade">
        <div className="atividade__rolagem">
          <div className="atividade__grade" role="img" aria-label={`Mapa de atividade: ${pulsos} pulsos nos últimos 12 meses`}>
            {semanas.map((semana, i) => (
              <div key={i} className="atividade__semana">
                <span className="atividade__mes">{semana.rotuloMes ?? ''}</span>
                {semana.dias.map((dia) =>
                  dia.foraDoPeriodo ? (
                    <span key={dia.iso} className="atividade__dia atividade__dia--vazio" aria-hidden="true" />
                  ) : (
                    <span
                      key={dia.iso}
                      className={`atividade__dia atividade__dia--${dia.nivel}`}
                      title={`${formatarData(dia.iso)} · ${dia.contagem} ${dia.contagem === 1 ? 'pulso' : 'pulsos'}`}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="atividade__legenda mono">
          <span>menos</span>
          <span className="atividade__dia atividade__dia--0" aria-hidden="true" />
          <span className="atividade__dia atividade__dia--1" aria-hidden="true" />
          <span className="atividade__dia atividade__dia--2" aria-hidden="true" />
          <span className="atividade__dia atividade__dia--3" aria-hidden="true" />
          <span>mais</span>
        </div>
      </div>
    </section>
  );
}
