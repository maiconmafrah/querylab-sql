// Espelha o progresso local no Firestore enquanto o usuário está logado, em tempo real (onSnapshot):
// uma mudança feita em outro aparelho chega sozinha, sem precisar recarregar a página.
import { useEffect, useRef, useState } from 'react';
import { carregarFirebase, firebaseDisponivel } from '../lib/firebase.ts';
import { useAutenticacao } from './autenticacao.ts';
import { assinarProgresso, exportarProgresso, importarProgresso } from './progresso.ts';

const ATRASO_ENVIO_MS = 1500;

export type StatusSincronizacao = 'ocioso' | 'sincronizando' | 'sincronizado' | 'erro';

async function enviar(uid: string) {
  const kit = await carregarFirebase();
  await kit.firestoreApi.setDoc(kit.firestoreApi.doc(kit.db, 'progressos', uid), JSON.parse(exportarProgresso()));
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
              ignorarProximaMudanca.current = true;
              importarProgresso(JSON.stringify(instantaneo.data()));
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
