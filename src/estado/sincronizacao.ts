// Espelha o progresso local no Firestore enquanto o usuário está logado, em tempo real (onSnapshot):
// uma mudança feita em outro aparelho chega sozinha, sem precisar recarregar a página.
import { useEffect, useRef, useState } from 'react';
import { carregarFirebase, firebaseDisponivel } from '../lib/firebase.ts';
import { useAutenticacao } from './autenticacao.ts';
import { mesclarProgresso, mesmoConteudo } from './mesclar.ts';
import { aplicarProgressoMesclado, assinarProgresso, exportarProgresso, lerProgresso, obterProgresso, type Progresso } from './progresso.ts';

const ATRASO_ENVIO_MS = 1500;

export type StatusSincronizacao = 'ocioso' | 'sincronizando' | 'sincronizado' | 'erro';

async function enviar(uid: string) {
  const kit = await carregarFirebase();
  const progresso = JSON.parse(exportarProgresso()) as Progresso;
  await kit.firestoreApi.setDoc(kit.firestoreApi.doc(kit.db, 'progressos', uid), progresso);
  await enviarRanking(uid, progresso);
}

// Ranking e perfil público: só existe pra quem já escolheu um apelido. Só expõe o essencial
// (XP, dias estudados e quantas missões foram concluídas) — nunca respostas, notas ou SQL salvo.
async function enviarRanking(uid: string, progresso: Progresso) {
  if (!progresso.apelido) return;
  const kit = await carregarFirebase();
  const missoesConcluidas = Object.values(progresso.missoes).filter((m) => m.concluidaEm).length;
  await kit.firestoreApi.setDoc(kit.firestoreApi.doc(kit.db, 'rankings', uid), {
    apelido: progresso.apelido,
    xp: progresso.xp,
    dias: progresso.dias,
    missoesConcluidas,
    atualizadoEm: new Date().toISOString(),
  });
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
    // Até a primeira leitura da nuvem, nada é enviado: senão um aparelho desatualizado apagaria
    // o que foi feito em outro (ex.: os dias de estudo da sequência).
    let nuvemLida = false;

    const enviarEmBreve = () => {
      setStatus('sincronizando');
      if (pendente.current) clearTimeout(pendente.current);
      pendente.current = setTimeout(() => {
        pendente.current = null;
        enviar(usuario.uid)
          .then(() => !cancelado && setStatus('sincronizado'))
          .catch((erro: unknown) => {
            console.error('Falha ao enviar progresso para a nuvem:', erro);
            if (!cancelado) setStatus('erro');
          });
      }, ATRASO_ENVIO_MS);
    };

    (async () => {
      try {
        const kit = await carregarFirebase();
        if (cancelado) return;
        const referencia = kit.firestoreApi.doc(kit.db, 'progressos', usuario.uid);

        pararDeEscutarNuvem = kit.firestoreApi.onSnapshot(
          referencia,
          (instantaneo) => {
            if (cancelado) return;
            const primeiraLeitura = !nuvemLida;
            nuvemLida = true;
            const nuvem = instantaneo.exists() ? lerProgresso(instantaneo.data()) : null;
            if (!nuvem) {
              enviarEmBreve();
              return;
            }
            // Mescla em vez de escolher um lado: o que só existe aqui ou só na nuvem sobrevive.
            const local = obterProgresso();
            const mesclado = mesclarProgresso(local, nuvem);
            if (!mesmoConteudo(mesclado, local)) {
              ignorarProximaMudanca.current = true;
              aplicarProgressoMesclado(mesclado);
            }
            if (!mesmoConteudo(mesclado, nuvem)) enviarEmBreve();
            else if (primeiraLeitura) {
              // Mesmo sem nada novo, regrava o ranking uma vez por visita: ele se corrige sozinho
              // se uma gravação anterior tiver falhado.
              enviarRanking(usuario.uid, obterProgresso())
                .then(() => !cancelado && !pendente.current && setStatus('sincronizado'))
                .catch((erro: unknown) => {
                  console.error('Falha ao atualizar o ranking:', erro);
                  if (!cancelado) setStatus('erro');
                });
            } else if (!pendente.current) setStatus('sincronizado');
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
      if (nuvemLida) enviarEmBreve();
      else setStatus('sincronizando');
    });

    return () => {
      cancelado = true;
      pararDeEscutarNuvem?.();
      pararDeOuvirLocal();
      if (pendente.current) clearTimeout(pendente.current);
      pendente.current = null;
    };
  }, [usuario]);

  return status;
}
