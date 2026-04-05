import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  subscribeToAuthState,
  signInWithGoogle,
  signInWithGithub,
  signOut,
  isAuthConfigured,
  type User,
} from '../services/auth';
import { upsertUser } from '../services/cloudSync';

const MIGRATION_KEY = 'natal-chart-cloud-migration-offered';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  configured: boolean;
  showMigration: boolean;
  signInGoogle: () => Promise<void>;
  signInGithub: () => Promise<void>;
  logOut: () => Promise<void>;
  dismissMigration: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMigration, setShowMigration] = useState(false);
  const configured = isAuthConfigured();
  const prevUserRef = useRef<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      const wasLoggedOut = !prevUserRef.current;
      prevUserRef.current = firebaseUser;
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Upsert user record in D1
        upsertUser().catch(err => console.warn('Failed to upsert user:', err));

        // Show migration modal on fresh login if not previously offered
        if (wasLoggedOut) {
          try {
            const offered = localStorage.getItem(MIGRATION_KEY);
            if (!offered) {
              setShowMigration(true);
            }
          } catch { /* ignore */ }
        }
      }
    });
    return unsubscribe;
  }, []);

  const dismissMigration = useCallback(() => {
    setShowMigration(false);
    try {
      localStorage.setItem(MIGRATION_KEY, 'true');
    } catch { /* ignore */ }
  }, []);

  const signInGoogle = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signInGithub = useCallback(async () => {
    await signInWithGithub();
  }, []);

  const logOut = useCallback(async () => {
    await signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configured, showMigration, signInGoogle, signInGithub, logOut, dismissMigration }}>
      {children}
    </AuthContext.Provider>
  );
};
