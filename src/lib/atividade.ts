// Monta a grade de atividade (estilo GitHub) a partir do progresso salvo.
import type { Progresso } from '../estado/progresso.ts';
import { somarDias } from './niveis.ts';

/** Quantos "eventos" (checkpoint concluído, simulado entregue) aconteceram em cada dia. */
export function contarAtividadesPorDia(progresso: Progresso): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const dia of progresso.dias) contagem.set(dia, 1);

  const somar = (isoDataHora: string | undefined) => {
    if (!isoDataHora) return;
    const dia = isoDataHora.slice(0, 10);
    contagem.set(dia, (contagem.get(dia) ?? 0) + 1);
  };

  for (const missao of Object.values(progresso.missoes)) {
    for (const checkpoint of Object.values(missao.checkpoints)) somar(checkpoint.concluidoEm);
  }
  for (const simulado of Object.values(progresso.simulados)) {
    for (const tentativa of simulado.tentativas) somar(tentativa.entregueEm);
  }

  return contagem;
}

/** 0 = sem atividade, 1 a 3 = intensidade crescente. */
export function nivelAtividade(contagem: number): 0 | 1 | 2 | 3 {
  if (contagem <= 0) return 0;
  if (contagem === 1) return 1;
  if (contagem <= 3) return 2;
  return 3;
}

export interface DiaAtividade {
  iso: string;
  nivel: 0 | 1 | 2 | 3;
  contagem: number;
  foraDoPeriodo: boolean;
}

export interface SemanaAtividade {
  dias: DiaAtividade[];
  rotuloMes?: string;
}

const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Monta ~52 semanas terminando na semana de hoje, domingo a sábado, como no gráfico de contribuições do GitHub. */
export function gradeAtividade(hoje: string, contagem: Map<string, number>, semanas = 53): SemanaAtividade[] {
  const [ano, mes, dia] = hoje.split('-').map(Number);
  const diaSemanaHoje = new Date(ano, mes - 1, dia).getDay();
  const fimGrade = somarDias(hoje, 6 - diaSemanaHoje); // sábado da semana atual
  const inicioGrade = somarDias(fimGrade, -(semanas * 7 - 1));

  const resultado: SemanaAtividade[] = [];
  let mesAnterior = -1;
  let cursor = inicioGrade;

  for (let s = 0; s < semanas; s++) {
    const dias: DiaAtividade[] = [];
    let rotuloMes: string | undefined;
    for (let d = 0; d < 7; d++) {
      const [, m, dd] = cursor.split('-').map(Number);
      if (dd <= 7 && m - 1 !== mesAnterior) {
        rotuloMes = NOMES_MES[m - 1];
        mesAnterior = m - 1;
      }
      dias.push({
        iso: cursor,
        nivel: nivelAtividade(contagem.get(cursor) ?? 0),
        contagem: contagem.get(cursor) ?? 0,
        foraDoPeriodo: cursor > hoje,
      });
      cursor = somarDias(cursor, 1);
    }
    resultado.push({ dias, rotuloMes });
  }

  return resultado;
}

export function totalPulsos(contagem: Map<string, number>, desde: string): number {
  let total = 0;
  for (const [dia, valor] of contagem) if (dia >= desde) total += valor;
  return total;
}
