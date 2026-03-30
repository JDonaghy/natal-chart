import React, { useState, useRef } from 'react';
import { useChart } from '../contexts/ChartContext';
import { ChartWheel, type ChartWheelHandle } from './ChartWheel';
import { generateChartPdf } from '../services/pdfExport';
import { buildShareUrl, type ShareData } from '../utils/shareUrl';
import { convertFromUTC } from '../services/timezone';
import '../App.css';

export const ChartView: React.FC = () => {
  const { chartData, birthData, loading, error } = useChart();
  const [activeTab, setActiveTab] = useState<'chart' | 'planets' | 'aspects'>('chart');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const chartWheelRef = useRef<ChartWheelHandle>(null);
  
  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <p>Calculating your natal chart...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card">
        <div className="error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }
  
  const handleDownloadPdf = async () => {
    if (!chartData || pdfLoading) return;
    
    setPdfLoading(true);
    try {
      if (!birthData) {
        throw new Error('Birth data not found. Please calculate a chart first.');
      }
      
      // Get SVG element from chart wheel with retry
      console.debug('PDF export: attempting to get SVG element');
      console.debug('chartWheelRef.current:', chartWheelRef.current);
      let svgElement: SVGElement | null = null;
      let attempts = 0;
      const maxAttempts = 40;
      while (!svgElement && attempts < maxAttempts) {
        svgElement = chartWheelRef.current?.getSvgElement() ?? null;
        console.debug(`Attempt ${attempts + 1}: svgElement =`, svgElement);
        if (!svgElement) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }
      }
      if (!svgElement) {
        console.error('Chart wheel SVG not available after', maxAttempts, 'attempts');
        console.debug('chartWheelRef.current:', chartWheelRef.current);
        if (chartWheelRef.current) {
          console.debug('chartWheelRef.current.getSvgElement():', chartWheelRef.current.getSvgElement());
        }
        throw new Error('Chart wheel SVG not available');
      }
      console.debug('PDF export: SVG element obtained');
      // Validate SVG element
      if (!(svgElement instanceof SVGElement)) {
        throw new Error('Retrieved element is not an SVGElement');
      }
      if (!svgElement.isConnected) {
        console.warn('SVG element is not connected to DOM');
      }
      // Generate PDF
      const pdf = await generateChartPdf(chartData, birthData, svgElement);
      
      // Download PDF
      const fileName = `natal-chart-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert(`Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    if (!birthData) return;

    try {
      // Convert UTC back to local date/time for the share URL
      const dateTimeUtc = new Date(birthData.dateTimeUtc);
      let birthDate: string;
      let birthTime: string;

      if (birthData.timezone) {
        const local = convertFromUTC(dateTimeUtc, birthData.timezone);
        birthDate = local.dateString;
        birthTime = local.timeString;
      } else {
        const iso = dateTimeUtc.toISOString();
        birthDate = iso.slice(0, 10);
        birthTime = iso.slice(11, 19);
      }

      const shareData: ShareData = {
        birthDate,
        birthTime,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone || 'UTC',
        houseSystem: birthData.houseSystem,
      };
      if (birthData.city) {
        shareData.city = birthData.city;
      }

      const url = buildShareUrl(shareData);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share URL:', err);
    }
  };

  if (!chartData) {
    return (
      <div className="card">
        <h2>No Chart Data</h2>
        <p>Please calculate a chart first.</p>
      </div>
    );
  }

  return (
    <div>
       <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1>Your Natal Chart</h1>
        <p style={{ color: '#666' }}>
          Generated based on your birth details
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: pdfLoading ? '#cccccc' : '#b8860b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pdfLoading ? 'default' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
          >
            {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
          </button>
          <button
            onClick={handleShare}
            disabled={!birthData}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: copied ? '#33cc66' : '#2c2c54',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: birthData ? 'pointer' : 'default',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
          >
            {copied ? 'Link Copied!' : 'Share Link'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #ddd',
        marginBottom: '1rem',
      }}>
        <button
          onClick={() => setActiveTab('chart')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'chart' ? '#b8860b' : 'transparent',
            color: activeTab === 'chart' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'chart' ? '2px solid #b8860b' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'chart' ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
        >
          Chart Wheel
        </button>
        <button
          onClick={() => setActiveTab('planets')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'planets' ? '#b8860b' : 'transparent',
            color: activeTab === 'planets' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'planets' ? '2px solid #b8860b' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'planets' ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
        >
          Planet Positions
        </button>
        <button
          onClick={() => setActiveTab('aspects')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: activeTab === 'aspects' ? '#b8860b' : 'transparent',
            color: activeTab === 'aspects' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'aspects' ? '2px solid #b8860b' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'aspects' ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
        >
          Aspects
        </button>
      </div>

      {/* Tab Content - always rendered, hidden via display */}
      <div>
        {/* Chart Wheel Tab */}
        <div style={{ display: activeTab === 'chart' ? 'block' : 'none' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3>Chart Wheel</h3>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem', maxWidth: '100%', overflow: 'auto' }}>
               <ChartWheel ref={chartWheelRef} chartData={chartData} size={800} />
            </div>
          </div>
        </div>

        {/* Planet Positions Tab */}
        <div style={{ display: activeTab === 'planets' ? 'block' : 'none' }}>
          <div className="card">
            <h3>Planet Positions</h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #b8860b' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Planet</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Sign</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Degree</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>House</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Retrograde</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.planets.map((planet, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <span className="glyph" style={{ marginRight: '0.5rem' }}>
                          {getPlanetGlyph(planet.planet)}
                        </span>
                        {formatPlanetName(planet.planet)}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className="glyph" style={{ marginRight: '0.5rem' }}>
                          {getSignGlyph(planet.sign)}
                        </span>
                        {formatSignName(planet.sign)}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {planet.degree}° {planet.minute}′
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {planet.house}
                      </td>
                      <td style={{ padding: '0.5rem', color: planet.retrograde ? '#cc3333' : '#666' }}>
                        {planet.retrograde ? 'R' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {chartData.skippedPlanets && chartData.skippedPlanets.length > 0 && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                backgroundColor: '#fff8e1', 
                border: '1px solid #ffd54f',
                borderRadius: '4px',
                fontSize: '0.9rem',
                color: '#5d4037'
              }}>
                <strong>Note:</strong> The following positions could not be calculated: {' '}
                {chartData.skippedPlanets.map(p => formatPlanetName(p)).join(', ')}.
                {chartData.skippedPlanets.includes('chiron') && ' Chiron requires asteroid ephemeris files.'}
              </div>
            )}
          </div>
        </div>

        {/* Aspects Tab */}
        <div style={{ display: activeTab === 'aspects' ? 'block' : 'none' }}>
          <div className="card">
            <h3>Aspects</h3>
            {chartData.aspects.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #b8860b' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Planets</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Aspect</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Orb</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Applying</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.aspects.map((aspect, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <span className="glyph" style={{ marginRight: '0.25rem' }}>
                            {getPlanetGlyph(aspect.planet1)}
                          </span>
                          {formatPlanetName(aspect.planet1)} – 
                          <span className="glyph" style={{ marginLeft: '0.5rem', marginRight: '0.25rem' }}>
                            {getPlanetGlyph(aspect.planet2)}
                          </span>
                          {formatPlanetName(aspect.planet2)}
                        </td>
                        <td style={{ padding: '0.5rem', color: getAspectColor(aspect.type) }}>
                          {formatAspectName(aspect.type)}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {aspect.orb.toFixed(1)}°
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {aspect.applying ? 'Applying' : 'Separating'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No aspects found within orb limits.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

// Helper functions
function getPlanetGlyph(planet: string): string {
  const glyphs: Record<string, string> = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '♅',
    neptune: '♆',
    pluto: '♇',
    northNode: '☊',
    chiron: '⚷',
  };
  return glyphs[planet] || '○';
}

function getSignGlyph(sign: string): string {
  const glyphs: Record<string, string> = {
    aries: '♈',
    taurus: '♉',
    gemini: '♊',
    cancer: '♋',
    leo: '♌',
    virgo: '♍',
    libra: '♎',
    scorpio: '♏',
    sagittarius: '♐',
    capricorn: '♑',
    aquarius: '♒',
    pisces: '♓',
  };
  return glyphs[sign] || '○';
}

function formatPlanetName(planet: string): string {
  return planet.charAt(0).toUpperCase() + planet.slice(1).replace(/([A-Z])/g, ' $1');
}

function formatSignName(sign: string): string {
  return sign.charAt(0).toUpperCase() + sign.slice(1);
}

function formatAspectName(aspect: string): string {
  return aspect.charAt(0).toUpperCase() + aspect.slice(1);
}

function getAspectColor(aspectType: string): string {
  const colors: Record<string, string> = {
    conjunction: '#333333',
    opposition: '#cc3333',
    trine: '#3366cc',
    square: '#cc6633',
    sextile: '#33cc66',
    quincunx: '#9966cc',
    semiSextile: '#66cccc',
  };
  return colors[aspectType] || '#333333';
}