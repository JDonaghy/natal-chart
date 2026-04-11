import React, { useCallback } from 'react';
import { getVariantsForPlanet, getVariantsForSign, type GlyphVariant } from '../utils/glyphs/index';

const PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
  'uranus', 'neptune', 'pluto', 'northNode', 'chiron', 'lilith', 'fortune',
];

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function formatName(key: string): string {
  if (key === 'northNode') return 'Node';
  if (key === 'fortune') return 'Fortune';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

interface GlyphPickerProps {
  entity: string;
  variants: GlyphVariant[];
  currentSourceId: string | undefined;
  baseSet: string;
  onChange: (entity: string, sourceId: string | undefined) => void;
}

const GlyphPicker: React.FC<GlyphPickerProps> = ({ entity, variants, currentSourceId, baseSet, onChange }) => {
  const effectiveSource = currentSourceId ?? baseSet;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
      <span style={{ width: 70, fontSize: '0.82rem', color: 'var(--dark-blue)' }}>{formatName(entity)}</span>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {variants.map((v) => {
          const isActive = v.sourceId === effectiveSource;
          return (
            <button
              key={v.sourceId}
              title={v.displayName}
              onClick={() => onChange(entity, v.sourceId === baseSet ? undefined : v.sourceId)}
              style={{
                width: 32,
                height: 32,
                padding: 2,
                border: isActive ? '2px solid var(--gold)' : '1px solid #ccc',
                borderRadius: '4px',
                background: isActive ? 'var(--cream)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width={22} height={22}
                viewBox={v.path.viewBox}
                style={{ display: 'block' }}
              >
                <path d={v.path.d} fill="var(--dark-blue)" />
              </svg>
            </button>
          );
        })}
      </div>
      {currentSourceId && (
        <button
          onClick={() => onChange(entity, undefined)}
          title="Reset to default"
          style={{ background: 'none', border: 'none', padding: '0 0.2rem', fontSize: '0.7rem', color: '#999', cursor: 'pointer' }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

interface GlyphCustomizerProps {
  glyphSet: string;
  overrides: Record<string, string>;
  onOverridesChange: (overrides: Record<string, string>) => void;
}

export const GlyphCustomizer: React.FC<GlyphCustomizerProps> = ({ glyphSet, overrides, onOverridesChange }) => {
  const handleChange = useCallback((entity: string, sourceId: string | undefined) => {
    const next = { ...overrides };
    if (sourceId === undefined) {
      delete next[entity];
    } else {
      next[entity] = sourceId;
    }
    onOverridesChange(next);
  }, [overrides, onOverridesChange]);

  const handleResetAll = useCallback(() => {
    onOverridesChange({});
  }, [onOverridesChange]);

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div style={{ padding: '0.75rem', background: 'var(--cream)', borderRadius: '6px', border: '1px solid var(--gold)' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--navy)', marginBottom: '0.3rem' }}>
          Planets
        </div>
        {PLANETS.map((planet) => {
          const variants = getVariantsForPlanet(planet);
          if (variants.length <= 1) return null;
          return (
            <GlyphPicker
              key={planet}
              entity={planet}
              variants={variants}
              currentSourceId={overrides[planet]}
              baseSet={glyphSet}
              onChange={handleChange}
            />
          );
        })}
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--navy)', marginBottom: '0.3rem' }}>
          Zodiac Signs
        </div>
        {SIGNS.map((sign) => {
          const variants = getVariantsForSign(sign);
          if (variants.length <= 1) return null;
          return (
            <GlyphPicker
              key={sign}
              entity={sign}
              variants={variants}
              currentSourceId={overrides[sign]}
              baseSet={glyphSet}
              onChange={handleChange}
            />
          );
        })}
      </div>

      {hasOverrides && (
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
          Reset all to default
        </button>
      )}
    </div>
  );
};
