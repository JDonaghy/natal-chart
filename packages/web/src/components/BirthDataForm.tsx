import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChart } from '../contexts/ChartContext';
import { geocodeCity, type GeocodeResult, isRealGeocodingAvailable } from '../services/geocoding';
import { convertToUTC, COMMON_TIMEZONES } from '../services/timezone';
import '../App.css';

export const BirthDataForm: React.FC = () => {
  const navigate = useNavigate();
  const { calculateChart } = useChart();
  const [loading, setLoading] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [geocodingResults, setGeocodingResults] = useState<GeocodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    birthDate: '1990-06-15',
    birthTime: '12:00',
    timezone: 'UTC',
    city: 'London, UK',
    latitude: 51.5074,
    longitude: -0.1278,
    houseSystem: 'P' as 'P' | 'W' | 'K',
  });
  
  // Load saved birth data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('natal-chart-birth-data');
      if (saved) {
        const data = JSON.parse(saved);
        // Convert date string back to Date object
        data.dateTimeUtc = new Date(data.dateTimeUtc);
        // Update form with saved data
        setFormData(prev => ({
          ...prev,
          birthDate: data.dateTimeUtc.toISOString().split('T')[0],
          birthTime: data.dateTimeUtc.toISOString().split('T')[1].substring(0, 5),
          latitude: data.latitude,
          longitude: data.longitude,
          houseSystem: data.houseSystem,
          city: 'Saved location', // We don't store city name, just coords
        }));
      }
    } catch (error) {
      console.warn('Failed to load saved birth data:', error);
    }
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleCitySearch = async () => {
    if (!formData.city.trim()) return;
    
    setGeocodingLoading(true);
    setGeocodingError(null);
    setGeocodingResults([]);
    
    try {
      const results = await geocodeCity(formData.city);
      setGeocodingResults(results);
      setShowResults(true);
      
      if (results.length === 0) {
        setGeocodingError('No results found. Try a different city name.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodingError('Failed to search for city. Please try again.');
    } finally {
      setGeocodingLoading(false);
    }
  };
  
  const handleSelectResult = (result: GeocodeResult) => {
    setFormData(prev => ({
      ...prev,
      city: result.formatted,
      latitude: result.lat,
      longitude: result.lng,
    }));
    setGeocodingResults([]);
    setShowResults(false);
    setGeocodingError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
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
    
    // Clear geocoding results when city input changes
    if (name === 'city') {
      setGeocodingResults([]);
      setShowResults(false);
      setGeocodingError(null);
    }
  };
  
  const formatCoordinate = (coord: number, isLatitude: boolean) => {
    const direction = isLatitude 
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'W');
    const absCoord = Math.abs(coord);
    return `${absCoord.toFixed(4)}° ${direction}`;
  };
  
  return (
    <div className="card">
      <h2 className="text-center">Calculate Your Natal Chart</h2>
      <p className="text-center mb-4" style={{ color: '#666' }}>
        Enter your birth details to generate your personal birth chart
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Birth Date */}
          <div>
            <label htmlFor="birthDate" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Birth Date
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleInputChange}
              required
              style={{ width: '100%' }}
            />
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
          
          {/* Timezone */}
          <div>
            <label htmlFor="timezone" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Birth Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              style={{ width: '100%' }}
              required
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
              Select the timezone where you were born (important for accurate chart)
            </p>
          </div>
          
          {/* City Search */}
          <div style={{ gridColumn: 'span 2', position: 'relative' }} ref={dropdownRef}>
            <label htmlFor="city" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Birth City
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Search for a city (e.g., London, UK)..."
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCitySearch();
                  }
                }}
              />
              <button 
                type="button" 
                onClick={handleCitySearch}
                disabled={geocodingLoading || !formData.city.trim()}
                style={{ whiteSpace: 'nowrap', minWidth: '80px' }}
              >
                {geocodingLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {/* Geocoding results dropdown */}
            {showResults && geocodingResults.length > 0 && (
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
                maxHeight: '300px',
                overflowY: 'auto',
                marginTop: '2px',
              }}>
                {geocodingResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f4e8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#333' }}>
                      {result.name}, {result.country}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {result.formatted}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                      {formatCoordinate(result.lat, true)}, {formatCoordinate(result.lng, false)}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Status messages */}
            {geocodingError && (
              <p style={{ fontSize: '0.9rem', color: '#d32f2f', marginTop: '0.5rem' }}>
                {geocodingError}
              </p>
            )}
            
            {/* Selected coordinates */}
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
              Coordinates: {formatCoordinate(formData.latitude, true)}, {formatCoordinate(formData.longitude, false)}
              {formData.city && ` • ${formData.city}`}
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
            disabled={loading}
            style={{ 
              padding: '1rem 3rem', 
              fontSize: '1.2rem',
              backgroundColor: loading ? '#ccc' : '#b8860b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
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
      </form>
    </div>
  );
};