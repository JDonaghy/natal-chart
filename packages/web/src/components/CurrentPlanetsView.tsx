import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChartResult, BirthData } from '@natal-chart/core';
import { ChartWheel, type ChartWheelHandle } from './ChartWheel';
import { PlanetLegend } from './PlanetLegend';
import { useResponsive } from '../hooks/useResponsive';
import '../App.css';

// Default location: Greenwich, London
const DEFAULT_LAT = 51.4769;
const DEFAULT_LNG = -0.0005;

function nowLocalString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const CurrentPlanetsView: React.FC = () => {
  const [dateStr, setDateStr] = useState(nowLocalString);
  const [chartData, setChartData] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAspects, setShowAspects] = useState(true);
  const [showBoundsDecans, setShowBoundsDecans] = useState(false);
  const chartWheelRef = useRef<ChartWheelHandle>(null);
  const { isMobile, isTablet } = useResponsive();

  const calculate = useCallback(async (dateTimeUtc: Date) => {
    setLoading(true);
    setError(null);
    try {
      const { calculateChart } = await import('@natal-chart/core');
      const birthData: BirthData = {
        dateTimeUtc,
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
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
    calculate(new Date());
  }, [calculate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateStr(value);
    if (value) {
      calculate(new Date(value));
    }
  };

  const handleNow = () => {
    const now = new Date();
    setDateStr(nowLocalString());
    calculate(now);
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
          Greenwich (51.48°N, 0.00°W) · Whole Sign
        </span>
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
            <ChartWheel ref={chartWheelRef} chartData={chartData} size={chartSize} fixedAnchor={0} showAspects={showAspects} showBoundsDecans={showBoundsDecans} />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#666' }}>
                <input type="checkbox" checked={showAspects} onChange={(e) => setShowAspects(e.target.checked)} />
                Show aspect lines
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: '#666' }}>
                <input type="checkbox" checked={showBoundsDecans} onChange={(e) => setShowBoundsDecans(e.target.checked)} />
                Bounds &amp; decans
              </label>
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '240px', flexShrink: 0 }}>
            <PlanetLegend chartData={chartData} />
          </div>
        </div>
      )}
    </div>
  );
};
