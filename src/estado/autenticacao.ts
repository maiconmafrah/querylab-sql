// Estado de login (Google), guardado só na memória: o Firebase já persiste a sessão sozinho.
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { carregarFirebase, firebaseDisponivel } from '../lib/firebase.ts';

export interface EstadoAuth {
  carregando: boolean;
  usuario: User | null;
}

let estado: EstadoAuth = { carregando: firebaseDisponivel, usuario: null };
const ouvintes = new Set<() => void>();
let iniciado = false;

function publicar(novo: EstadoAuth) {
  estado = novo;
  ouvintes.forEach((ouvinte) => ouvinte());
}

function iniciar() {
  if (iniciado || !firebaseDisponivel) return;
  iniciado = true;
  carregarFirebase()
    .then((kit) => kit.authApi.onAuthStateChanged(kit.auth, (usuario) => publicar({ carregando: false, usuario })))
    .catch(() => publicar({ carregando: false, usuario: null }));
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
  await kit.authApi.signInWithPopup(kit.auth, kit.googleProvider);
}

export async function sair(): Promise<void> {
  if (!firebaseDisponivel) return;
  const kit = await carregarFirebase();
  await kit.authApi.signOut(kit.auth);
}
