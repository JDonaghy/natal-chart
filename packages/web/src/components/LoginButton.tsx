import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'signin' | 'signup';

const UserIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = '#2c2c54' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const ChevronDown: React.FC = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
    <path d="M1 1l4 4 4-4" stroke="#2c2c54" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LoginButton: React.FC = () => {
  const { user, loading, configured, signInGoogle, signInGithub, signInAuth0, logOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!authMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAuthMode(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [authMode]);

  if (!configured) return null;

  const auth0Configured = Boolean(import.meta.env.VITE_FIREBASE_AUTH0_PROVIDER_ID);

  const openAuthModal = (mode: AuthMode) => {
    setError(null);
    setAuthMode(mode);
    setMenuOpen(false);
  };

  const closeAuthModal = () => {
    if (submitting) return;
    setAuthMode(null);
    setError(null);
  };

  const handleAuth = async (provider: 'google' | 'github' | 'auth0') => {
    if (!authMode || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (provider === 'google') await signInGoogle();
      else if (provider === 'github') await signInGithub();
      else await signInAuth0({ signup: authMode === 'signup' });
      setAuthMode(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      if (!message.includes('popup-closed')) {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: '0.5rem',
    background: '#faf7f0',
    border: '1px solid #b8860b',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    padding: '0.5rem',
    minWidth: '220px',
    zIndex: 100,
    fontFamily: 'Cormorant, serif',
  };

  const menuLinkStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'Cormorant, serif',
    fontSize: '1rem',
    color: '#2c2c54',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  const stackedButtonStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'Cormorant, serif',
    fontSize: '1rem',
    boxSizing: 'border-box',
    marginBottom: '0.35rem',
  };

  const triggerButton = (
    <button
      onClick={() => !loading && setMenuOpen(!menuOpen)}
      disabled={loading}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-label={user ? 'Account menu' : 'Sign in or create an account'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        background: 'none',
        border: '1px solid #b8860b',
        borderRadius: '999px',
        padding: '0.15rem 0.55rem 0.15rem 0.2rem',
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          style={{ width: 28, height: 28, borderRadius: '50%' }}
          referrerPolicy="no-referrer"
        />
      ) : user ? (
        <span style={{
          width: 28, height: 28, borderRadius: '50%', background: '#b8860b', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
        }}>
          {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
        </span>
      ) : (
        <span style={{
          width: 28, height: 28, borderRadius: '50%', background: '#ede4d0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserIcon />
        </span>
      )}
      <ChevronDown />
    </button>
  );

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative' }}>
        {triggerButton}
        {menuOpen && (
          <div role="menu" style={dropdownStyle}>
            {user ? (
              <>
                <div style={{
                  padding: '0.35rem 0.75rem 0.5rem',
                  fontSize: '0.85rem',
                  color: '#666',
                  borderBottom: '1px solid #e8e0d0',
                  marginBottom: '0.35rem',
                  wordBreak: 'break-all',
                }}>
                  {user.email}
                </div>
                <Link
                  to="/preferences"
                  onClick={() => setMenuOpen(false)}
                  style={menuLinkStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ede4d0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  Preferences
                </Link>
                <button
                  onClick={() => { logOut(); setMenuOpen(false); }}
                  style={menuLinkStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ede4d0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('signin')}
                  style={{
                    ...stackedButtonStyle,
                    background: 'none',
                    border: '1px solid #b8860b',
                    color: '#2c2c54',
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  style={{
                    ...stackedButtonStyle,
                    background: '#b8860b',
                    border: '1px solid #b8860b',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  Create Account
                </button>
                <div style={{ borderTop: '1px solid #e8e0d0', margin: '0.35rem 0' }} />
                <Link
                  to="/preferences"
                  onClick={() => setMenuOpen(false)}
                  style={menuLinkStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ede4d0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  Preferences
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {authMode && (
        <div
          onClick={closeAuthModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#faf7f0',
              border: '1px solid #b8860b',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              padding: '1.5rem',
              minWidth: '320px',
              maxWidth: '420px',
              width: '100%',
              fontFamily: 'Cormorant, serif',
              position: 'relative',
            }}
          >
            <button
              onClick={closeAuthModal}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                color: '#666',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0.25rem 0.5rem',
              }}
            >
              ×
            </button>
            <h2
              id="auth-modal-title"
              style={{
                margin: '0 0 0.25rem 0',
                color: '#2c2c54',
                fontSize: '1.5rem',
              }}
            >
              {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.95rem' }}>
              {authMode === 'signup'
                ? 'Pick a provider to create your account.'
                : 'Choose how you signed up.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {auth0Configured && (
                <button
                  onClick={() => handleAuth('auth0')}
                  disabled={submitting}
                  style={{
                    ...stackedButtonStyle,
                    marginBottom: 0,
                    background: '#fff',
                    border: '1px solid #b8860b',
                    color: '#2c2c54',
                    textAlign: 'center',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {authMode === 'signup' ? 'Sign up with Email' : 'Continue with Email'}
                </button>
              )}
              <button
                onClick={() => handleAuth('google')}
                disabled={submitting}
                style={{
                  ...stackedButtonStyle,
                  marginBottom: 0,
                  background: '#fff',
                  border: '1px solid #b8860b',
                  color: '#2c2c54',
                  textAlign: 'center',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {authMode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
              </button>
              <button
                onClick={() => handleAuth('github')}
                disabled={submitting}
                style={{
                  ...stackedButtonStyle,
                  marginBottom: 0,
                  background: '#fff',
                  border: '1px solid #b8860b',
                  color: '#2c2c54',
                  textAlign: 'center',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {authMode === 'signup' ? 'Sign up with GitHub' : 'Continue with GitHub'}
              </button>
            </div>
            {error && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: '#fdecea',
                border: '1px solid #c0392b',
                borderRadius: '4px',
                color: '#c0392b',
                fontSize: '0.9rem',
              }}>
                {error}
              </div>
            )}
            <div style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e8e0d0',
              fontSize: '0.9rem',
              color: '#666',
              textAlign: 'center',
            }}>
              {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b8860b',
                  cursor: 'pointer',
                  fontFamily: 'Cormorant, serif',
                  fontSize: '0.95rem',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {authMode === 'signup' ? 'Sign in' : 'Create one'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
