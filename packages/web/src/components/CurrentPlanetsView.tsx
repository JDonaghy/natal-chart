import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChartResult, BirthData } from '@natal-chart/core';
import { ChartWheel, type ChartWheelHandle } from './ChartWheel';
import { PlanetLegend } from './PlanetLegend';
import { CitySearch } from './CitySearch';
import { type GeocodeResult } from '../services/geocoding';
import { convertToUTC, convertFromUTC } from '../services/timezone';
import { useResponsive } from '../hooks/useResponsive';
import { filterTraditionalPlanets } from '../utils/chart-helpers';
import { useChart } from '../contexts/ChartContext';
import '../App.css';

// Default location: Greenwich, London — used until the user searches a city
const DEFAULT_LAT = 51.4769;
const DEFAULT_LNG = -0.0005;

interface CurrentLocation {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

function nowLocalString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const CurrentPlanetsView: React.FC = () => {
  const [dateStr, setDateStr] = useState(nowLocalString);
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [chartData, setChartData] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAspects, setShowAspects] = useState(true);
  const [showBoundsDecans, setShowBoundsDecans] = useState(false);
  const [traditionalPlanets, setTraditionalPlanets] = useState(false);
  const { glyphSet, glyphOverrides, resolvedTheme } = useChart();
  const chartWheelRef = useRef<ChartWheelHandle>(null);
  const { isMobile, isTablet } = useResponsive();

  const calculate = useCallback(async (dtStr: string, loc: CurrentLocation | null) => {
    setLoading(true);
    setError(null);
    try {
      const { calculateChart } = await import('@natal-chart/core');
      // With a city selected, the typed date/time is that city's local wall
      // clock — convert it to UTC via its timezone. Without one, keep the
      // original behavior: the browser's own local time.
      const [datePart, timePart] = dtStr.split('T');
      const dateTimeUtc = loc && datePart && timePart
        ? convertToUTC(datePart, timePart, loc.timezone)
        : new Date(dtStr);
      const birthData: BirthData = {
        dateTimeUtc,
        latitude: loc?.latitude ?? DEFAULT_LAT,
        longitude: loc?.longitude ?? DEFAULT_LNG,
        houseSystem: 'W',
      };
      const result = await calculateChart(birthData);
      setChartData(result);
    } catch (err) {
      console.error('Failed to calculate current planets:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate on mount
  useEffect(() => {
    calculate(nowLocalString(), null);
  }, [calculate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateStr(value);
    if (value) {
      calculate(value, location);
    }
  };

  const handleNow = () => {
    if (location) {
      const { dateString, timeString } = convertFromUTC(new Date(), location.timezone);
      const localStr = `${dateString}T${timeString.slice(0, 5)}`;
      setDateStr(localStr);
      calculate(localStr, location);
    } else {
      const localStr = nowLocalString();
      setDateStr(localStr);
      calculate(localStr, null);
    }
  };

  const handleSelectCity = (result: GeocodeResult) => {
    if (!result.timezone) {
      setError(`Unable to detect timezone for ${result.formatted}.`);
      return;
    }
    const loc: CurrentLocation = {
      city: result.formatted,
      latitude: result.lat,
      longitude: result.lng,
      timezone: result.timezone,
    };
    setLocation(loc);
    if (dateStr) {
      calculate(dateStr, loc);
    }
  };

  const handleClearCity = () => {
    setLocation(null);
    setCityQuery('');
    if (dateStr) {
      calculate(dateStr, null);
    }
  };

  const chartSize = isTablet ? 600 : 800;

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '0.5rem' : undefined,
      }}>
        <h1 style={{ margin: 0 }}>Current Planets</h1>
      </div>

      {/* Date/time controls */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
      }}>
        <input
          type="datetime-local"
          value={dateStr}
          onChange={handleDateChange}
          style={{
            padding: '0.35rem 0.5rem',
            fontSize: '0.85rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            flex: isMobile ? '1 1 auto' : undefined,
          }}
        />
        <button
          onClick={handleNow}
          disabled={loading}
          style={{
            padding: '0.4rem 0.6rem',
            backgroundColor: '#4A6B8A',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'default' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
          }}
        >
          {loading ? '...' : 'Now'}
        </button>
        <span style={{ fontSize: '0.8rem', color: '#888' }}>
          {location ? location.city : 'Greenwich (51.48°N, 0.00°W)'} · Whole Sign
        </span>
      </div>

      {/* Local city — adjusts planet positions (houses/Ascendant) and interprets
          the date/time above as that city's local clock instead of Greenwich */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        marginBottom: '0.75rem',
        position: 'relative',
        flexWrap: isMobile ? 'wrap' : undefined,
      }}>
        <span style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap' }}>Local city:</span>
        <CitySearch
          value={cityQuery}
          onChange={setCityQuery}
          onSelect={handleSelectCity}
          placeholder={location ? location.city : 'Search city...'}
          compact
          inputWidth={isMobile ? '100%' : '320px'}
        />
        {location && (
          <>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}° ({location.timezone})
            </span>
            <button
              type="button"
              onClick={handleClearCity}
              style={{
                padding: '0.3rem 0.5rem',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Reset to Greenwich
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="card">
          <div className="error"><p>Error: {error}</p></div>
        </div>
      )}

      {loading && !chartData && (
        <div className="card">
          <div className="loading"><p>Calculating planetary positions...</p></div>
        </div>
      )}

      {chartData && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={isMobile
            ? { width: '100%' }
            : { flex: '1 1 0', minWidth: 0, overflow: 'auto' }
          }>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#666' }}>
                <input type="checkbox" checked={showAspects} onChange={(e) => setShowAspects(e.target.checked)} />
                Show aspect lines
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#666' }}>
                <input type="checkbox" checked={showBoundsDecans} onChange={(e) => setShowBoundsDecans(e.target.checked)} />
                Bounds &amp; decans
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#666' }}>
                <input type="checkbox" checked={traditionalPlanets} onChange={(e) => setTraditionalPlanets(e.target.checked)} />
                Traditional planets
              </label>
            </div>
            <ChartWheel ref={chartWheelRef} chartData={traditionalPlanets ? filterTraditionalPlanets(chartData) : chartData} size={chartSize} fixedAnchor={0} showAspects={showAspects} showBoundsDecans={showBoundsDecans} glyphSet={glyphSet} glyphOverrides={glyphOverrides} theme={resolvedTheme} />
          </div>
          <div style={{ width: isMobile ? '100%' : '240px', flexShrink: 0 }}>
            <PlanetLegend chartData={traditionalPlanets ? filterTraditionalPlanets(chartData) : chartData} theme={resolvedTheme} />
          </div>
        </div>
      )}
    </div>
  );
};
