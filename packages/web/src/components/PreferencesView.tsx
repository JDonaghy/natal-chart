import React, { useState, useCallback } from 'react';
import { useChart } from '../contexts/ChartContext';
import { useAuth } from '../contexts/AuthContext';
import { deleteAccount } from '../services/cloudSync';
import { signOut } from '../services/auth';
import { GLYPH_SET_NAMES } from '../utils/astro-glyph-paths';
import { PlanetGlyphIcon, SignGlyphIcon } from './GlyphIcon';
import { THEME_PRESETS, COLOR_GROUPS, getPreset, type ThemeColors } from '../utils/themes';
import { GlyphCustomizer } from './GlyphCustomizer';
import '../App.css';

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '0.5rem',
  color: 'var(--navy)',
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
  const { glyphSet, setGlyphSet, glyphOverrides, setGlyphOverrides, houseSystem, setHouseSystem, ascHorizontal, setAscHorizontal, theme, setTheme, resolvedTheme } = useChart();
  const { user, configured } = useAuth();
  const [showCustomize, setShowCustomize] = useState(!!theme.overrides && Object.keys(theme.overrides).length > 0);
  const [showGlyphCustomize, setShowGlyphCustomize] = useState(Object.keys(glyphOverrides).length > 0);

  const handlePresetChange = useCallback((presetId: string) => {
    setTheme({ presetId, overrides: theme.overrides });
  }, [setTheme, theme.overrides]);

  const handleColorOverride = useCallback((key: keyof ThemeColors, value: string) => {
    const preset = getPreset(theme.presetId);
    const overrides = { ...theme.overrides, [key]: value };
    // Remove override if it matches the preset default
    if (overrides[key] === preset.colors[key]) {
      delete overrides[key];
    }
    setTheme({ presetId: theme.presetId, overrides: Object.keys(overrides).length > 0 ? overrides : undefined });
  }, [setTheme, theme]);

  const handleResetColor = useCallback((key: keyof ThemeColors) => {
    const overrides = { ...theme.overrides };
    delete overrides[key];
    setTheme({ presetId: theme.presetId, overrides: Object.keys(overrides).length > 0 ? overrides : undefined });
  }, [setTheme, theme]);

  const handleResetAll = useCallback(() => {
    setTheme({ presetId: theme.presetId });
    setShowCustomize(false);
  }, [setTheme, theme.presetId]);

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 style={{ fontFamily: "'Cormorant', serif", color: 'var(--navy)', marginBottom: '1.5rem' }}>
        Preferences
      </h2>

      {/* Theme */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Theme</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
          {THEME_PRESETS.map((preset) => {
            const isActive = theme.presetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                style={{
                  padding: '0.6rem',
                  border: isActive ? `2px solid ${preset.colors.accent}` : '1px solid #ccc',
                  borderRadius: '6px',
                  background: preset.colors.background,
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: isActive ? `2px solid ${preset.colors.accent}44` : 'none',
                  outlineOffset: '1px',
                }}
              >
                <div style={{ display: 'flex', gap: '3px', marginBottom: '0.3rem' }}>
                  {[preset.colors.accent, preset.colors.text, preset.colors.elementFire, preset.colors.elementWater].map((c, i) => (
                    <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: isActive ? 'bold' : 'normal', color: preset.colors.text }}>
                  {preset.name}
                </div>
                {isActive && theme.overrides && Object.keys(theme.overrides).length > 0 && (
                  <div
                    onClick={(e) => { e.stopPropagation(); handleResetAll(); }}
                    style={{ fontSize: '0.7rem', color: preset.colors.accent, marginTop: '0.2rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reset to default
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Customize Colors toggle */}
        <div style={{ marginTop: '0.75rem' }}>
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem 0',
              fontSize: '0.9rem',
              color: 'var(--gold)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showCustomize ? 'Hide custom colors' : 'Customize colors…'}
          </button>
        </div>

        {showCustomize && (
          <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--cream)', borderRadius: '6px', border: '1px solid var(--gold)' }}>
            {(['chrome', 'wheel', 'elements'] as const).map((group) => {
              const groupColors = COLOR_GROUPS.filter(g => g.group === group);
              const groupLabel = group === 'chrome' ? 'UI Colors' : group === 'wheel' ? 'Chart Wheel' : 'Element Colors';
              return (
                <div key={group} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--navy)', marginBottom: '0.3rem' }}>{groupLabel}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.4rem' }}>
                    {groupColors.map(({ key, label }) => {
                      const hasOverride = theme.overrides?.[key] !== undefined;
                      const isOpacity = key === 'boundsDecansOpacity';
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isOpacity ? (
                            <input
                              type="range"
                              min="0.05"
                              max="0.60"
                              step="0.05"
                              value={resolvedTheme[key]}
                              onChange={(e) => handleColorOverride(key, e.target.value)}
                              style={{ width: 80, cursor: 'pointer' }}
                            />
                          ) : (
                            <input
                              type="color"
                              value={resolvedTheme[key]}
                              onChange={(e) => handleColorOverride(key, e.target.value)}
                              style={{ width: 28, height: 28, border: '1px solid #ccc', borderRadius: '4px', padding: 0, cursor: 'pointer' }}
                            />
                          )}
                          <span style={{ fontSize: '0.8rem', color: 'var(--dark-blue)', flex: 1 }}>
                            {label}{isOpacity ? ` (${Math.round(parseFloat(resolvedTheme[key]) * 100)}%)` : ''}
                          </span>
                          {hasOverride && (
                            <button
                              onClick={() => handleResetColor(key)}
                              title="Reset to preset default"
                              style={{ background: 'none', border: 'none', padding: '0 0.2rem', fontSize: '0.75rem', color: '#999', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {theme.overrides && Object.keys(theme.overrides).length > 0 && (
              <button
                onClick={handleResetAll}
                style={{
                  background: 'none',
                  border: '1px solid var(--gold)',
                  borderRadius: '4px',
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.85rem',
                  color: 'var(--dark-blue)',
                  cursor: 'pointer',
                }}
              >
                Reset all to preset defaults
              </button>
            )}
          </div>
        )}

        <p style={descStyle}>
          Choose a color theme for the application and chart wheel. Customize individual colors for a personalized look.
        </p>
      </div>

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
          Choose a default glyph style for planet and zodiac symbols. Customize individual glyphs below.
        </p>

        {/* Per-glyph customization */}
        <div style={{ marginTop: '0.75rem' }}>
          <button
            onClick={() => setShowGlyphCustomize(!showGlyphCustomize)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem 0',
              fontSize: '0.9rem',
              color: 'var(--gold)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {showGlyphCustomize ? 'Hide individual glyph picker' : 'Customize individual glyphs…'}
          </button>
        </div>
        {showGlyphCustomize && (
          <div style={{ marginTop: '0.5rem' }}>
            <GlyphCustomizer
              glyphSet={glyphSet}
              overrides={glyphOverrides}
              onOverridesChange={setGlyphOverrides}
            />
          </div>
        )}
      </div>

      {/* Text Size */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Text Size</span>
        <div style={radioGroupStyle}>
          {([['1.15rem', 'Small'], ['1.3rem', 'Medium'], ['1.5rem', 'Large']] as const).map(([value, label]) => (
            <label key={value} style={radioLabelStyle}>
              <input
                type="radio"
                name="fontSize"
                value={value}
                checked={resolvedTheme.fontSize === value}
                onChange={() => handleColorOverride('fontSize', value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p style={descStyle}>
          Adjust the base text size across the application.
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
    border: '1px solid var(--gold)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: "'Cormorant', serif",
    fontSize: '0.95rem',
    background: 'none',
    color: 'var(--navy)',
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
