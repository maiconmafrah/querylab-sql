// Espelha o progresso local no Firestore enquanto o usuário está logado.
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

/** Monte uma vez perto da raiz do app: busca o progresso da nuvem ao logar e reenvia a cada mudança local. */
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

    (async () => {
      try {
        const kit = await carregarFirebase();
        const referencia = kit.firestoreApi.doc(kit.db, 'progressos', usuario.uid);
        const instantaneo = await kit.firestoreApi.getDoc(referencia);
        if (cancelado) return;
        if (instantaneo.exists()) {
          ignorarProximaMudanca.current = true;
          importarProgresso(JSON.stringify(instantaneo.data()));
        } else {
          await enviar(usuario.uid);
        }
        if (!cancelado) setStatus('sincronizado');
      } catch {
        if (!cancelado) setStatus('erro');
      }
    })();

    const pararDeOuvir = assinarProgresso(() => {
      if (ignorarProximaMudanca.current) {
        ignorarProximaMudanca.current = false;
        return;
      }
      setStatus('sincronizando');
      if (pendente.current) clearTimeout(pendente.current);
      pendente.current = setTimeout(() => {
        enviar(usuario.uid)
          .then(() => !cancelado && setStatus('sincronizado'))
          .catch(() => !cancelado && setStatus('erro'));
      }, ATRASO_ENVIO_MS);
    });

    return () => {
      cancelado = true;
      pararDeOuvir();
      if (pendente.current) clearTimeout(pendente.current);
    };
  }, [usuario]);

  return status;
}
