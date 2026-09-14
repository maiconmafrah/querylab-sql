// Lê o ranking público (apelido + XP) em tempo real, direto do Firestore.
import { useEffect, useState } from 'react';
import { carregarFirebase, firebaseDisponivel } from '../lib/firebase.ts';

export interface LinhaRanking {
  uid: string;
  apelido: string;
  xp: number;
}

export type EstadoRanking =
  | { fase: 'indisponivel' }
  | { fase: 'carregando' }
  | { fase: 'erro' }
  | { fase: 'ok'; linhas: LinhaRanking[] };

const LIMITE = 50;

export function useRanking(): EstadoRanking {
  const [estado, setEstado] = useState<EstadoRanking>(firebaseDisponivel ? { fase: 'carregando' } : { fase: 'indisponivel' });

  useEffect(() => {
    if (!firebaseDisponivel) return;
    let cancelado = false;
    let pararDeEscutar: (() => void) | undefined;

    carregarFirebase()
      .then((kit) => {
        if (cancelado) return;
        const consulta = kit.firestoreApi.query(
          kit.firestoreApi.collection(kit.db, 'rankings'),
          kit.firestoreApi.orderBy('xp', 'desc'),
          kit.firestoreApi.limit(LIMITE),
        );
        pararDeEscutar = kit.firestoreApi.onSnapshot(
          consulta,
          (instantaneo) => {
            if (cancelado) return;
            const linhas = instantaneo.docs.map((doc) => {
              const dados = doc.data() as { apelido: string; xp: number };
              return { uid: doc.id, apelido: dados.apelido, xp: dados.xp };
            });
            setEstado({ fase: 'ok', linhas });
          },
          (erro: unknown) => {
            console.error('Falha ao carregar o ranking:', erro);
            if (!cancelado) setEstado({ fase: 'erro' });
          },
        );
      })
      .catch((erro: unknown) => {
        console.error('Falha ao carregar o Firebase para o ranking:', erro);
        if (!cancelado) setEstado({ fase: 'erro' });
      });

    return () => {
      cancelado = true;
      pararDeEscutar?.();
    };
  }, []);

  return estado;
}
