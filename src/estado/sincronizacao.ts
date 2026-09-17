// Espelha o progresso local no Firestore enquanto o usuário está logado, em tempo real (onSnapshot):
// uma mudança feita em outro aparelho chega sozinha, sem precisar recarregar a página.
import { useEffect, useRef, useState } from 'react';
import { carregarFirebase, firebaseDisponivel } from '../lib/firebase.ts';
import { useAutenticacao } from './autenticacao.ts';
import { assinarProgresso, exportarProgresso, importarProgresso, obterProgresso, type Progresso } from './progresso.ts';

const ATRASO_ENVIO_MS = 1500;

export type StatusSincronizacao = 'ocioso' | 'sincronizando' | 'sincronizado' | 'erro';

async function enviar(uid: string) {
  const kit = await carregarFirebase();
  const progresso = JSON.parse(exportarProgresso()) as Progresso;
  await kit.firestoreApi.setDoc(kit.firestoreApi.doc(kit.db, 'progressos', uid), progresso);

  // Ranking e perfil público: só existe pra quem já escolheu um apelido. Só expõe o essencial
  // (XP, dias estudados e quantas missões foram concluídas) — nunca respostas, notas ou SQL salvo.
  if (progresso.apelido) {
    const missoesConcluidas = Object.values(progresso.missoes).filter((m) => m.concluidaEm).length;
    await kit.firestoreApi.setDoc(kit.firestoreApi.doc(kit.db, 'rankings', uid), {
      apelido: progresso.apelido,
      xp: progresso.xp,
      dias: progresso.dias,
      missoesConcluidas,
      atualizadoEm: new Date().toISOString(),
    });
  }
}

/** Monte uma vez perto da raiz do app: mantém o progresso local e o da nuvem sempre em sincronia. */
export function useSincronizarProgresso(): StatusSincronizacao {
  const { usuario } = useAutenticacao();
  const [status, setStatus] = useState<StatusSincronizacao>('ocioso');
  const ignorarProximaMudanca = useRef(false);
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!usuario || !firebaseDisponivel) {
      setStatus('ocioso');
      return;
    }
    let cancelado = false;
    let pararDeEscutarNuvem: (() => void) | undefined;

    (async () => {
      try {
        const kit = await carregarFirebase();
        if (cancelado) return;
        const referencia = kit.firestoreApi.doc(kit.db, 'progressos', usuario.uid);
        let primeiraLeitura = true;

        pararDeEscutarNuvem = kit.firestoreApi.onSnapshot(
          referencia,
          (instantaneo) => {
            if (cancelado) return;
            if (instantaneo.exists()) {
              // Só aplica o snapshot se ele não for mais velho que a última mudança feita aqui:
              // sem isso, um snapshot atrasado da nuvem pode chegar bem na hora em que acabamos de
              // salvar algo localmente (ex.: terminar um simulado) e apagar essa mudança antes do
              // envio (que é adiado por ATRASO_ENVIO_MS) terminar.
              const dadosNuvem = instantaneo.data() as Partial<{ atualizadoEm: string }>;
              const localAtual = obterProgresso();
              const podeAplicar = !dadosNuvem.atualizadoEm || dadosNuvem.atualizadoEm > localAtual.atualizadoEm;
              if (podeAplicar) {
                ignorarProximaMudanca.current = true;
                importarProgresso(JSON.stringify(dadosNuvem));
              }
              setStatus('sincronizado');
            } else if (primeiraLeitura) {
              enviar(usuario.uid)
                .then(() => !cancelado && setStatus('sincronizado'))
                .catch((erro: unknown) => {
                  console.error('Falha ao enviar progresso inicial para a nuvem:', erro);
                  if (!cancelado) setStatus('erro');
                });
            }
            primeiraLeitura = false;
          },
          (erro) => {
            console.error('Falha ao escutar o progresso na nuvem:', erro);
            if (!cancelado) setStatus('erro');
          },
        );
      } catch (erro) {
        console.error('Falha ao iniciar a sincronização:', erro);
        if (!cancelado) setStatus('erro');
      }
    })();

    const pararDeOuvirLocal = assinarProgresso(() => {
      if (ignorarProximaMudanca.current) {
        ignorarProximaMudanca.current = false;
        return;
      }
      setStatus('sincronizando');
      if (pendente.current) clearTimeout(pendente.current);
      pendente.current = setTimeout(() => {
        enviar(usuario.uid)
          .then(() => !cancelado && setStatus('sincronizado'))
          .catch((erro: unknown) => {
            console.error('Falha ao enviar progresso para a nuvem:', erro);
            if (!cancelado) setStatus('erro');
          });
      }, ATRASO_ENVIO_MS);
    });

    return () => {
      cancelado = true;
      pararDeEscutarNuvem?.();
      pararDeOuvirLocal();
      if (pendente.current) clearTimeout(pendente.current);
    };
  }, [usuario]);

  return status;
}
