import React, { useState, useMemo } from 'react';
import { useChart } from '../contexts/ChartContext';
import { ReleasingTimeline } from './ReleasingTimeline';
import {
  calculateLots,
  calculateZodiacalReleasing,
} from '@natal-chart/core';
import type { ZRTimeline, ZRPeriod, LotResult } from '@natal-chart/core';
import '../App.css';

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

export const ReleasingView: React.FC = () => {
  const { chartData, birthData } = useChart();
  const [lot, setLot] = useState<'fortune' | 'spirit'>('fortune');
  const [maxLevels, setMaxLevels] = useState(2);

  // Calculate lots and releasing timeline
  const { lots, timeline } = useMemo(() => {
    if (!chartData || !birthData) return { lots: null, timeline: null };

    const lotsResult = calculateLots(
      chartData.angles.ascendant,
      chartData.planets.find(p => p.planet === 'sun')!.longitude,
      chartData.planets.find(p => p.planet === 'moon')!.longitude,
      chartData.angles.descendant,
    );

    const lotLongitude = lot === 'fortune' ? lotsResult.fortune : lotsResult.spirit;
    const birthDate = new Date(birthData.dateTimeUtc);

    const tl = calculateZodiacalReleasing(lotLongitude, birthDate, maxLevels);
    tl.lot = lot;

    return { lots: lotsResult, timeline: tl };
  }, [chartData, birthData, lot, maxLevels]);

  if (!chartData || !birthData) {
    return (
      <div className="card">
        <h2>Zodiacal Releasing</h2>
        <p>Please calculate a chart first.</p>
      </div>
    );
  }

  if (!lots || !timeline) {
    return (
      <div className="card">
        <h2>Zodiacal Releasing</h2>
        <p>Unable to calculate lots. Ensure Sun and Moon positions are available.</p>
      </div>
    );
  }

  const currentDate = new Date();
  const activePeriods = findActivePeriods(timeline, currentDate);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>Zodiacal Releasing</h1>
      </div>

      {/* Lot summary */}
      <LotSummary lots={lots} />

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '0.75rem 0',
        borderBottom: '1px solid #e8e0d0',
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>Release from:</span>
          <button
            onClick={() => setLot('fortune')}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: lot === 'fortune' ? '#b8860b' : 'transparent',
              color: lot === 'fortune' ? 'white' : '#333',
              border: `1px solid ${lot === 'fortune' ? '#b8860b' : '#ccc'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: lot === 'fortune' ? 'bold' : 'normal',
            }}
          >
            Fortune
          </button>
          <button
            onClick={() => setLot('spirit')}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: lot === 'spirit' ? '#b8860b' : 'transparent',
              color: lot === 'spirit' ? 'white' : '#333',
              border: `1px solid ${lot === 'spirit' ? '#b8860b' : '#ccc'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: lot === 'spirit' ? 'bold' : 'normal',
            }}
          >
            Spirit
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>Levels:</span>
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setMaxLevels(n)}
              style={{
                padding: '0.3rem 0.6rem',
                backgroundColor: maxLevels === n ? '#4A6B8A' : 'transparent',
                color: maxLevels === n ? 'white' : '#333',
                border: `1px solid ${maxLevels === n ? '#4A6B8A' : '#ccc'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                minWidth: '2rem',
              }}
            >
              L{n}
            </button>
          ))}
        </div>
      </div>

      {/* Current period summary */}
      {activePeriods.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Current Periods</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {activePeriods.map((period, i) => (
              <div key={i} style={{
                padding: '0.5rem 1rem',
                backgroundColor: getElementColor(period.element).bg,
                border: `1px solid ${getElementColor(period.element).border}`,
                borderRadius: '6px',
                minWidth: '120px',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                  L{period.level}
                </div>
                <div style={{ fontWeight: 'bold', color: getElementColor(period.element).text }}>
                  <span className="glyph" style={{ marginRight: '0.4rem' }}>
                    {SIGN_GLYPHS[period.sign]}
                  </span>
                  {formatSign(period.sign)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  {formatDate(period.startDate)} — {formatDate(period.endDate)}
                </div>
                {period.isPeak && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#b8860b',
                    fontWeight: 'bold',
                  }}>
                    Peak
                  </span>
                )}
                {period.isLoosingOfBond && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#CC4422',
                    fontWeight: 'bold',
                    marginLeft: '0.5rem',
                  }}>
                    LB
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full timeline */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem' }}>
          Releasing from Lot of {lot === 'fortune' ? 'Fortune' : 'Spirit'} in{' '}
          <span className="glyph">{SIGN_GLYPHS[timeline.lotSign]}</span>{' '}
          {formatSign(timeline.lotSign)}
        </h3>
        <ReleasingTimeline timeline={timeline} currentDate={currentDate} />
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        fontSize: '0.85rem',
        color: '#888',
        borderTop: '1px solid #e8e0d0',
      }}>
        <strong>Legend:</strong>{' '}
        <span style={{ color: '#b8860b', fontWeight: 'bold' }}>Peak</span> = angular to Lot (1st/4th/7th/10th sign) •{' '}
        <span style={{ color: '#CC4422', fontWeight: 'bold' }}>LB</span> = Loosing of the Bond •{' '}
        <span style={{ color: '#4A6B8A' }}>M</span> = modality matches Lot sign •{' '}
        <span style={{ color: '#CC3333' }}>Fire</span>{' '}
        <span style={{ color: '#338833' }}>Earth</span>{' '}
        <span style={{ color: '#AA8800' }}>Air</span>{' '}
        <span style={{ color: '#3366CC' }}>Water</span>
      </div>
    </div>
  );
};

// --- Sub-components ---

interface LotSummaryProps {
  lots: LotResult;
}

const LotSummary: React.FC<LotSummaryProps> = ({ lots }) => {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.4rem 1.2rem',
      padding: '0.5rem 0',
      fontSize: '0.85rem',
      color: '#666',
      borderBottom: '1px solid #e8e0d0',
      marginBottom: '0.5rem',
    }}>
      <span>
        {lots.isDayBirth ? 'Day' : 'Night'} birth
      </span>
      <span>
        Lot of Fortune:{' '}
        <span className="glyph">{SIGN_GLYPHS[lots.fortuneSign]}</span>{' '}
        {formatSign(lots.fortuneSign)} ({lots.fortune.toFixed(1)}°)
      </span>
      <span>
        Lot of Spirit:{' '}
        <span className="glyph">{SIGN_GLYPHS[lots.spiritSign]}</span>{' '}
        {formatSign(lots.spiritSign)} ({lots.spirit.toFixed(1)}°)
      </span>
    </div>
  );
};

// --- Helpers ---

function findActivePeriods(timeline: ZRTimeline, date: Date): ZRPeriod[] {
  const result: ZRPeriod[] = [];
  const target = date.getTime();
  let periods = timeline.periods;
  while (periods.length > 0) {
    const active = periods.find(
      p => target >= p.startDate.getTime() && target < p.endDate.getTime(),
    );
    if (!active) break;
    result.push(active);
    periods = active.subPeriods || [];
  }
  return result;
}

function formatSign(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getElementColor(element: string): { bg: string; text: string; border: string } {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    fire: { bg: '#fff0e8', text: '#CC3333', border: '#CC3333' },
    earth: { bg: '#f0f5e8', text: '#338833', border: '#338833' },
    air: { bg: '#fffff0', text: '#AA8800', border: '#CCAA00' },
    water: { bg: '#e8f0ff', text: '#3366CC', border: '#3366CC' },
  };
  return colors[element] || colors.fire!;
}
