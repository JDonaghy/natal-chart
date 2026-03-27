import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app">
      <header className="p-4" style={{ borderBottom: '1px solid #b8860b' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1 style={{ margin: 0, color: '#2c2c54' }}>
                <span className="glyph" style={{ marginRight: '0.5rem' }}>☉</span>
                Natal Chart
              </h1>
            </Link>
            <nav>
              <ul style={{ display: 'flex', listStyle: 'none', gap: '1.5rem' }}>
                <li><Link to="/">Calculate</Link></li>
                <li><Link to="/chart">View Chart</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="p-4" style={{ flex: 1 }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
      
      <footer className="p-4" style={{ 
        borderTop: '1px solid #b8860b', 
        backgroundColor: '#ede4d0',
        fontSize: '0.9rem',
        textAlign: 'center'
      }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ margin: 0 }}>
            Natal Chart Calculator • Powered by Swiss Ephemeris WASM • 
            <span className="glyph" style={{ marginLeft: '0.5rem' }}>☉ ☽ ♂ ♃ ♀ ☿ ♄</span>
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
            Calculations performed entirely in your browser • Your birth data never leaves your device
          </p>
        </div>
      </footer>
    </div>
  );
};