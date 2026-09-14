import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PainelSql } from '../componentes/PainelSql.tsx';
import { datasetsDisponiveis } from '../conteudo/index.ts';
import { lerConsulta, salvarConsulta } from '../estado/progresso.ts';
import { useAmbiente, usePainelSql } from '../hooks/useAmbiente.ts';
import { useTitulo } from '../hooks/useTitulo.ts';

const CHAVE_DATASET = 'querylab:playground-dataset';
const DATASET_PADRAO = 'loja.sql';
const CONSULTA_INICIAL = '-- Playground livre: nada aqui vale XP, e nada aqui quebra.\n-- A aba "Tabelas" mostra o que existe neste dataset.\nSHOW TABLES;';

function lerDatasetSalvo(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_DATASET);
    return salvo && datasetsDisponiveis.includes(salvo) ? salvo : DATASET_PADRAO;
  } catch {
    return DATASET_PADRAO;
  }
}

const chaveConsulta = (dataset: string) => `playground:${dataset}`;

export function Playground() {
  useTitulo('Playground SQL');
  const localizacao = useLocation();
  const recebido = localizacao.state as { sql?: string; dataset?: string } | null;

  const [dataset, setDataset] = useState(() =>
    recebido?.dataset && datasetsDisponiveis.includes(recebido.dataset) ? recebido.dataset : lerDatasetSalvo(),
  );
  const [consulta, setConsulta] = useState(() => recebido?.sql ?? lerConsulta(chaveConsulta(dataset)) ?? CONSULTA_INICIAL);

  const estadoAmbiente = useAmbiente(dataset);
  const painel = usePainelSql(estadoAmbiente);

  useEffect(() => {
    const espera = setTimeout(() => salvarConsulta(chaveConsulta(dataset), consulta), 400);
    return () => clearTimeout(espera);
  }, [consulta, dataset]);

  const trocarDataset = (novo: string) => {
    salvarConsulta(chaveConsulta(dataset), consulta);
    setDataset(novo);
    setConsulta(lerConsulta(chaveConsulta(novo)) ?? CONSULTA_INICIAL);
    try {
      localStorage.setItem(CHAVE_DATASET, novo);
    } catch {
      // ignora
    }
  };

  return (
    <div className="pagina pagina--larga">
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">Playground SQL</h1>
          <p className="subtitulo-pagina">
            Um banco só seu para testar qualquer consulta. Crie tabelas, apague linhas, erre à vontade: “Restaurar dataset” deixa tudo
            como era.
          </p>
        </div>
        <label className="seletor-dataset">
          <span className="rotulo">Dataset</span>
          <select className="campo" value={dataset} onChange={(evento) => trocarDataset(evento.target.value)}>
            {datasetsDisponiveis.map((nome) => (
              <option key={nome} value={nome}>
                {nome.replace(/\.sql$/, '')}
              </option>
            ))}
          </select>
        </label>
      </div>

      <PainelSql
        estadoAmbiente={estadoAmbiente}
        painel={painel}
        consulta={consulta}
        aoMudarConsulta={setConsulta}
        nomeArquivo={`playground/${dataset}`}
        alturaEditor={300}
        alturaResultado={480}
      />
    </div>
  );
}
