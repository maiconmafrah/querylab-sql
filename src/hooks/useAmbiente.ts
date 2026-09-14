import { useCallback, useEffect, useMemo, useState } from 'react';
import { carregarDataset } from '../conteudo/index.ts';
import { Ambiente, ErroExecucao, type ResultadoExecucao, type TabelaEsquema } from '../db/ambiente.ts';
import { registrarAtividade } from '../estado/progresso.ts';
import type { ResultadoTabela } from '../lib/comparar.ts';
import { dividirComandos, tipoComando, tituloErro } from '../lib/sql.ts';

export type EstadoAmbiente =
  | { fase: 'carregando' }
  | { fase: 'pronto'; ambiente: Ambiente }
  | { fase: 'erro'; mensagem: string };

/** Cria um ambiente DuckDB isolado com o dataset e o fecha quando o componente sai da tela. */
export function useAmbiente(dataset: string | undefined): EstadoAmbiente {
  const [estado, setEstado] = useState<EstadoAmbiente>({ fase: 'carregando' });

  useEffect(() => {
    if (!dataset) return;
    let cancelado = false;
    let criado: Ambiente | null = null;
    setEstado({ fase: 'carregando' });

    (async () => {
      try {
        const setup = await carregarDataset(dataset);
        const ambiente = await Ambiente.criar(setup);
        if (cancelado) {
          await ambiente.fechar();
          return;
        }
        criado = ambiente;
        setEstado({ fase: 'pronto', ambiente });
      } catch (erro) {
        if (!cancelado) {
          setEstado({ fase: 'erro', mensagem: erro instanceof Error ? erro.message : String(erro) });
        }
      }
    })();

    return () => {
      cancelado = true;
      void criado?.fechar();
    };
  }, [dataset]);

  return estado;
}

export type EstadoExecucao =
  | { fase: 'ocioso'; aviso?: string }
  | { fase: 'rodando' }
  | ({ fase: 'ok' } & ResultadoExecucao)
  | { fase: 'erro'; titulo: string; mensagem: string; comando: number; total: number };

export function erroParaExecucao(erro: unknown): EstadoExecucao {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return {
    fase: 'erro',
    titulo: tituloErro(mensagem),
    mensagem,
    comando: erro instanceof ErroExecucao ? erro.comando : 0,
    total: erro instanceof ErroExecucao ? erro.totalComandos : 0,
  };
}

const SOMENTE_LEITURA = new Set(['SELECT', 'WITH', 'FROM', 'VALUES', 'DESCRIBE', 'SHOW', 'EXPLAIN', 'SUMMARIZE', 'PRAGMA', 'TABLE']);

/** Estado do editor + resultado: executar, restaurar o dataset e o esquema para autocompletar. */
export function usePainelSql(estadoAmbiente: EstadoAmbiente) {
  const ambiente = estadoAmbiente.fase === 'pronto' ? estadoAmbiente.ambiente : null;
  const [execucao, setExecucao] = useState<EstadoExecucao>({ fase: 'ocioso' });
  const [esquema, setEsquema] = useState<TabelaEsquema[] | null>(null);
  const [versaoEsquema, setVersaoEsquema] = useState(0);

  useEffect(() => {
    if (!ambiente) {
      setEsquema(null);
      return;
    }
    let ativo = true;
    ambiente
      .esquema()
      .then((tabelas) => ativo && setEsquema(tabelas))
      .catch(() => ativo && setEsquema([]));
    return () => {
      ativo = false;
    };
  }, [ambiente, versaoEsquema]);

  const executar = useCallback(
    async (sql: string): Promise<ResultadoExecucao | null> => {
      if (!ambiente) return null;
      setExecucao({ fase: 'rodando' });
      try {
        const resultado = await ambiente.executar(sql);
        setExecucao({ fase: 'ok', ...resultado });
        registrarAtividade();
        return resultado;
      } catch (erro) {
        setExecucao(erroParaExecucao(erro));
        return null;
      } finally {
        if (dividirComandos(sql).some((comando) => !SOMENTE_LEITURA.has(tipoComando(comando)))) {
          setVersaoEsquema((v) => v + 1);
        }
      }
    },
    [ambiente],
  );

  const mostrarResultado = useCallback((resultado: ResultadoExecucao) => {
    setExecucao({ fase: 'ok', ...resultado });
  }, []);

  const restaurar = useCallback(async () => {
    if (!ambiente) return;
    setExecucao({ fase: 'rodando' });
    try {
      await ambiente.restaurar();
      setExecucao({ fase: 'ocioso', aviso: 'Dataset restaurado: as tabelas voltaram ao estado original.' });
      setVersaoEsquema((v) => v + 1);
    } catch (erro) {
      setExecucao(erroParaExecucao(erro));
    }
  }, [ambiente]);

  const autocompletar = useMemo(
    () => (esquema ? Object.fromEntries(esquema.map((t) => [t.nome, t.colunas.map((c) => c.nome)])) : undefined),
    [esquema],
  );

  return { ambiente, execucao, setExecucao, mostrarResultado, esquema, autocompletar, executar, restaurar };
}

export type PainelSqlEstado = ReturnType<typeof usePainelSql>;

export type { ResultadoTabela };
