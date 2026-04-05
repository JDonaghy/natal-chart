import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginButton: React.FC = () => {
  const { user, loading, configured, signInGoogle, signInGithub, logOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSignInOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!configured) return null;

  const handleSignIn = async (provider: 'google' | 'github') => {
    setError(null);
    try {
      if (provider === 'google') await signInGoogle();
      else await signInGithub();
      setSignInOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      // Don't show error if user just closed the popup
      if (!message.includes('popup-closed')) {
        setError(message);
      }
    }
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: '0.5rem',
    background: '#faf7f0',
    border: '1px solid #b8860b',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    padding: '0.5rem 0',
    minWidth: '180px',
    zIndex: 100,
  };

  const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem 1rem',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'Cormorant, serif',
    fontSize: '1rem',
    color: '#2c2c54',
  };

  // Signed in — show avatar / name with dropdown
  if (user) {
    return (
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: '1px solid #b8860b',
            borderRadius: '4px',
            padding: '0.25rem 0.75rem',
            cursor: 'pointer',
            fontFamily: 'Cormorant, serif',
            fontSize: '0.95rem',
            color: '#2c2c54',
          }}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              style={{ width: 24, height: 24, borderRadius: '50%' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#b8860b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
              {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
            </span>
          )}
          {user.displayName || user.email || 'Account'}
        </button>
        {menuOpen && (
          <div style={dropdownStyle}>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#666', borderBottom: '1px solid #e8e0d0' }}>
              {user.email}
            </div>
            <button
              onClick={() => { logOut(); setMenuOpen(false); }}
              style={menuItemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = '#ede4d0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  // Signed out — show sign in button with provider picker
  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => !loading && setSignInOpen(!signInOpen)}
        disabled={loading}
        style={{
          background: 'none',
          border: '1px solid #b8860b',
          borderRadius: '4px',
          padding: '0.25rem 0.75rem',
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'Cormorant, serif',
          fontSize: '0.95rem',
          color: loading ? '#999' : '#2c2c54',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Loading...' : 'Sign In'}
      </button>
      {signInOpen && (
        <div style={dropdownStyle}>
          <button
            onClick={() => handleSignIn('google')}
            style={menuItemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#ede4d0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Sign in with Google
          </button>
          <button
            onClick={() => handleSignIn('github')}
            style={menuItemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#ede4d0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Sign in with GitHub
          </button>
          {error && (
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#c0392b' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
