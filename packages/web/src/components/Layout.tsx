import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive';
import { LoginButton } from './LoginButton';
import '../App.css';

// Build version injected by Vite
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

interface LayoutProps {
  children: React.ReactNode;
}

const navLinkStyle = ({ isActive }: { isActive: boolean }) =>
  isActive ? { fontWeight: 'bold' as const, textDecoration: 'underline' as const } : {};

const HamburgerIcon: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => (
  <button
    onClick={onClick}
    aria-label={open ? 'Close menu' : 'Open menu'}
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '0.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}
  >
    <span style={{
      display: 'block', width: '22px', height: '2px', backgroundColor: '#2c2c54',
      transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none',
      transition: 'transform 0.2s',
    }} />
    <span style={{
      display: 'block', width: '22px', height: '2px', backgroundColor: '#2c2c54',
      opacity: open ? 0 : 1,
      transition: 'opacity 0.2s',
    }} />
    <span style={{
      display: 'block', width: '22px', height: '2px', backgroundColor: '#2c2c54',
      transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
      transition: 'transform 0.2s',
    }} />
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isMobile } = useResponsive();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = (
    <>
      <li><NavLink to="/" end style={navLinkStyle} onClick={() => setMenuOpen(false)}>Calculate</NavLink></li>
      <li><NavLink to="/chart" style={navLinkStyle} onClick={() => setMenuOpen(false)}>Natal Chart</NavLink></li>
      <li><NavLink to="/transits" style={navLinkStyle} onClick={() => setMenuOpen(false)}>Transit Chart</NavLink></li>
      <li><NavLink to="/current" style={navLinkStyle} onClick={() => setMenuOpen(false)}>Current Planets</NavLink></li>
      <li><NavLink to="/compare" style={navLinkStyle} onClick={() => setMenuOpen(false)}>Compare</NavLink></li>
      <li><NavLink to="/releasing" style={navLinkStyle} onClick={() => setMenuOpen(false)}>Releasing</NavLink></li>
      <li><NavLink to="/charts" style={navLinkStyle} onClick={() => setMenuOpen(false)}>My Charts</NavLink></li>
      <li><NavLink to="/preferences" style={navLinkStyle} onClick={() => setMenuOpen(false)}>Preferences</NavLink></li>
    </>
  );

  const padding = isMobile ? '0.5rem 0.75rem' : '0.5rem 2rem';
  const maxWidth = isMobile ? '100%' : '1200px';

  return (
    <div className="app">
      <header style={{ padding, borderBottom: '1px solid #b8860b' }}>
        <div className="container" style={{ maxWidth, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1 style={{ margin: 0, color: '#2c2c54', fontSize: isMobile ? '1.2rem' : undefined }}>
                <span className="glyph" style={{ marginRight: '0.5rem' }}>☉</span>
                Natal Chart
              </h1>
            </Link>
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LoginButton />
                <HamburgerIcon open={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <nav>
                  <ul style={{ display: 'flex', listStyle: 'none', gap: '1.5rem' }}>
                    {navLinks}
                  </ul>
                </nav>
                <LoginButton />
              </div>
            )}
          </div>
          {/* Mobile dropdown nav */}
          {isMobile && menuOpen && (
            <nav style={{ paddingTop: '0.5rem' }}>
              <ul style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '0.5rem 0',
                margin: 0,
                borderTop: '1px solid #e8e0d0',
              }}>
                {navLinks}
              </ul>
            </nav>
          )}
        </div>
      </header>

      <main style={{ padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 2rem', flex: 1 }}>
        <div className="container" style={{ maxWidth, margin: '0 auto' }}>
          {children}
        </div>
      </main>

      <footer className="p-4" style={{
        borderTop: '1px solid #b8860b',
        backgroundColor: '#ede4d0',
        fontSize: '0.9rem',
        textAlign: 'center',
        padding: isMobile ? '0.75rem' : undefined,
      }}>
        <div className="container" style={{ maxWidth, margin: '0 auto' }}>
          <p style={{ margin: 0 }}>
            Natal Chart Calculator • Powered by Swiss Ephemeris WASM •
            <span className="glyph" style={{ marginLeft: '0.5rem' }}>☉ ☽ ♂ ♃ ♀ ☿ ♄</span>
          </p>
           <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
             Calculations performed entirely in your browser • Sign in to sync across devices
           </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: '#888', fontFamily: 'monospace' }}>
              Build: {__APP_VERSION__ || 'dev'} • {__BUILD_TIME__ ? new Date(__BUILD_TIME__).toLocaleDateString() : 'development'}
            </p>
        </div>
      </footer>

    </div>
  );
};
