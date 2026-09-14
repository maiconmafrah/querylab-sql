import { useState } from 'react';
import { desafios, nomeTema } from '../conteudo/index.ts';
import { responderDesafio, useProgresso } from '../estado/progresso.ts';
import { desafioDoDia, XP_DESAFIO_DIARIO } from '../lib/desafio.ts';
import { dataLocal } from '../lib/niveis.ts';
import { CodigoSql } from './CodigoSql.tsx';
import { Icone } from './Icone.tsx';

export function CartaoDesafio() {
  const progresso = useProgresso();
  const hoje = dataLocal();
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const questao = desafioDoDia(hoje, desafios);
  if (!questao) return null;

  const respostaSalva = progresso.desafios[hoje];
  const respondido = Boolean(respostaSalva);
  const indiceEscolhido = respostaSalva ? respostaSalva.escolhida : escolhida;

  function escolher(i: number) {
    if (respondido || escolhida !== null) return;
    setEscolhida(i);
    responderDesafio(hoje, i, i === questao!.correta, XP_DESAFIO_DIARIO);
  }

  return (
    <article className="cartao desafio-diario">
      <div className="linha-entre">
        <h2 className="titulo-secao">
          <Icone nome="raio" tamanho={17} />
          Desafio de hoje
        </h2>
        <span className="tag">{nomeTema(questao.tema)}</span>
      </div>

      {questao.codigo && <CodigoSql codigo={questao.codigo} className="codigo desafio-diario__codigo" />}
      <p className="desafio-diario__enunciado">{questao.enunciado}</p>

      <div className="alternativas alternativas--compactas" role="radiogroup" aria-label={questao.enunciado}>
        {questao.alternativas.map((alternativa, i) => {
          const ehEscolhida = indiceEscolhido === i;
          const revelar = indiceEscolhido !== null;
          const classe = revelar
            ? i === questao.correta
              ? 'alternativa alternativa--certa'
              : ehEscolhida
                ? 'alternativa alternativa--errada'
                : 'alternativa'
            : 'alternativa';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={ehEscolhida}
              className={classe}
              disabled={revelar}
              onClick={() => escolher(i)}
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

      {indiceEscolhido !== null && (
        <div className={`aviso ${indiceEscolhido === questao.correta ? 'aviso--ok' : 'aviso--erro'}`} role="status">
          <Icone nome={indiceEscolhido === questao.correta ? 'check' : 'x'} />
          <div>
            <strong>
              {indiceEscolhido === questao.correta
                ? `Certeza! +${respostaSalva?.xp ?? XP_DESAFIO_DIARIO} XP`
                : 'Essa não era a resposta certa.'}
            </strong>
            <p>{questao.explicacao}</p>
          </div>
        </div>
      )}
    </article>
  );
}
