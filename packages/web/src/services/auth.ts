import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  type Auth,
  type User,
  type Unsubscribe,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getFirebaseAuth(): Auth {
  if (!auth) {
    if (!isConfigured()) {
      throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

export function subscribeToAuthState(callback: (user: User | null) => void): Unsubscribe {
  if (!isConfigured()) {
    // Firebase not configured — immediately report no user, return no-op unsubscribe
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  return result.user;
}

export async function signInWithGithub(): Promise<User> {
  const provider = new GithubAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (auth) {
    await firebaseSignOut(auth);
  }
}

export async function getIdToken(): Promise<string | null> {
  const currentUser = auth?.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken();
}

export { isConfigured as isAuthConfigured };
export type { User };
