// O SDK do Firebase só é baixado sob demanda: quem não configura .env.local não paga esse peso no bundle.
import type { FirebaseApp } from 'firebase/app';
import type * as AuthApi from 'firebase/auth';
import type * as FirestoreApi from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Login com Google só fica disponível se o .env.local com as chaves do Firebase existir. */
export const firebaseDisponivel = Boolean(config.apiKey && config.projectId);

export interface KitFirebase {
  app: FirebaseApp;
  auth: AuthApi.Auth;
  db: FirestoreApi.Firestore;
  googleProvider: AuthApi.GoogleAuthProvider;
  authApi: typeof AuthApi;
  firestoreApi: typeof FirestoreApi;
}

let promessa: Promise<KitFirebase> | null = null;

export function carregarFirebase(): Promise<KitFirebase> {
  if (!firebaseDisponivel) return Promise.reject(new Error('Login com Google não está configurado neste site.'));
  if (!promessa) {
    promessa = (async () => {
      const [{ initializeApp }, authApi, firestoreApi] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(config);
      const auth = authApi.getAuth(app);
      const db = firestoreApi.getFirestore(app);
      const googleProvider = new authApi.GoogleAuthProvider();
      return { app, auth, db, googleProvider, authApi, firestoreApi };
    })();
  }
  return promessa;
}
