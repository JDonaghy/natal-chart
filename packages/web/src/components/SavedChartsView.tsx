import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChart, type ExtendedBirthData } from '../contexts/ChartContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getSavedCharts,
  getAllSavedChartSummaries,
  renameChart,
  deleteChart,
  shareChart,
  unshareChart,
  loadCloudChart,
  type SavedChartSummary,
  type SavedChart,
} from '../services/savedCharts';
import '../App.css';

const WORKER_URL = import.meta.env.VITE_WORKER_API_URL || '';

export const SavedChartsView: React.FC = () => {
  const { loadChart, calculateChart, setTransitDateStr, setTransitLocation, calculateTransits, setShowAspects, setShowBoundsDecans, setTraditionalPlanets, setGlyphSet } = useChart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [charts, setCharts] = useState<SavedChartSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const refreshCharts = async () => {
    setLoading(true);
    const summaries = await getAllSavedChartSummaries();
    setCharts(summaries);
    setLoading(false);
  };

  useEffect(() => {
    refreshCharts();
  }, [user]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const handleRename = async (chart: SavedChartSummary) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === chart.name) {
      setEditingId(null);
      return;
    }
    setActionLoading(chart.id);
    try {
      await renameChart(chart.id, trimmed, chart.source, chart.cloudId);
      await refreshCharts();
    } catch (err) {
      console.warn('Rename failed:', err);
    }
    setActionLoading(null);
    setEditingId(null);
  };

  const handleDelete = async (chart: SavedChartSummary) => {
    setActionLoading(chart.id);
    try {
      await deleteChart(chart.id, chart.source, chart.cloudId);
      setConfirmDeleteId(null);
      await refreshCharts();
    } catch (err) {
      console.warn('Delete failed:', err);
    }
    setActionLoading(null);
  };

  const handleLoad = async (chart: SavedChartSummary) => {
    setActionLoading(chart.id);
    try {
      if (chart.source === 'local') {
        const localCharts = getSavedCharts();
        const found = localCharts.find((c: SavedChart) => c.id === chart.id);
        if (found) {
          loadChart(found.chartData, found.birthData);
          setShowAspects(found.showAspects ?? true);
          setShowBoundsDecans(found.showBoundsDecans ?? false);
          setTraditionalPlanets(found.traditionalPlanets ?? false);
          if (found.glyphSet) setGlyphSet(found.glyphSet);
          if (found.transitDateStr) {
            setTransitDateStr(found.transitDateStr);
            const loc = found.transitLocation || null;
            setTransitLocation(loc);
            calculateTransits(new Date(found.transitDateStr), loc);
            navigate('/transits');
          } else {
            navigate('/chart');
          }
        }
      } else {
        // Cloud chart — load inputs and recalculate
        const cloudChart = await loadCloudChart(chart.id);
        const bd = cloudChart.birthData as Record<string, unknown>;
        const birthData: ExtendedBirthData = {
          dateTimeUtc: new Date(bd.dateTimeUtc as string),
          latitude: bd.latitude as number,
          longitude: bd.longitude as number,
          houseSystem: (bd.houseSystem as 'P' | 'W') || 'W',
        };
        if (bd.city) birthData.city = bd.city as string;
        if (bd.timezone) birthData.timezone = bd.timezone as string;
        if (typeof bd.ascHorizontal === 'boolean') birthData.ascHorizontal = bd.ascHorizontal;
        await calculateChart(birthData);

        if (cloudChart.viewFlags) {
          const vf = cloudChart.viewFlags;
          if (typeof vf.showAspects === 'boolean') setShowAspects(vf.showAspects);
          if (typeof vf.showBoundsDecans === 'boolean') setShowBoundsDecans(vf.showBoundsDecans);
          if (typeof vf.traditionalPlanets === 'boolean') setTraditionalPlanets(vf.traditionalPlanets);
          if (typeof vf.glyphSet === 'string') setGlyphSet(vf.glyphSet);
        }

        if (cloudChart.transitData) {
          const td = cloudChart.transitData as Record<string, unknown>;
          const transitDateStr = td.transitDateStr as string;
          setTransitDateStr(transitDateStr);
          const loc = td.transitLocation as { city: string; latitude: number; longitude: number; timezone: string } | null;
          setTransitLocation(loc);
          calculateTransits(new Date(transitDateStr), loc);
          navigate('/transits');
        } else {
          navigate('/chart');
        }
      }
    } catch (err) {
      console.warn('Load failed:', err);
    }
    setActionLoading(null);
  };

  const handleShare = async (chart: SavedChartSummary) => {
    setActionLoading(chart.id);
    try {
      if (chart.shareToken) {
        await unshareChart(chart.id);
      } else {
        await shareChart(chart.id);
      }
      await refreshCharts();
    } catch (err) {
      console.warn('Share toggle failed:', err);
    }
    setActionLoading(null);
  };

  const copyShareLink = (token: string, chartId: string) => {
    const shareBase = WORKER_URL.replace('/api', '');
    const url = `${shareBase}/shared/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(chartId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.25rem 0.6rem',
    border: '1px solid #b8860b',
    borderRadius: '3px',
    background: 'none',
    cursor: 'pointer',
    fontFamily: "'Cormorant', serif",
    fontSize: '0.85rem',
    color: '#2c2c54',
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '0.1rem 0.4rem',
    borderRadius: '3px',
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    background: color,
    color: '#fff',
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading charts...</p>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div style={{ maxWidth: '600px' }}>
        <h2 style={{ fontFamily: "'Cormorant', serif", color: '#2c2c54', marginBottom: '1rem' }}>My Charts</h2>
        <p style={{ color: '#666' }}>No saved charts yet. Calculate a chart and save it from the Natal Chart or Transit Chart views.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <h2 style={{ fontFamily: "'Cormorant', serif", color: '#2c2c54', marginBottom: '1rem' }}>My Charts</h2>
      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
        {charts.length} chart{charts.length !== 1 ? 's' : ''} saved
        {user ? ' (syncing to cloud)' : ' (local only — sign in to sync)'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {charts.map(chart => (
          <div
            key={`${chart.source}-${chart.id}`}
            style={{
              border: '1px solid #e8e0d0',
              borderRadius: '4px',
              padding: '0.75rem 1rem',
              background: '#faf7f0',
            }}
          >
            {/* Top row: name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              {editingId === chart.id ? (
                <input
                  ref={editRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(chart);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => handleRename(chart)}
                  style={{
                    flex: 1,
                    fontFamily: "'Cormorant', serif",
                    fontSize: '1.05rem',
                    fontWeight: 'bold',
                    color: '#2c2c54',
                    border: '1px solid #b8860b',
                    borderRadius: '3px',
                    padding: '0.15rem 0.4rem',
                    background: '#fff',
                  }}
                />
              ) : (
                <span
                  style={{ fontWeight: 'bold', color: '#2c2c54', fontSize: '1.05rem', cursor: 'pointer' }}
                  onClick={() => { setEditingId(chart.id); setEditName(chart.name); }}
                  title="Click to rename"
                >
                  {chart.name}
                </span>
              )}
              <span style={badgeStyle(
                chart.source === 'synced' ? '#27ae60' : chart.source === 'cloud' ? '#3498db' : '#95a5a6'
              )}>
                {chart.source === 'synced' ? 'Synced' : chart.source === 'cloud' ? 'Cloud' : 'Local'}
              </span>
              {chart.isTransit && (
                <span style={badgeStyle('#8e44ad')}>Transit</span>
              )}
            </div>

            {/* Meta row */}
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
              {chart.city && <span>{chart.city} &middot; </span>}
              {new Date(chart.savedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>

            {/* Share link row */}
            {chart.shareToken && (
              <div style={{ fontSize: '0.8rem', color: '#27ae60', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Shared</span>
                <button
                  onClick={() => copyShareLink(chart.shareToken!, chart.id)}
                  style={{ ...buttonStyle, fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}
                >
                  {copiedId === chart.id ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleLoad(chart)}
                disabled={actionLoading === chart.id}
                style={{ ...buttonStyle, background: '#b8860b', color: '#fff' }}
              >
                {actionLoading === chart.id ? 'Loading...' : 'Open'}
              </button>

              <button
                onClick={() => { setEditingId(chart.id); setEditName(chart.name); }}
                disabled={actionLoading === chart.id}
                style={buttonStyle}
              >
                Rename
              </button>

              {(chart.source === 'cloud' || chart.source === 'synced') && (
                <button
                  onClick={() => handleShare({ ...chart, id: chart.cloudId || chart.id })}
                  disabled={actionLoading === chart.id}
                  style={buttonStyle}
                >
                  {chart.shareToken ? 'Unshare' : 'Share'}
                </button>
              )}

              {confirmDeleteId === chart.id ? (
                <>
                  <button
                    onClick={() => handleDelete(chart)}
                    disabled={actionLoading === chart.id}
                    style={{ ...buttonStyle, color: '#c0392b', borderColor: '#c0392b' }}
                  >
                    {actionLoading === chart.id ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    style={{ ...buttonStyle, color: '#666' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(chart.id)}
                  disabled={actionLoading === chart.id}
                  style={{ ...buttonStyle, color: '#c0392b', borderColor: '#c0392b' }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
