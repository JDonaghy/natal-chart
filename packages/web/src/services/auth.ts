import { initializeApp, FirebaseError, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
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

export async function signInWithAuth0(options?: { signup?: boolean }): Promise<User> {
  const providerId = import.meta.env.VITE_FIREBASE_AUTH0_PROVIDER_ID;
  if (!providerId) {
    throw new Error('Auth0 provider not configured. Set VITE_FIREBASE_AUTH0_PROVIDER_ID.');
  }
  const provider = new OAuthProvider(providerId);
  if (options?.signup) {
    // Auth0 universal-login parameter: opens the Sign Up tab instead of Log In.
    provider.setCustomParameters({ screen_hint: 'signup' });
  }
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

/**
 * Human-readable messages for Firebase Auth error codes (`err.code`, e.g.
 * `auth/unauthorized-domain`). Callers that need to special-case a code
 * (e.g. suppressing the popup-closed-by-user flow) should check
 * `getAuthErrorCode()` directly rather than string-matching the mapped text.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/unauthorized-domain':
    "This site isn't authorised for sign-in yet. Please try again later or contact support.",
  'auth/popup-blocked':
    'Your browser blocked the sign-in popup. Please allow popups for this site and try again.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/invalid-credential': 'That sign-in method is invalid or has expired. Please try again.',
};

const DEFAULT_AUTH_ERROR_MESSAGE = 'Sign in failed. Please try again.';

/** Extracts the Firebase Auth error code (e.g. `auth/unauthorized-domain`) from a thrown value, if any. */
export function getAuthErrorCode(err: unknown): string | null {
  return err instanceof FirebaseError ? err.code : null;
}

/** Maps a thrown sign-in error to a message safe to show a user, instead of the raw SDK string. */
export function mapAuthError(err: unknown): string {
  const code = getAuthErrorCode(err);
  if (code) {
    return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_AUTH_ERROR_MESSAGE;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return DEFAULT_AUTH_ERROR_MESSAGE;
}

export { isConfigured as isAuthConfigured };
export type { User };
