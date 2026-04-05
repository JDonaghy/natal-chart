import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChart, type TransitLocation } from '../contexts/ChartContext';
import { ChartWheel, type ChartWheelHandle } from './ChartWheel';
import { PlanetLegend } from './PlanetLegend';
import { generateChartPdf } from '../services/pdfExport';
import { buildShareUrl, type ShareData } from '../utils/shareUrl';
import { convertFromUTC } from '../services/timezone';
import { saveChart, getSavedCharts, type SavedChart } from '../services/savedCharts';
import { type GeocodeResult } from '../services/geocoding';
import { CitySearch } from './CitySearch';
import { AspectGrid } from './AspectGrid';
import { TransitAspectGrid } from './TransitAspectGrid';
import { formatPlanetName, formatSignName, filterTraditionalPlanets, filterTraditionalTransits } from '../utils/chart-helpers';
import { PlanetGlyphIcon, SignGlyphIcon } from './GlyphIcon';
import { useResponsive } from '../hooks/useResponsive';
import { TransitAnimationControls } from './TransitAnimationControls';
import '../App.css';

export const TransitView: React.FC = () => {
  const navigate = useNavigate();
  const { chartData, birthData, loading, error, loadChart, transitData, transitLoading, calculateTransits, clearTransits, transitDateStr, setTransitDateStr, transitLocation, setTransitLocation, showAspects, setShowAspects, traditionalPlanets, setTraditionalPlanets, glyphSet, setGlyphSet, ascHorizontal } = useChart();
  const [activeTab, setActiveTab] = useState<'chart' | 'planets' | 'aspects'>('chart');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [transitCityQuery, setTransitCityQuery] = useState(transitLocation?.city || birthData?.city || '');
  const chartWheelRef = useRef<ChartWheelHandle>(null);
  const initialized = useRef(false);
  const [animPlaying, setAnimPlaying] = useState(false);
  const displayData = useMemo(() => {
    if (!chartData) return null;
    return traditionalPlanets ? filterTraditionalPlanets(chartData) : chartData;
  }, [chartData, traditionalPlanets]);
  const displayTransit = useMemo(() => {
    if (!transitData) return null;
    return traditionalPlanets ? filterTraditionalTransits(transitData) : transitData;
  }, [transitData, traditionalPlanets]);
  const { isMobile, isTablet } = useResponsive();

  // Auto-initialize transits on mount if no transit date is set
  useEffect(() => {
    if (initialized.current || !chartData) return;
    initialized.current = true;

    if (!transitDateStr) {
      const now = new Date();
      const localStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setTransitDateStr(localStr);
      calculateTransits(now);
    } else if (!transitData) {
      calculateTransits(new Date(transitDateStr));
    }
  }, [chartData, transitDateStr, transitData, setTransitDateStr, calculateTransits]);

  const handleSelectTransitCity = (result: GeocodeResult) => {
    const loc: TransitLocation = {
      city: result.formatted,
      latitude: result.lat,
      longitude: result.lng,
      timezone: result.timezone,
    };
    setTransitLocation(loc);
    if (transitDateStr) {
      calculateTransits(new Date(transitDateStr), loc);
    }
  };

  const handleLoadSaved = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const charts = getSavedCharts();
    const found = charts.find((c: SavedChart) => c.id === id);
    if (found) {
      loadChart(found.chartData, found.birthData);
      setShowAspects(found.showAspects ?? true);
      setTraditionalPlanets(found.traditionalPlanets ?? false);
      if (found.glyphSet) setGlyphSet(found.glyphSet);
      if (found.transitDateStr) {
        setTransitDateStr(found.transitDateStr);
        const loc = found.transitLocation || null;
        setTransitLocation(loc);
        if (loc) setTransitCityQuery(loc.city);
        calculateTransits(new Date(found.transitDateStr), loc);
      } else {
        // No transit data in saved chart — navigate to natal view
        setTransitLocation(null);
        setTransitCityQuery('');
        clearTransits();
        navigate('/chart');
      }
    }
    e.target.value = '';
  };

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

      let svgElement: SVGElement | null = null;
      let attempts = 0;
      const maxAttempts = 40;
      while (!svgElement && attempts < maxAttempts) {
        svgElement = chartWheelRef.current?.getSvgElement() ?? null;
        if (!svgElement) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }
      }
      if (!svgElement) {
        throw new Error('Chart wheel SVG not available');
      }
      if (!(svgElement instanceof SVGElement)) {
        throw new Error('Retrieved element is not an SVGElement');
      }
      const pdf = await generateChartPdf(chartData, birthData, svgElement, transitData ?? undefined, transitLocation ?? undefined, undefined, glyphSet);

      const fileName = `transit-chart-${new Date().toISOString().slice(0, 10)}.pdf`;
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
      if (transitDateStr) {
        shareData.transitDate = transitDateStr;
        if (transitLocation) {
          shareData.transitCity = transitLocation.city;
          shareData.transitLat = transitLocation.latitude;
          shareData.transitLng = transitLocation.longitude;
          shareData.transitTz = transitLocation.timezone;
        }
      }
      shareData.showAspects = showAspects;
      shareData.traditionalPlanets = traditionalPlanets;
      shareData.glyphSet = glyphSet;

      const url = buildShareUrl(shareData);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share URL:', err);
    }
  };

  const handleTransitDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTransitDateStr(value);
    if (value) {
      calculateTransits(new Date(value));
    }
  };

  const handleTransitNow = () => {
    const now = new Date();
    const localStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setTransitDateStr(localStr);
    calculateTransits(now);
  };

  const handleAnimationStep = useCallback((newDateStr: string, newDate: Date) => {
    setTransitDateStr(newDateStr);
    calculateTransits(newDate);
  }, [setTransitDateStr, calculateTransits]);

  const handleSave = () => {
    if (!chartData || !birthData) return;
    const name = prompt('Name for this chart:', birthData.city || 'My Chart');
    if (!name) return;
    saveChart(name, chartData, birthData, transitDateStr || undefined, transitLocation ?? undefined, { showAspects, traditionalPlanets, glyphSet });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!chartData) {
    return (
      <div className="card">
        <h2>No Chart Data</h2>
        <p>Please calculate a chart first.</p>
      </div>
    );
  }

  // Responsive chart size — on mobile, render at full 800 internal size
  // for maximum detail; the SVG viewBox + width:100% scales it to fit.
  const chartSize = isTablet ? 600 : 800;

  return (
    <div>
       {/* Header: title + buttons */}
       <div style={{
         display: 'flex',
         alignItems: isMobile ? 'flex-start' : 'center',
         justifyContent: 'space-between',
         marginBottom: '0.5rem',
         flexDirection: isMobile ? 'column' : 'row',
         gap: isMobile ? '0.5rem' : undefined,
       }}>
        <h1 style={{ margin: 0 }}>Transit Chart</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            onChange={handleLoadSaved}
            defaultValue=""
            style={{ padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px' }}
          >
            <option value="">Load saved...</option>
            {getSavedCharts().map((c: SavedChart) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: pdfLoading ? '#cccccc' : '#b8860b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pdfLoading ? 'default' : 'pointer',
              fontSize: '0.85rem',
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
              padding: '0.4rem 0.75rem',
              backgroundColor: copied ? '#33cc66' : '#2c2c54',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: birthData ? 'pointer' : 'default',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
          >
            {copied ? 'Link Copied!' : 'Share Link'}
          </button>
          <button
            onClick={handleSave}
            disabled={!chartData || !birthData}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: saved ? '#33cc66' : '#338833',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: chartData && birthData ? 'pointer' : 'default',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
          >
            {saved ? 'Saved!' : 'Save Chart'}
          </button>
        </div>
      </div>

      {/* Transit date/time controls + animation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        marginBottom: '0.5rem',
        flexWrap: 'wrap',
      }}>
        <input
          type="datetime-local"
          value={transitDateStr}
          onChange={handleTransitDateChange}
          style={{
            padding: '0.35rem 0.5rem',
            fontSize: '0.85rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: isMobile ? undefined : '13rem',
            flex: isMobile ? '1 1 auto' : '0 0 auto',
          }}
        />
        {!animPlaying && (
          <button
            onClick={handleTransitNow}
            disabled={transitLoading}
            style={{
              padding: '0.4rem 0.6rem',
              backgroundColor: '#4A6B8A',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: transitLoading ? 'default' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold',
            }}
          >
            {transitLoading ? '...' : 'Now'}
          </button>
        )}
        {!isMobile && (
          <TransitAnimationControls
            transitDateStr={transitDateStr}
            onStep={handleAnimationStep}
            onPlayingChange={setAnimPlaying}
            isMobile={false}
            inline
          />
        )}
      </div>
      {isMobile && (
        <TransitAnimationControls
          transitDateStr={transitDateStr}
          onStep={handleAnimationStep}
          onPlayingChange={setAnimPlaying}
          isMobile
        />
      )}

      {/* Transit city search */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        marginBottom: '0.5rem',
        position: 'relative',
        flexWrap: isMobile ? 'wrap' : undefined,
      }}>
        <span style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap' }}>Transit city:</span>
        <CitySearch
          value={transitCityQuery}
          onChange={setTransitCityQuery}
          onSelect={handleSelectTransitCity}
          placeholder={transitLocation ? transitLocation.city : birthData?.city || 'Search city...'}
          compact
          inputWidth={isMobile ? '100%' : '320px'}
        />
        {transitLocation && (
          <span style={{ fontSize: '0.8rem', color: '#888' }}>
            {transitLocation.latitude.toFixed(2)}°, {transitLocation.longitude.toFixed(2)}° ({transitLocation.timezone})
          </span>
        )}
      </div>

      {/* Birth data summary */}
      {birthData && (
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
          {birthData.city && <span>{birthData.city}</span>}
          <span>{new Date(birthData.dateTimeUtc).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>{new Date(birthData.dateTimeUtc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</span>
          <span>{birthData.latitude.toFixed(2)}°, {birthData.longitude.toFixed(2)}°</span>
          {birthData.timezone && <span>{birthData.timezone}</span>}
          <span>{birthData.houseSystem === 'P' ? 'Placidus' : 'Whole Sign'}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #ddd',
        marginBottom: '1rem',
      }}>
        <button
          onClick={() => setActiveTab('chart')}
          style={{
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: activeTab === 'chart' ? '#b8860b' : 'transparent',
            color: activeTab === 'chart' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'chart' ? '2px solid #b8860b' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: activeTab === 'chart' ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
        >
          Chart Wheel
        </button>
        <button
          onClick={() => setActiveTab('planets')}
          style={{
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: activeTab === 'planets' ? '#b8860b' : 'transparent',
            color: activeTab === 'planets' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'planets' ? '2px solid #b8860b' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: activeTab === 'planets' ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
        >
          Planets
        </button>
        <button
          onClick={() => setActiveTab('aspects')}
          style={{
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            backgroundColor: activeTab === 'aspects' ? '#b8860b' : 'transparent',
            color: activeTab === 'aspects' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'aspects' ? '2px solid #b8860b' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: isMobile ? '0.9rem' : '1rem',
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
        <div style={{
          display: activeTab === 'chart' ? 'flex' : 'none',
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
                <input type="checkbox" checked={traditionalPlanets} onChange={(e) => setTraditionalPlanets(e.target.checked)} />
                Traditional planets
              </label>
            </div>
            <ChartWheel ref={chartWheelRef} chartData={displayData!} transitData={displayTransit ?? undefined} size={chartSize} ascHorizontal={ascHorizontal} showAspects={showAspects} glyphSet={glyphSet} />
          </div>
          <div style={{ width: isMobile ? '100%' : '240px', flexShrink: 0 }}>
            <PlanetLegend
              chartData={displayData!}
              transitData={displayTransit ?? undefined}
              birthDateLabel={birthData ? new Date(birthData.dateTimeUtc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined}
              transitDateLabel={transitDateStr ? new Date(transitDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined}
            />
          </div>
        </div>

        {/* Planet Positions Tab */}
        <div style={{ display: activeTab === 'planets' ? 'block' : 'none' }}>
          <div className="card">
            <h3>Planet Positions</h3>
            <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
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
                  {displayData!.planets.map((planet, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <PlanetGlyphIcon planet={planet.planet} style={{ marginRight: '0.5rem' }} />
                        {formatPlanetName(planet.planet)}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <SignGlyphIcon sign={planet.sign} style={{ marginRight: '0.5rem' }} />
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
          {/* Natal Aspect Grid */}
          <div className="card">
            <h3>Natal Aspects</h3>
            {displayData!.aspects.length > 0 ? (
              <AspectGrid chartData={displayData!} />
            ) : (
              <p>No natal aspects found within orb limits.</p>
            )}
          </div>

          {/* Transit Aspect Grid */}
          {displayTransit && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>Natal-to-Transit Aspects</h3>
              <TransitAspectGrid chartData={displayData!} transitData={displayTransit} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
