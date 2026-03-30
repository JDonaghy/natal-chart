import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChart, type ExtendedBirthData } from '../contexts/ChartContext';
import { type GeocodeResult, isRealGeocodingAvailable, isCoordinateQuery, parseCoordinates } from '../services/geocoding';
import { CitySearch } from './CitySearch';
import { convertToUTC, convertFromUTC } from '../services/timezone';
import '../App.css';

// Get IANA timezone list from the runtime
const timezoneList: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone');
  } catch {
    // Fallback for older browsers
    return [
      'UTC',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Anchorage', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
      'America/Mexico_City', 'America/Toronto', 'America/Vancouver',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
      'Europe/Moscow', 'Europe/Istanbul', 'Europe/Athens', 'Europe/Amsterdam',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
      'Asia/Seoul', 'Asia/Bangkok', 'Asia/Hong_Kong', 'Asia/Taipei',
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
      'Pacific/Auckland', 'Pacific/Honolulu',
      'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
    ];
  }
})();

export const BirthDataForm: React.FC = () => {
  const navigate = useNavigate();
  const { calculateChart } = useChart();
  const [loading, setLoading] = useState(false);
  const [timezoneError, setTimezoneError] = useState<string | null>(null);
  const [utcDisplay, setUtcDisplay] = useState<string | null>(null);
  const [utcError, setUtcError] = useState<string | null>(null);
  const [tzFilter, setTzFilter] = useState('');
  const [showTzDropdown, setShowTzDropdown] = useState(false);
  const tzDropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    birthDate: '1990-06-15',
    birthTime: '12:00',
    timezone: '',
    city: '',
    latitude: 51.5074,
    longitude: -0.1278,
    houseSystem: 'P' as 'P' | 'W' | 'K',
  });
  
  // Save form state to localStorage
  const saveFormState = useCallback(() => {
    try {
      localStorage.setItem('natal-chart-form-state', JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to save form state:', error);
    }
  }, [formData]);
  
  // Auto-save form state with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFormState();
    }, 1000); // Debounce 1 second
    
    return () => clearTimeout(timeoutId);
  }, [formData, saveFormState]);
  
  // Detect if current city input is in coordinate format
  const isCoordinatesInput = useMemo(() => {
    return isCoordinateQuery(formData.city);
  }, [formData.city]);
  
  // Parse coordinates from input for OpenStreetMap link
  const parsedCoordinates = useMemo(() => {
    if (!isCoordinatesInput) return null;
    return parseCoordinates(formData.city);
  }, [formData.city, isCoordinatesInput]);
  
  // Generate OpenStreetMap URL for coordinate validation
  const openStreetMapUrl = useMemo(() => {
    if (!parsedCoordinates) return null;
    const { lat, lng } = parsedCoordinates;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`;
  }, [parsedCoordinates]);

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    return !!formData.timezone && !!formData.birthDate && !!formData.birthTime;
  }, [formData.timezone, formData.birthDate, formData.birthTime]);

  // Auto-update latitude/longitude when coordinate input is detected
  useEffect(() => {
    if (!parsedCoordinates) return;
    
    const { lat, lng } = parsedCoordinates;
    setFormData(prev => {
      const epsilon = 0.0001;
      const latChanged = Math.abs(prev.latitude - lat) > epsilon;
      const lngChanged = Math.abs(prev.longitude - lng) > epsilon;
      
      if (latChanged || lngChanged) {
        return {
          ...prev,
          latitude: lat,
          longitude: lng,
        };
      }
      return prev;
    });
  }, [parsedCoordinates]);
  
  // Load saved form state and birth data from localStorage on mount
  useEffect(() => {
    try {
      // Load form state (unsaved changes)
      const savedFormState = localStorage.getItem('natal-chart-form-state');
      let loadedData: Partial<typeof formData> = {};
      
      if (savedFormState) {
        try {
          const parsed = JSON.parse(savedFormState);
          // Validate basic structure
          if (parsed && typeof parsed === 'object') {
            loadedData = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse saved form state:', e);
        }
      }
      
      // Load birth data (from last chart calculation - takes precedence)
      const savedBirthData = localStorage.getItem('natal-chart-birth-data');
      if (savedBirthData) {
        const data = JSON.parse(savedBirthData) as ExtendedBirthData;
        
        // Validate required fields exist
        if (data.dateTimeUtc && typeof data.latitude === 'number' && typeof data.longitude === 'number' && data.houseSystem) {
          // Convert date string back to Date object
          const dateTimeUtc = new Date(data.dateTimeUtc);
          if (!isNaN(dateTimeUtc.getTime())) {
            // Convert UTC back to local time using saved timezone
            if (data.timezone) {
              try {
                const { dateString, timeString } = convertFromUTC(dateTimeUtc, data.timezone);
                loadedData.birthDate = dateString;
                // Preserve full time string including seconds
                loadedData.birthTime = timeString;
              } catch (conversionError) {
                console.warn('Failed to convert UTC back to local time:', conversionError);
                // Fallback: use UTC date/time
                const isoString = dateTimeUtc.toISOString();
                const [datePart, timePart] = isoString.split('T');
                loadedData.birthDate = datePart || '1990-06-15';
                // Extract HH:MM:SS from ISO time (removing milliseconds and Z)
                let timeWithoutMs = '12:00:00';
                if (timePart) {
                  // Remove milliseconds if present, and remove trailing Z
                  const timeNoMs = timePart.split('.')[0] || '12:00:00';
                  timeWithoutMs = timeNoMs.endsWith('Z') ? timeNoMs.slice(0, -1) : timeNoMs;
                }
                loadedData.birthTime = timeWithoutMs;
              }
            } else {
              // No timezone saved, use UTC
              const isoString = dateTimeUtc.toISOString();
              const [datePart, timePart] = isoString.split('T');
              loadedData.birthDate = datePart || '1990-06-15';
              // Extract HH:MM:SS from ISO time (removing milliseconds and Z)
              let timeWithoutMs = '12:00:00';
              if (timePart) {
                // Remove milliseconds if present, and remove trailing Z
                const timeNoMs = timePart.split('.')[0] || '12:00:00';
                timeWithoutMs = timeNoMs.endsWith('Z') ? timeNoMs.slice(0, -1) : timeNoMs;
              }
              loadedData.birthTime = timeWithoutMs;
            }
            loadedData.latitude = data.latitude;
            loadedData.longitude = data.longitude;
            loadedData.houseSystem = data.houseSystem;
            
            // Use saved city if available, otherwise format coordinates
            if (data.city && data.city !== 'Saved location') {
              loadedData.city = data.city;
            } else {
              loadedData.city = `${data.latitude.toFixed(7)}, ${data.longitude.toFixed(7)}`;
            }
            
            // Use saved timezone if available
            if (data.timezone) {
              loadedData.timezone = data.timezone;
            }
          }
        }
      }
      
      // Update form with loaded data (only if we have something to load)
      if (Object.keys(loadedData).length > 0) {
        setFormData(prev => ({
          ...prev,
          birthDate: loadedData.birthDate ?? prev.birthDate,
          birthTime: loadedData.birthTime ?? prev.birthTime,
          latitude: loadedData.latitude ?? prev.latitude,
          longitude: loadedData.longitude ?? prev.longitude,
          houseSystem: loadedData.houseSystem ?? prev.houseSystem,
          city: loadedData.city ?? prev.city,
          timezone: loadedData.timezone ?? prev.timezone,
        }));
      }
    } catch (error) {
      console.warn('Failed to load saved data:', error);
    }
  }, []);
  
  // Close timezone dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(event.target as Node)) {
        setShowTzDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate UTC display when birth date, time, or timezone changes
  useEffect(() => {
    if (!formData.birthDate || !formData.birthTime || !formData.timezone) {
      setUtcDisplay(null);
      setUtcError(null);
      return;
    }

    try {
      const utcDate = convertToUTC(formData.birthDate, formData.birthTime, formData.timezone);
      if (isNaN(utcDate.getTime())) {
        throw new Error('Invalid date after conversion');
      }
      
      // Format: YYYY-MM-DD HH:MM:SS UTC
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const hours = String(utcDate.getUTCHours()).padStart(2, '0');
      const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0');
      
      setUtcDisplay(`${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`);
      setUtcError(null);
    } catch (error) {
      setUtcDisplay(null);
      setUtcError(`UTC conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [formData.birthDate, formData.birthTime, formData.timezone]);
  
  const handleSelectCity = (result: GeocodeResult) => {
    if (!result.timezone) {
      setTimezoneError(`Unable to detect timezone for ${result.formatted}. Please manually enter coordinates with a known timezone.`);
      setFormData(prev => ({
        ...prev,
        city: result.formatted,
        latitude: result.lat,
        longitude: result.lng,
        timezone: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        city: result.formatted,
        latitude: result.lat,
        longitude: result.lng,
        timezone: result.timezone,
      }));
      setTimezoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimezoneError(null);
    
    // Validate required fields
    if (!formData.timezone) {
      setTimezoneError('Please search and select a birth city to detect the timezone.');
      setLoading(false);
      return;
    }
    
    try {
      // Convert form data to BirthData format with timezone conversion
      let birthDateTime: Date;
      
      try {
        birthDateTime = convertToUTC(formData.birthDate, formData.birthTime, formData.timezone);
        
        // Validate the resulting date
        if (isNaN(birthDateTime.getTime())) {
          throw new Error('Invalid date after timezone conversion');
        }
        
        console.log('Converted birth time:', {
          input: `${formData.birthDate}T${formData.birthTime}`,
          timezone: formData.timezone,
          utc: birthDateTime.toISOString(),
        });

        // Sanity check: year should be plausible (1900-2100)
        const year = birthDateTime.getUTCFullYear();
        if (year < 1900 || year > 2100) {
          console.warn(`Suspicious year after conversion: ${year}`, {
            input: `${formData.birthDate}T${formData.birthTime}`,
            timezone: formData.timezone,
            utc: birthDateTime.toISOString(),
          });
        }
      } catch (convError) {
        console.error('Timezone conversion failed:', convError);
        // Fallback: assume the time is in UTC
        birthDateTime = new Date(`${formData.birthDate}T${formData.birthTime}:00Z`);
        console.warn('Using fallback UTC conversion');
      }
      
      await calculateChart({
        dateTimeUtc: birthDateTime,
        latitude: formData.latitude,
        longitude: formData.longitude,
        houseSystem: formData.houseSystem,
        city: formData.city,
        timezone: formData.timezone,
      });
      
      navigate('/chart');
    } catch (error) {
      console.error('Error calculating chart:', error);
      alert('Failed to calculate chart. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'city') {
      setTimezoneError(null);
      // Only clear timezone when switching away from coordinates to city name
      if (!isCoordinateQuery(value)) {
        setFormData(prev => ({ ...prev, timezone: '' }));
      }
    }
  };
  
  const formatCoordinate = (coord: number, isLatitude: boolean) => {
    const direction = isLatitude 
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'W');
    const absCoord = Math.abs(coord);
    return `${absCoord.toFixed(7)}° ${direction}`;
  };
  
  return (
    <div className="card">
      <h2 className="text-center">Calculate Your Natal Chart</h2>
      <p className="text-center mb-4" style={{ color: '#666' }}>
        Enter your birth details to generate your personal birth chart
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Place of Birth */}
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label htmlFor="city" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Place of Birth
            </label>
            <CitySearch
              value={formData.city}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, city: value }));
                setTimezoneError(null);
                if (!isCoordinateQuery(value)) {
                  setFormData(prev => ({ ...prev, timezone: '' }));
                }
              }}
              onSelect={handleSelectCity}
              placeholder="Search for a city or enter coordinates (e.g., London, UK or 51.5074, -0.1278)..."
            />
            
            {/* Selected coordinates */}
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
              Coordinates: {formatCoordinate(formData.latitude, true)}, {formatCoordinate(formData.longitude, false)}
              {formData.city && !isCoordinatesInput && ` • ${formData.city}`}
              <span style={{
                display: 'inline-block',
                marginLeft: '0.5rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '3px',
                fontSize: '0.75rem',
                backgroundColor: isRealGeocodingAvailable() ? '#e8f5e9' : '#fff3e0',
                color: isRealGeocodingAvailable() ? '#2e7d32' : '#f57c00',
                border: `1px solid ${isRealGeocodingAvailable() ? '#c8e6c9' : '#ffe0b2'}`,
                fontWeight: 'bold'
              }}>
                {isRealGeocodingAvailable() ? '🌍 Live API' : '🧪 Mock Data'}
              </span>
             </p>
             
             {/* OpenStreetMap validation link for coordinate inputs */}
             {isCoordinatesInput && openStreetMapUrl && (
               <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem', marginBottom: 0 }}>
                 <a 
                   href={openStreetMapUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   title="Validate these coordinates on OpenStreetMap (opens in new tab)"
                   style={{ 
                     color: '#1a73e8', 
                     textDecoration: 'none',
                     borderBottom: '1px dotted #1a73e8'
                   }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.textDecoration = 'underline';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.textDecoration = 'none';
                   }}
                 >
                   📍 Validate coordinates on OpenStreetMap
                 </a>
                 <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                   (opens in new tab)
                 </span>
               </p>
             )}
           </div>
          
          {/* Birth Date (Year / Month / Day) */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Birth Date
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                aria-label="Year"
                value={formData.birthDate.split('-')[0] || '1990'}
                onChange={(e) => {
                  const [, m, d] = formData.birthDate.split('-');
                  setFormData(prev => ({ ...prev, birthDate: `${e.target.value}-${m}-${d}` }));
                }}
                required
                style={{ flex: '1.2' }}
              >
                {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                aria-label="Month"
                value={formData.birthDate.split('-')[1] || '01'}
                onChange={(e) => {
                  const [y, , d] = formData.birthDate.split('-');
                  // Clamp day to max days in new month
                  const maxDay = new Date(Number(y), Number(e.target.value), 0).getDate();
                  const clampedDay = Math.min(Number(d), maxDay);
                  setFormData(prev => ({ ...prev, birthDate: `${y}-${e.target.value}-${String(clampedDay).padStart(2, '0')}` }));
                }}
                required
                style={{ flex: '1.5' }}
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December',
                ].map((name, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>{name}</option>
                ))}
              </select>
              <select
                aria-label="Day"
                value={formData.birthDate.split('-')[2] || '01'}
                onChange={(e) => {
                  const [y, m] = formData.birthDate.split('-');
                  setFormData(prev => ({ ...prev, birthDate: `${y}-${m}-${e.target.value}` }));
                }}
                required
                style={{ flex: '0.8' }}
              >
                {Array.from(
                  { length: new Date(
                    Number(formData.birthDate.split('-')[0]),
                    Number(formData.birthDate.split('-')[1]),
                    0
                  ).getDate() },
                  (_, i) => {
                    const day = String(i + 1).padStart(2, '0');
                    return <option key={day} value={day}>{i + 1}</option>;
                  }
                )}
              </select>
            </div>
          </div>
          
          {/* Birth Time */}
          <div>
            <label htmlFor="birthTime" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Birth Time
            </label>
            <input
              id="birthTime"
              name="birthTime"
              type="time"
              value={formData.birthTime}
              onChange={handleInputChange}
              required
              step="1"
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Timezone Display / Selector */}
          <div>
            <label htmlFor="timezone" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Birth Timezone
            </label>
            {isCoordinatesInput ? (
              <div ref={tzDropdownRef} style={{ position: 'relative' }}>
                <input
                  id="timezone"
                  type="text"
                  value={showTzDropdown ? tzFilter : formData.timezone}
                  placeholder="Type to filter timezones..."
                  onFocus={() => {
                    setShowTzDropdown(true);
                    setTzFilter('');
                  }}
                  onChange={(e) => {
                    setTzFilter(e.target.value);
                    setShowTzDropdown(true);
                  }}
                  style={{ width: '100%' }}
                  autoComplete="off"
                />
                {showTzDropdown && (() => {
                  const lowerFilter = tzFilter.toLowerCase();
                  const filtered = timezoneList.filter(tz => tz.toLowerCase().includes(lowerFilter));
                  return filtered.length > 0 ? (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '2px',
                    }}>
                      {filtered.slice(0, 50).map(tz => (
                        <button
                          key={tz}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, timezone: tz }));
                            setShowTzDropdown(false);
                            setTzFilter('');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.75rem',
                            textAlign: 'left',
                            border: 'none',
                            backgroundColor: tz === formData.timezone ? '#f8f4e8' : 'transparent',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            fontSize: '0.9rem',
                            color: '#333',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f4e8'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = tz === formData.timezone ? '#f8f4e8' : 'transparent'; }}
                        >
                          {tz}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                  Select the timezone for these coordinates
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f8f4e8',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.95rem',
                  color: formData.timezone ? '#333' : '#888',
                }}>
                  {formData.timezone ? (
                    <>
                      <span style={{ fontWeight: 'bold' }}>{formData.timezone}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                        (detected from city)
                      </span>
                    </>
                  ) : (
                    'Not yet detected — please search and select a city above'
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                  Timezone is automatically determined from the birth city
                </p>
              </>
            )}
            {timezoneError && (
              <p style={{ fontSize: '0.85rem', color: '#d32f2f', marginTop: '0.5rem' }}>
                {timezoneError}
              </p>
            )}
           </div>
           
           {/* House System */}
           <div style={{ gridColumn: 'span 2' }}>
             <label htmlFor="houseSystem" style={{ display: 'block', marginBottom: '0.5rem' }}>
               House System
             </label>
             <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input
                   type="radio"
                   name="houseSystem"
                   value="P"
                   checked={formData.houseSystem === 'P'}
                   onChange={handleInputChange}
                 />
                 <span>Placidus (Most Common)</span>
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input
                   type="radio"
                   name="houseSystem"
                   value="W"
                   checked={formData.houseSystem === 'W'}
                   onChange={handleInputChange}
                 />
                 <span>Whole Sign</span>
               </label>
               <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <input
                   type="radio"
                   name="houseSystem"
                   value="K"
                   checked={formData.houseSystem === 'K'}
                   onChange={handleInputChange}
                 />
                 <span>Koch</span>
               </label>
             </div>
             <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
               Placidus is the standard in Western astrology. Whole Sign is used in Hellenistic and Vedic traditions.
             </p>
            </div>
         </div>
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button 
            type="submit" 
            disabled={loading || !isFormValid}
            title={!isFormValid ? 'Please search and select a birth city to detect the timezone' : ''}
            style={{ 
              padding: '1rem 3rem', 
              fontSize: '1.2rem',
              backgroundColor: (loading || !isFormValid) ? '#ccc' : '#b8860b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Calculating...' : 'Calculate Natal Chart'}
          </button>
          {loading && (
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
              Calculating planetary positions... (This may take a few seconds)
            </p>
          )}
        </div>
        
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#f0ead6',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: 0 }}>
            <strong>Privacy Note:</strong> All calculations are performed entirely in your browser using WebAssembly. 
            Your birth data never leaves your device. City searches use mock data for now.
          </p>
        </div>
        
        {/* UTC Note */}
        {utcDisplay && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f0f7ff',
            border: '1px solid #b3d4ff',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#003366',
            textAlign: 'center',
          }}>
            <span style={{ fontWeight: 'bold' }}>Calculated UTC Time:</span> {utcDisplay}
            <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>
              (converted from local time using {formData.timezone})
            </span>
          </div>
        )}
        {utcError && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#d32f2f',
            textAlign: 'center',
          }}>
            <span style={{ fontWeight: 'bold' }}>UTC Conversion Error:</span> {utcError}
          </div>
        )}
      </form>
    </div>
  );
};