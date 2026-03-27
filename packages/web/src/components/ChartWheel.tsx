import React from 'react';
import { ChartResult } from '@natal-chart/core';
import '../App.css';

interface ChartWheelProps {
  chartData: ChartResult;
  size?: number;
}

export const ChartWheel: React.FC<ChartWheelProps> = ({ chartData, size = 400 }) => {
  const center = size / 2;
  const radius = size * 0.4;
  const ascendant = chartData.angles.ascendant;
  
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="#faf7f0"
        stroke="#b8860b"
        strokeWidth="1"
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
      />
      
      {/* Sign glyphs */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 15) * (Math.PI / 180);
        const textRadius = radius * 0.95;
        const x = center + textRadius * Math.cos(angle);
        const y = center + textRadius * Math.sin(angle);
        
        return (
          <text
            key={`sign-${i}`}
            x={x}
            y={y}
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
      
      {/* Center point */}
      <circle
        cx={center}
        cy={center}
        r={size * 0.01}
        fill="#b8860b"
      />
    </svg>
  );
};

// Helper functions
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