import React, { useState } from 'react';
import { getSavedCharts } from '../services/savedCharts';
import { createCloudChart } from '../services/cloudSync';

interface CloudMigrationModalProps {
  onComplete: () => void;
}

export const CloudMigrationModal: React.FC<CloudMigrationModalProps> = ({ onComplete }) => {
  const localCharts = getSavedCharts();
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (localCharts.length === 0) {
    // Nothing to migrate — dismiss immediately
    onComplete();
    return null;
  }

  const handleMigrate = async () => {
    setMigrating(true);
    setError(null);
    let uploaded = 0;

    for (const chart of localCharts) {
      try {
        const dateTimeUtc = chart.birthData.dateTimeUtc instanceof Date
          ? chart.birthData.dateTimeUtc.toISOString()
          : String(chart.birthData.dateTimeUtc);

        await createCloudChart({
          name: chart.name,
          birthData: {
            dateTimeUtc,
            latitude: chart.birthData.latitude,
            longitude: chart.birthData.longitude,
            houseSystem: chart.birthData.houseSystem,
            city: chart.birthData.city,
            timezone: chart.birthData.timezone,
            ascHorizontal: chart.birthData.ascHorizontal,
          },
          viewFlags: {
            showAspects: chart.showAspects,
            showBoundsDecans: chart.showBoundsDecans,
            traditionalPlanets: chart.traditionalPlanets,
            glyphSet: chart.glyphSet,
          },
          transitData: chart.transitDateStr ? {
            transitDateStr: chart.transitDateStr,
            transitLocation: chart.transitLocation ?? null,
          } : undefined,
        });
        uploaded++;
        setProgress(uploaded);
      } catch (err) {
        console.warn(`Failed to migrate chart "${chart.name}":`, err);
      }
    }

    if (uploaded === 0) {
      setError('Failed to upload charts. You can try again later from Preferences.');
    }

    setMigrating(false);
    onComplete();
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    background: '#faf7f0',
    border: '1px solid #b8860b',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '420px',
    width: '90%',
    fontFamily: "'Cormorant', serif",
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1.25rem',
    border: '1px solid #b8860b',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: "'Cormorant', serif",
    fontSize: '1rem',
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: '0 0 1rem', color: '#2c2c54' }}>
          Import Saved Charts
        </h3>
        <p style={{ color: '#444', lineHeight: 1.5 }}>
          You have <strong>{localCharts.length}</strong> chart{localCharts.length > 1 ? 's' : ''} saved
          in this browser. Would you like to upload {localCharts.length > 1 ? 'them' : 'it'} to your
          account so {localCharts.length > 1 ? 'they sync' : 'it syncs'} across devices?
        </p>

        {migrating && (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Uploading... {progress} / {localCharts.length}
          </p>
        )}

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.9rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            onClick={onComplete}
            disabled={migrating}
            style={{ ...buttonStyle, background: 'none', color: '#666' }}
          >
            Skip
          </button>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            style={{ ...buttonStyle, background: '#b8860b', color: '#fff' }}
          >
            {migrating ? 'Uploading...' : 'Upload to Cloud'}
          </button>
        </div>
      </div>
    </div>
  );
};
