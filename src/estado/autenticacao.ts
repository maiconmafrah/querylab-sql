// Estado de login (Google), guardado só na memória: o Firebase já persiste a sessão sozinho.
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { carregarFirebase, firebaseDisponivel } from '../lib/firebase.ts';

export interface EstadoAuth {
  carregando: boolean;
  usuario: User | null;
  /** Código do erro (ex.: "auth/unauthorized-domain") de um login redirecionado que falhou. */
  erro: string | null;
}

let estado: EstadoAuth = { carregando: firebaseDisponivel, usuario: null, erro: null };
const ouvintes = new Set<() => void>();
let iniciado = false;

function publicar(novo: EstadoAuth) {
  estado = novo;
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Popups são pouco confiáveis em navegadores de celular (bloqueio, in-app browsers); nesses, usa redirecionamento. */
function ehMovel(): boolean {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function iniciar() {
  if (iniciado || !firebaseDisponivel) return;
  iniciado = true;
  let ultimoErro: string | null = null;

  carregarFirebase()
    .then(async (kit) => {
      try {
        await kit.authApi.getRedirectResult(kit.auth);
      } catch (erro: unknown) {
        console.error('Falha ao concluir login redirecionado com o Google:', erro);
        ultimoErro = (erro as { code?: string } | undefined)?.code ?? 'auth/erro-desconhecido';
      }
      kit.authApi.onAuthStateChanged(kit.auth, (usuario) => {
        if (usuario) ultimoErro = null;
        publicar({ carregando: false, usuario, erro: ultimoErro });
      });
    })
    .catch((erro: unknown) => {
      console.error('Falha ao carregar o Firebase:', erro);
      publicar({ carregando: false, usuario: null, erro: null });
    });
}

export function useAutenticacao(): EstadoAuth {
  const [local, setLocal] = useState(estado);
  useEffect(() => {
    iniciar();
    const ouvinte = () => setLocal(estado);
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  }, []);
  return local;
}

export async function entrarComGoogle(): Promise<void> {
  const kit = await carregarFirebase();
  if (ehMovel()) {
    await kit.authApi.signInWithRedirect(kit.auth, kit.googleProvider);
  } else {
    await kit.authApi.signInWithPopup(kit.auth, kit.googleProvider);
  }
}

export async function sair(): Promise<void> {
  if (!firebaseDisponivel) return;
  const kit = await carregarFirebase();
  await kit.authApi.signOut(kit.auth);
}
