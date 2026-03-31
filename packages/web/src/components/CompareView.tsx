import React, { useState } from 'react';
import { getSavedCharts, deleteSavedChart, type SavedChart } from '../services/savedCharts';
import { ChartWheel } from './ChartWheel';
import { PlanetLegend } from './PlanetLegend';
import type { ExtendedBirthData } from '../contexts/ChartContext';
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
      <span>{birthData.latitude.toFixed(2)}°, {birthData.longitude.toFixed(2)}°</span>
      {birthData.timezone && <span>{birthData.timezone}</span>}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.8rem' }}>
      <span>{new Date(birthData.dateTimeUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      <span>{new Date(birthData.dateTimeUtc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</span>
      <span>{birthData.houseSystem === 'P' ? 'Placidus' : birthData.houseSystem === 'W' ? 'Whole Sign' : 'Koch'}</span>
    </div>
  </div>
);

export const CompareView: React.FC = () => {
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>(() => getSavedCharts());
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');

  const handleDelete = (id: string) => {
    deleteSavedChart(id);
    setSavedCharts(getSavedCharts());
    if (leftId === id) setLeftId('');
    if (rightId === id) setRightId('');
  };

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

  return (
    <div>
      <h1 style={{ margin: '0 0 0.5rem 0' }}>Compare Charts</h1>

      {/* Chart selectors */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
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

      {/* Side-by-side charts */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {leftChart ? (
            <>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{leftChart.name}</h3>
              <BirthDataSummary birthData={leftChart.birthData} />
              <ChartWheel chartData={leftChart.chartData} size={600} />
              <PlanetLegend chartData={leftChart.chartData} />
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', color: '#888' }}>
              Select a chart
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {rightChart ? (
            <>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{rightChart.name}</h3>
              <BirthDataSummary birthData={rightChart.birthData} />
              <ChartWheel chartData={rightChart.chartData} size={600} />
              <PlanetLegend chartData={rightChart.chartData} />
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', color: '#888' }}>
              Select a chart
            </div>
          )}
        </div>
      </div>

      {/* Saved charts list */}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid #b8860b', paddingTop: '1rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Saved Charts</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #b8860b' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>City</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Date</th>
              <th style={{ textAlign: 'right', padding: '0.4rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {savedCharts.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.4rem' }}>{c.name}</td>
                <td style={{ padding: '0.4rem', color: '#666' }}>{c.birthData.city || '—'}</td>
                <td style={{ padding: '0.4rem', color: '#666' }}>
                  {new Date(c.savedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#cc4422',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
