import React, { useState } from 'react';
import { useChart } from '../contexts/ChartContext';
import { useAuth } from '../contexts/AuthContext';
import { deleteAccount } from '../services/cloudSync';
import { signOut } from '../services/auth';
import { GLYPH_SET_NAMES } from '../utils/astro-glyph-paths';
import { PlanetGlyphIcon, SignGlyphIcon } from './GlyphIcon';
import '../App.css';

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '0.5rem',
  color: '#2c2c54',
  fontFamily: "'Cormorant', serif",
  fontSize: '1.1rem',
};

const descStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#666',
  marginTop: '0.25rem',
};

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  cursor: 'pointer',
};

const PREVIEW_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const PREVIEW_SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo'];

export const PreferencesView: React.FC = () => {
  const { glyphSet, setGlyphSet, houseSystem, setHouseSystem, ascHorizontal, setAscHorizontal } = useChart();
  const { user, configured } = useAuth();

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 style={{ fontFamily: "'Cormorant', serif", color: '#2c2c54', marginBottom: '1.5rem' }}>
        Preferences
      </h2>

      {/* Glyph Set */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Glyph Style</span>
        <div style={radioGroupStyle}>
          {Object.entries(GLYPH_SET_NAMES).map(([key, name]) => (
            <label key={key} style={radioLabelStyle}>
              <input
                type="radio"
                name="glyphSet"
                value={key}
                checked={glyphSet === key}
                onChange={() => setGlyphSet(key)}
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {PREVIEW_PLANETS.map((p) => (
            <PlanetGlyphIcon key={p} planet={p} size="1.4em" color="#5a4a3a" />
          ))}
          <span style={{ margin: '0 0.25rem', color: '#ccc' }}>|</span>
          {PREVIEW_SIGNS.map((s) => (
            <SignGlyphIcon key={s} sign={s} size="1.4em" color="#5a4a3a" />
          ))}
        </div>
        <p style={descStyle}>
          Choose between Classic (DejaVu Sans) and Modern (Noto Sans Symbols) glyph styles for planet and zodiac symbols.
        </p>
      </div>

      {/* House System */}
      <div style={sectionStyle}>
        <span style={labelStyle}>House System</span>
        <div style={radioGroupStyle}>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              name="houseSystem"
              value="W"
              checked={houseSystem === 'W'}
              onChange={() => setHouseSystem('W')}
            />
            <span>Whole Sign</span>
          </label>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              name="houseSystem"
              value="P"
              checked={houseSystem === 'P'}
              onChange={() => setHouseSystem('P')}
            />
            <span>Placidus</span>
          </label>
        </div>
        <p style={descStyle}>
          Default house system for new chart calculations. Existing charts keep their original house system.
        </p>
      </div>

      {/* ASC Horizontal */}
      <div style={sectionStyle}>
        <label style={{ ...radioLabelStyle, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={ascHorizontal}
            onChange={(e) => setAscHorizontal(e.target.checked)}
          />
          <span style={{ ...labelStyle, margin: 0 }}>ASC Horizontal</span>
        </label>
        <p style={descStyle}>
          When enabled, the Ascendant is always positioned at 9 o'clock on the chart wheel. When disabled, the 1st house cusp is at 9 o'clock.
        </p>
      </div>

      {/* Account Section */}
      {configured && (
        <div style={{ borderTop: '1px solid #e8e0d0', paddingTop: '1.5rem', marginTop: '1rem' }}>
          <span style={labelStyle}>Account</span>
          {user ? (
            <AccountSection />
          ) : (
            <p style={{ ...descStyle, marginTop: 0 }}>
              Sign in to sync your preferences and saved charts across devices.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const AccountSection: React.FC = () => {
  const { user, logOut } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
    } catch (err) {
      console.error('Failed to delete account data:', err);
      alert('Failed to delete account data. Please try again.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.4rem 1rem',
    border: '1px solid #b8860b',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: "'Cormorant', serif",
    fontSize: '0.95rem',
    background: 'none',
    color: '#2c2c54',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt=""
            style={{ width: 36, height: 36, borderRadius: '50%' }}
            referrerPolicy="no-referrer"
          />
        )}
        <div>
          <div style={{ fontWeight: 'bold', color: '#2c2c54' }}>{user.displayName}</div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>{user.email}</div>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
        Your preferences are syncing to the cloud. Saved charts are backed up automatically when you save them.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => logOut()} style={buttonStyle}>
          Sign Out
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ ...buttonStyle, color: '#c0392b', borderColor: '#c0392b' }}
          >
            Delete My Data
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#c0392b' }}>
              This will permanently delete all your cloud data.
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ ...buttonStyle, background: '#c0392b', color: '#fff', borderColor: '#c0392b' }}
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              style={{ ...buttonStyle, color: '#666' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
