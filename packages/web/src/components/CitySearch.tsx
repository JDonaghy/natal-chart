import React, { useState, useRef, useEffect } from 'react';
import { geocodeCity, type GeocodeResult } from '../services/geocoding';

interface CitySearchProps {
  onSelect: (result: GeocodeResult) => void;
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  /** Compact mode for inline use (transit city row) */
  compact?: boolean | undefined;
  /** Width of the input field */
  inputWidth?: string | undefined;
}

export const CitySearch: React.FC<CitySearchProps> = ({
  onSelect,
  value: controlledValue,
  onChange: controlledOnChange,
  placeholder = 'Search city...',
  compact = false,
  inputWidth,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Support controlled or uncontrolled mode
  const query = controlledValue !== undefined ? controlledValue : internalValue;
  const setQuery = controlledOnChange || setInternalValue;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await geocodeCity(query.trim());
      setResults(res);
      setShowResults(res.length > 0);
      if (res.length === 0) {
        setError('No results found. Try a different city name.');
      }
    } catch (err) {
      console.error('City search error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setError('Network error — check your internet connection.');
      } else if (message.includes('429') || message.includes('rate')) {
        setError('Too many requests — please wait a moment and try again.');
      } else {
        setError(`Search failed: ${message}`);
      }
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (result: GeocodeResult) => {
    // Set query text BEFORE onSelect so that the parent's onChange
    // (which may clear timezone) fires before onSelect sets it.
    setQuery(result.formatted);
    onSelect(result);
    setShowResults(false);
    setResults([]);
    setError(null);
  };

  const formatCoord = (coord: number, isLat: boolean): string => {
    const dir = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${Math.abs(coord).toFixed(4)}° ${dir}`;
  };

  const inputStyle: React.CSSProperties = compact
    ? {
        padding: '0.35rem 0.5rem',
        fontSize: '0.85rem',
        borderRadius: '4px',
        border: '1px solid #ccc',
        width: inputWidth || '220px',
      }
    : { flex: 1, ...(inputWidth ? { width: inputWidth } : {}) };

  const buttonStyle: React.CSSProperties = compact
    ? {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#4A6B8A',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: searching || !query.trim() ? 'default' : 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
      }
    : { whiteSpace: 'nowrap', minWidth: '80px' };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: compact ? 'inline-block' : 'block' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(false);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder={placeholder}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          style={buttonStyle}
        >
          {searching ? (compact ? '...' : 'Searching...') : 'Search'}
        </button>
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: '300px',
          overflowY: 'auto',
          width: compact ? '320px' : '100%',
          marginTop: '2px',
        }}>
          {results.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(result)}
              style={{
                width: '100%',
                padding: compact ? '0.5rem 0.75rem' : '0.75rem 1rem',
                textAlign: 'left',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                fontSize: compact ? '0.85rem' : undefined,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f4e8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {!compact && result.name && (
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  {result.name}, {result.country}
                </div>
              )}
              <div style={{ color: compact ? '#333' : '#666', fontSize: compact ? undefined : '0.9rem' }}>
                {result.formatted}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                {formatCoord(result.lat, true)}, {formatCoord(result.lng, false)}
                {result.timezone && ` — ${result.timezone}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && !compact && (
        <p style={{ fontSize: '0.9rem', color: '#d32f2f', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </div>
  );
};
