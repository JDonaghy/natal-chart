import React from 'react';
import { BirthData, ChartResult } from '@natal-chart/core';
import '../App.css';

interface ChartWheelProps {
  chartData: ChartResult;
  size?: number;
}

export const ChartWheel: React.FC<ChartWheelProps> = ({ chartData, size = 400 }) => {
  const center = size / 2;
  const radius = size * 0.4;
   const ascendant = chartData.angles.ascendant;

   // Retrieve saved birth data for overlay
   const savedBirthData = React.useMemo((): BirthData | null => {
     try {
       const saved = localStorage.getItem('natal-chart-birth-data');
       return saved ? JSON.parse(saved) : null;
     } catch {
       return null;
     }
   }, []);

   // Format date for display
   const formatDate = (date: Date | string): string => {
     const d = typeof date === 'string' ? new Date(date) : date;
     return d.toLocaleDateString('en-US', { 
       year: 'numeric', 
       month: 'short', 
       day: 'numeric' 
     });
   };

   // Format time for display
   const formatTime = (date: Date | string): string => {
     const d = typeof date === 'string' ? new Date(date) : date;
     return d.toLocaleTimeString('en-US', { 
       hour: '2-digit', 
       minute: '2-digit',
       timeZone: 'UTC'
     }) + ' UTC';
   };
  
  // Convert longitude to SVG coordinates
  const longitudeToPoint = (longitude: number, distanceRatio = 0.7) => {
    const angle = (180 - longitude + ascendant) % 360;
    const rad = angle * (Math.PI / 180);
    const pointRadius = radius * distanceRatio;
    return {
      x: center + pointRadius * Math.cos(rad),
      y: center + pointRadius * Math.sin(rad),
    };
  };
  
  return (
    <div style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: `${size}px`, margin: '0 auto' }}>
       <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ fontFamily: '"Cormorant", "Crimson Text", serif' }}>
       <defs>
         <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
           <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
           <feOffset in="blur" dx="2" dy="2" result="offsetBlur"/>
           <feMerge>
             <feMergeNode in="offsetBlur"/>
             <feMergeNode in="SourceGraphic"/>
           </feMerge>
         </filter>
         <radialGradient id="parchmentGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
           <stop offset="0%" stopColor="#faf7f0" stopOpacity="1"/>
           <stop offset="100%" stopColor="#f0ead6" stopOpacity="1"/>
         </radialGradient>
       </defs>
       {/* Background circle */}
       <circle
         cx={center}
         cy={center}
         r={radius}
         fill="url(#parchmentGradient)"
         stroke="#b8860b"
         strokeWidth="1"
         filter="url(#shadow)"
       />
      
      {/* House lines (actual cusps) */}
      {chartData.houses.map((house) => {
        const angle = (180 - house.longitude + chartData.angles.ascendant) % 360;
        const rad = angle * (Math.PI / 180);
        const x1 = center + radius * Math.cos(rad);
        const y1 = center + radius * Math.sin(rad);
        
        return (
          <g key={`house-${house.house}`}>
            <line
              x1={center}
              y1={center}
              x2={x1}
              y2={y1}
              stroke="#b8860b"
              strokeWidth="1"
              strokeOpacity="0.8"
            />
            {/* House cusp degree display */}
            <text
              x={center + (radius * 0.75) * Math.cos(rad)}
              y={center + (radius * 0.75) * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.018}
              fill="#666"
              opacity="0.8"
            >
              {formatLongitude(house.longitude)}
            </text>
            {/* House number label */}
            <text
              x={center + (radius * 0.85) * Math.cos(rad)}
              y={center + (radius * 0.85) * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.03}
              fill="#2c2c54"
              fontWeight="bold"
            >
              {house.house}
            </text>
          </g>
        );
      })}
      
      {/* Aspect lines */}
      {chartData.aspects.map((aspect, index) => {
        const p1 = chartData.planets.find(p => p.planet === aspect.planet1);
        const p2 = chartData.planets.find(p => p.planet === aspect.planet2);
        
        if (!p1 || !p2) return null;
        
        const pos1 = longitudeToPoint(p1.longitude, 0.7);
        const pos2 = longitudeToPoint(p2.longitude, 0.7);
        
        // Aspect type to color mapping
        const aspectColors: Record<string, string> = {
          conjunction: '#666666',
          opposition: '#cc3333',
          trine: '#3366cc',
          square: '#cc6633',
          sextile: '#33cc66',
          quincunx: '#9966cc',
          semiSextile: '#6699cc',
        };
        
        const color = aspectColors[aspect.type] || '#888888';
        const strokeWidth = aspect.exact ? 2 : 1;
        const opacity = aspect.exact ? 0.9 : 0.6;
        
        return (
          <line
            key={`aspect-${index}`}
            x1={pos1.x}
            y1={pos1.y}
            x2={pos2.x}
            y2={pos2.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            strokeDasharray={aspect.exact ? 'none' : '4,2'}
          />
        );
      })}
      
      {/* Zodiac ring */}
       <circle
         cx={center}
         cy={center}
         r={radius * 1.05}
         fill="none"
         stroke="#d4c5a0"
         strokeWidth="2"
         strokeOpacity="0.7"
         filter="url(#shadow)"
       />
      
      {/* Degree markings and sign boundaries */}
      {Array.from({ length: 360 }).map((_, i) => {
        const degree = i;
        const pos = longitudeToPoint(degree, 1.05);
        const posInner = longitudeToPoint(degree, 1.03);
        
        // Every 30 degrees (sign boundaries) - thicker line
        if (degree % 30 === 0) {
          return (
            <line
              key={`sign-boundary-${degree}`}
              x1={posInner.x}
              y1={posInner.y}
              x2={longitudeToPoint(degree, 1.10).x}
              y2={longitudeToPoint(degree, 1.10).y}
              stroke="#b8860b"
              strokeWidth="2"
              strokeOpacity="0.8"
            />
          );
        }
        
        // Every 5 degrees - medium tick
        if (degree % 5 === 0) {
          return (
            <line
              key={`tick-${degree}`}
              x1={posInner.x}
              y1={posInner.y}
              x2={pos.x}
              y2={pos.y}
              stroke="#d4c5a0"
              strokeWidth="1"
              strokeOpacity="0.7"
            />
          );
        }
        
        // Every degree - small tick
        return (
          <line
            key={`tiny-${degree}`}
            x1={longitudeToPoint(degree, 1.04).x}
            y1={longitudeToPoint(degree, 1.04).y}
            x2={posInner.x}
            y2={posInner.y}
            stroke="#d4c5a0"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
        );
      })}
      
      {/* Degree numbers every 10 degrees */}
      {Array.from({ length: 36 }).map((_, i) => {
        const degree = i * 10;
        const pos = longitudeToPoint(degree, 1.12);
        return (
          <text
            key={`degree-number-${degree}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.02}
            fill="#666"
            opacity="0.7"
          >
            {degree}°
          </text>
        );
      })}
      
      {/* Sign glyphs - placed at midpoints of zodiac signs (0° Aries = 0°, 30° Taurus = 30°, etc.) */}
      {Array.from({ length: 12 }).map((_, i) => {
        // Midpoint of zodiac sign i (15° into each 30° sign)
        const signLongitude = i * 30 + 15;
        const pos = longitudeToPoint(signLongitude, 0.95);
        
        return (
          <text
            key={`sign-${i}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="glyph"
            fontSize={size * 0.05}
            fill="#2c2c54"
          >
            {getSignGlyphByIndex(i)}
          </text>
        );
      })}
      
      {/* Planet glyphs */}
      {chartData.planets.map((planet) => {
        const pos = longitudeToPoint(planet.longitude, 0.7);
        
        return (
          <g key={planet.planet}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size * 0.02}
              fill="#ffffff"
              stroke={planet.retrograde ? '#cc3333' : '#b8860b'}
              strokeWidth={planet.retrograde ? 1.5 : 1}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="glyph"
              fontSize={size * 0.03}
              fill="#1a1a2e"
            >
              {getPlanetGlyph(planet.planet)}
            </text>
            {/* Retrograde indicator */}
            {planet.retrograde && (
              <text
                x={pos.x + size * 0.03}
                y={pos.y - size * 0.03}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.02}
                fill="#cc3333"
                fontWeight="bold"
              >
                R
              </text>
            )}
          </g>
        );
      })}
      
      {/* Angular points (ASC, DESC, MC, IC) */}
      <g>
        {/* Ascendant */}
        <line
          x1={center}
          y1={center}
          x2={longitudeToPoint(chartData.angles.ascendant, 0.9).x}
          y2={longitudeToPoint(chartData.angles.ascendant, 0.9).y}
          stroke="#cc3333"
          strokeWidth="2"
          strokeOpacity="0.8"
        />
        <text
          x={longitudeToPoint(chartData.angles.ascendant, 0.95).x}
          y={longitudeToPoint(chartData.angles.ascendant, 0.95).y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.03}
          fill="#cc3333"
          fontWeight="bold"
        >
          ASC
        </text>
        
        {/* Descendant (opposite ASC) */}
        <line
          x1={center}
          y1={center}
          x2={longitudeToPoint(chartData.angles.descendant, 0.9).x}
          y2={longitudeToPoint(chartData.angles.descendant, 0.9).y}
          stroke="#cc6666"
          strokeWidth="1"
          strokeOpacity="0.6"
          strokeDasharray="2,2"
        />
        <text
          x={longitudeToPoint(chartData.angles.descendant, 0.95).x}
          y={longitudeToPoint(chartData.angles.descendant, 0.95).y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.025}
          fill="#cc6666"
          opacity="0.8"
        >
          DSC
        </text>
        
        {/* Midheaven */}
        <line
          x1={center}
          y1={center}
          x2={longitudeToPoint(chartData.angles.midheaven, 0.9).x}
          y2={longitudeToPoint(chartData.angles.midheaven, 0.9).y}
          stroke="#3366cc"
          strokeWidth="2"
          strokeOpacity="0.8"
        />
        <text
          x={longitudeToPoint(chartData.angles.midheaven, 0.95).x}
          y={longitudeToPoint(chartData.angles.midheaven, 0.95).y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.03}
          fill="#3366cc"
          fontWeight="bold"
        >
          MC
        </text>
        
        {/* Imum Coeli (opposite MC) */}
        <line
          x1={center}
          y1={center}
          x2={longitudeToPoint(chartData.angles.imumCoeli, 0.9).x}
          y2={longitudeToPoint(chartData.angles.imumCoeli, 0.9).y}
          stroke="#6699cc"
          strokeWidth="1"
          strokeOpacity="0.6"
          strokeDasharray="2,2"
        />
        <text
          x={longitudeToPoint(chartData.angles.imumCoeli, 0.95).x}
          y={longitudeToPoint(chartData.angles.imumCoeli, 0.95).y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.025}
          fill="#6699cc"
          opacity="0.8"
        >
          IC
        </text>
      </g>
      
      {/* Chart information overlay */}
      {savedBirthData && (
        <g>
          <rect
            x="10"
            y="10"
            width={180}
            height={95}
            fill="#faf7f0"
            stroke="#b8860b"
            strokeWidth="1"
            opacity="0.9"
            rx="4"
            ry="4"
          />
          <text x="20" y="30" fontSize={size * 0.015} fill="#2c2c54" fontWeight="bold">
            Natal Chart
          </text>
          <text x="20" y="45" fontSize={size * 0.012} fill="#666">
            Birth: {formatDate(savedBirthData.dateTimeUtc)}
          </text>
          <text x="20" y="60" fontSize={size * 0.012} fill="#666">
            Time: {formatTime(savedBirthData.dateTimeUtc)}
          </text>
          <text x="20" y="75" fontSize={size * 0.012} fill="#666">
            Location: {savedBirthData.latitude.toFixed(2)}°, {savedBirthData.longitude.toFixed(2)}°
          </text>
          <text x="20" y="90" fontSize={size * 0.012} fill="#666">
            Houses: {savedBirthData.houseSystem === 'P' ? 'Placidus' : savedBirthData.houseSystem === 'W' ? 'Whole Sign' : 'Koch'}
          </text>
        </g>
      )}
      
      {/* Center point */}
      <circle
        cx={center}
        cy={center}
        r={size * 0.01}
        fill="#b8860b"
      />
    </svg>
    </div>
  );
};

// Helper functions
function getSignIndex(longitude: number): number {
  // Convert longitude (0-360°) to zodiac sign index (0-11)
  // 0° Aries = index 0, 30° Taurus = index 1, etc.
  return Math.floor(longitude / 30) % 12;
}

function getDegreeInSign(longitude: number): number {
  // Get degree within sign (0-29.999...)
  return longitude % 30;
}

function formatLongitude(longitude: number): string {
  // Format longitude as "15° ♈ 30′"
  const signIndex = getSignIndex(longitude);
  const degree = Math.floor(getDegreeInSign(longitude));
  const minute = Math.round((getDegreeInSign(longitude) - degree) * 60);
  // Handle edge case where minute rounds to 60
  const adjustedDegree = minute === 60 ? degree + 1 : degree;
  const adjustedMinute = minute === 60 ? 0 : minute;
  const signGlyph = getSignGlyphByIndex(signIndex);
  // Pad minute to 2 digits
  const minuteStr = adjustedMinute.toString().padStart(2, '0');
  return `${adjustedDegree}° ${signGlyph} ${minuteStr}′`;
}

function getSignGlyphByIndex(index: number): string {
  const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  return glyphs[index] || '○';
}

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