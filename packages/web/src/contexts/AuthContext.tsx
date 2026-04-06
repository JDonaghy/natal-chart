import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  subscribeToAuthState,
  signInWithGoogle,
  signInWithGithub,
  signOut,
  isAuthConfigured,
  type User,
} from '../services/auth';
import { upsertUser } from '../services/cloudSync';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInGoogle: () => Promise<void>;
  signInGithub: () => Promise<void>;
  logOut: () => Promise<void>;
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
  const configured = isAuthConfigured();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Upsert user record in D1
        upsertUser().catch(err => console.warn('Failed to upsert user:', err));
      }
    });
    return unsubscribe;
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
    <AuthContext.Provider value={{ user, loading, configured, signInGoogle, signInGithub, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};
