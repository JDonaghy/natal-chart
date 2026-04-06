import React, { useState } from 'react';
import { getSavedCharts, type SavedChart } from '../services/savedCharts';
import { ChartWheel } from './ChartWheel';
import { PlanetLegend } from './PlanetLegend';
import type { ExtendedBirthData } from '../contexts/ChartContext';
import { useResponsive } from '../hooks/useResponsive';
import '../App.css';

const BirthDataSummary: React.FC<{ birthData: ExtendedBirthData }> = ({ birthData }) => (
  <div style={{
    padding: '0.4rem 0',
    fontSize: '0.8rem',
    color: '#666',
    borderBottom: '1px solid #e8e0d0',
    marginBottom: '0.5rem',
    lineHeight: 1.6,
  }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.8rem' }}>
      {birthData.city && <span>{birthData.city}</span>}
      <span>{birthData.latitude.toFixed(2)}, {birthData.longitude.toFixed(2)}</span>
      {birthData.timezone && <span>{birthData.timezone}</span>}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.8rem' }}>
      <span>{new Date(birthData.dateTimeUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      <span>{new Date(birthData.dateTimeUtc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</span>
      <span>{birthData.houseSystem === 'P' ? 'Placidus' : 'Whole Sign'}</span>
    </div>
  </div>
);

export const CompareView: React.FC = () => {
  const [savedCharts] = useState<SavedChart[]>(() => getSavedCharts());
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const { isMobile, isTablet } = useResponsive();

  const leftChart = savedCharts.find(c => c.id === leftId);
  const rightChart = savedCharts.find(c => c.id === rightId);

  if (savedCharts.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Compare Charts</h2>
        <p>No saved charts yet. Calculate a chart and save it to enable comparison.</p>
      </div>
    );
  }

  const chartSize = isTablet ? 450 : 600;

  return (
    <div>
      <h1 style={{ margin: '0 0 0.5rem 0' }}>Compare Charts</h1>

      {/* Chart selectors */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Left Chart</label>
          <select
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">Select a chart...</option>
            {savedCharts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Right Chart</label>
          <select
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">Select a chart...</option>
            {savedCharts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-side or stacked charts */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
          {leftChart ? (
            <>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{leftChart.name}</h3>
              <BirthDataSummary birthData={leftChart.birthData} />
              <ChartWheel chartData={leftChart.chartData} size={chartSize} ascHorizontal={leftChart.birthData?.ascHorizontal} />
              <PlanetLegend chartData={leftChart.chartData} />
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', color: '#888' }}>
              Select a chart
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
          {rightChart ? (
            <>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{rightChart.name}</h3>
              <BirthDataSummary birthData={rightChart.birthData} />
              <ChartWheel chartData={rightChart.chartData} size={chartSize} ascHorizontal={rightChart.birthData?.ascHorizontal} />
              <PlanetLegend chartData={rightChart.chartData} />
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', color: '#888' }}>
              Select a chart
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
