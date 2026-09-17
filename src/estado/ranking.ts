// Lê o ranking público e os perfis dele em tempo real, direto do Firestore.
// Só pra quem está logado: tanto a lista quanto os perfis exigem login (ver firestore.rules).
import { useEffect, useState } from 'react';
import { carregarFirebase, firebaseDisponivel } from '../lib/firebase.ts';
import { useAutenticacao } from './autenticacao.ts';

export interface LinhaRanking {
  uid: string;
  apelido: string;
  xp: number;
  /** Dias (AAAA-MM-DD) com alguma atividade. */
  dias: string[];
  missoesConcluidas: number;
}

type DadosRanking = { apelido: string; xp: number; dias?: string[]; missoesConcluidas?: number };

function linhaDeDados(uid: string, dados: DadosRanking): LinhaRanking {
  return { uid, apelido: dados.apelido, xp: dados.xp, dias: dados.dias ?? [], missoesConcluidas: dados.missoesConcluidas ?? 0 };
}

export type EstadoRanking =
  | { fase: 'indisponivel' }
  | { fase: 'requer-login' }
  | { fase: 'carregando' }
  | { fase: 'erro' }
  | { fase: 'ok'; linhas: LinhaRanking[] };

const LIMITE = 50;

export function useRanking(): EstadoRanking {
  const { usuario } = useAutenticacao();
  const [estado, setEstado] = useState<EstadoRanking>(() =>
    !firebaseDisponivel ? { fase: 'indisponivel' } : usuario ? { fase: 'carregando' } : { fase: 'requer-login' },
  );

  useEffect(() => {
    if (!firebaseDisponivel) {
      setEstado({ fase: 'indisponivel' });
      return;
    }
    if (!usuario) {
      setEstado({ fase: 'requer-login' });
      return;
    }

    setEstado({ fase: 'carregando' });
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
            const linhas = instantaneo.docs.map((doc) => linhaDeDados(doc.id, doc.data() as DadosRanking));
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
  }, [usuario]);

  return estado;
}

export type EstadoPerfil =
  | { fase: 'indisponivel' }
  | { fase: 'requer-login' }
  | { fase: 'carregando' }
  | { fase: 'erro' }
  | { fase: 'nao-encontrado' }
  | { fase: 'ok'; perfil: LinhaRanking };

/** Perfil público de um único usuário do ranking (mesma coleção `rankings`, um doc só). */
export function usePerfilPublico(uid: string | undefined): EstadoPerfil {
  const { usuario } = useAutenticacao();
  const [estado, setEstado] = useState<EstadoPerfil>(() =>
    !firebaseDisponivel ? { fase: 'indisponivel' } : usuario ? { fase: 'carregando' } : { fase: 'requer-login' },
  );

  useEffect(() => {
    if (!firebaseDisponivel) {
      setEstado({ fase: 'indisponivel' });
      return;
    }
    if (!usuario) {
      setEstado({ fase: 'requer-login' });
      return;
    }
    if (!uid) {
      setEstado({ fase: 'nao-encontrado' });
      return;
    }

    setEstado({ fase: 'carregando' });
    let cancelado = false;
    let pararDeEscutar: (() => void) | undefined;

    carregarFirebase()
      .then((kit) => {
        if (cancelado) return;
        const referencia = kit.firestoreApi.doc(kit.db, 'rankings', uid);
        pararDeEscutar = kit.firestoreApi.onSnapshot(
          referencia,
          (instantaneo) => {
            if (cancelado) return;
            if (!instantaneo.exists()) {
              setEstado({ fase: 'nao-encontrado' });
              return;
            }
            setEstado({ fase: 'ok', perfil: linhaDeDados(instantaneo.id, instantaneo.data() as DadosRanking) });
          },
          (erro: unknown) => {
            console.error('Falha ao carregar o perfil:', erro);
            if (!cancelado) setEstado({ fase: 'erro' });
          },
        );
      })
      .catch((erro: unknown) => {
        console.error('Falha ao carregar o Firebase para o perfil:', erro);
        if (!cancelado) setEstado({ fase: 'erro' });
      });

    return () => {
      cancelado = true;
      pararDeEscutar?.();
    };
  }, [usuario, uid]);

  return estado;
}
