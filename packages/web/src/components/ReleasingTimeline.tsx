import React from 'react';
import type { ZRTimeline, ZRPeriod } from '@natal-chart/core';
import '../App.css';

// Element colors matching the chart wheel aesthetic
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fire: { bg: '#fff0e8', text: '#CC3333', border: '#CC3333' },
  earth: { bg: '#f0f5e8', text: '#338833', border: '#338833' },
  air: { bg: '#fffff0', text: '#AA8800', border: '#CCAA00' },
  water: { bg: '#e8f0ff', text: '#3366CC', border: '#3366CC' },
};

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

interface ReleasingTimelineProps {
  timeline: ZRTimeline;
  currentDate: Date;
}

export const ReleasingTimeline: React.FC<ReleasingTimelineProps> = ({
  timeline,
  currentDate,
}) => {
  const now = currentDate.getTime();

  return (
    <div>
      {/* Visual overview bar */}
      <div style={{
        display: 'flex',
        height: '40px',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #b8860b',
        marginBottom: '1.5rem',
        position: 'relative',
      }}>
        {timeline.periods.map((period, i) => {
          const totalDays = timeline.periods.reduce((s, p) => s + p.durationDays, 0);
          const widthPct = (period.durationDays / totalDays) * 100;
          const colors = ELEMENT_COLORS[period.element] || ELEMENT_COLORS.fire!;
          const isActive = now >= period.startDate.getTime() && now < period.endDate.getTime();

          return (
            <div
              key={i}
              title={`${formatSign(period.sign)} (${formatDate(period.startDate)} — ${formatDate(period.endDate)})`}
              style={{
                width: `${widthPct}%`,
                backgroundColor: colors.bg,
                borderRight: i < timeline.periods.length - 1 ? `1px solid ${colors.border}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: widthPct > 5 ? '1rem' : '0.7rem',
                color: colors.text,
                fontWeight: isActive ? 'bold' : 'normal',
                outline: isActive ? '2px solid #b8860b' : 'none',
                outlineOffset: '-2px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span className="glyph">{SIGN_GLYPHS[period.sign]}</span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  backgroundColor: '#b8860b',
                }} />
              )}
            </div>
          );
        })}

        {/* "Now" marker */}
        {(() => {
          const totalStart = timeline.periods[0]?.startDate.getTime() ?? 0;
          const totalDays = timeline.periods.reduce((s, p) => s + p.durationDays, 0);
          const totalEnd = totalStart + totalDays * 86400000;
          if (now >= totalStart && now <= totalEnd) {
            const pct = ((now - totalStart) / (totalEnd - totalStart)) * 100;
            return (
              <div style={{
                position: 'absolute',
                left: `${pct}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: '#2c2c54',
                zIndex: 1,
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-4px',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '8px solid #2c2c54',
                }} />
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Expandable table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #b8860b' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem', width: '30px' }}></th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Sign</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Ruler</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Start</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>End</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Duration</th>
              <th style={{ textAlign: 'center', padding: '0.5rem' }}>Markers</th>
            </tr>
          </thead>
          <tbody>
            {timeline.periods.map((period, i) => (
              <PeriodRow
                key={i}
                period={period}
                currentDate={currentDate}
                depth={0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface PeriodRowProps {
  period: ZRPeriod;
  currentDate: Date;
  depth: number;
}

const PeriodRow: React.FC<PeriodRowProps> = ({ period, currentDate, depth }) => {
  const [expanded, setExpanded] = React.useState(false);
  const now = currentDate.getTime();
  const isActive = now >= period.startDate.getTime() && now < period.endDate.getTime();
  const colors = ELEMENT_COLORS[period.element] || ELEMENT_COLORS.fire!;
  const hasSubs = period.subPeriods && period.subPeriods.length > 0;

  // Auto-expand active L1 periods
  React.useEffect(() => {
    if (isActive && depth === 0 && hasSubs) {
      setExpanded(true);
    }
  }, [isActive, depth, hasSubs]);

  return (
    <>
      <tr
        style={{
          borderBottom: '1px solid #e8e0d0',
          backgroundColor: isActive ? '#fdf8e8' : 'transparent',
          cursor: hasSubs ? 'pointer' : 'default',
        }}
        onClick={() => hasSubs && setExpanded(!expanded)}
      >
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
          {hasSubs && (
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              {expanded ? '▾' : '▸'}
            </span>
          )}
        </td>
        <td style={{ padding: '0.5rem', paddingLeft: `${0.5 + depth * 1.5}rem` }}>
          <span
            className="glyph"
            style={{
              marginRight: '0.5rem',
              color: colors.text,
              fontSize: depth === 0 ? '1.2rem' : '1rem',
            }}
          >
            {SIGN_GLYPHS[period.sign]}
          </span>
          <span style={{
            fontWeight: depth === 0 ? 'bold' : 'normal',
            color: colors.text,
          }}>
            {formatSign(period.sign)}
          </span>
          {isActive && (
            <span style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#b8860b',
              color: 'white',
              padding: '0.1rem 0.4rem',
              borderRadius: '3px',
              verticalAlign: 'middle',
            }}>
              NOW
            </span>
          )}
        </td>
        <td style={{ padding: '0.5rem', color: '#666' }}>
          {formatSign(period.ruler)}
        </td>
        <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
          {formatDate(period.startDate)}
        </td>
        <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
          {formatDate(period.endDate)}
        </td>
        <td style={{ padding: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          {formatDuration(period.durationDays, period.level)}
        </td>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
          {period.isPeak && (
            <span
              title="Peak period (angular to Lot)"
              style={{
                display: 'inline-block',
                marginRight: '0.3rem',
                fontSize: '0.85rem',
                color: '#b8860b',
                fontWeight: 'bold',
              }}
            >
              Peak
            </span>
          )}
          {period.isLoosingOfBond && period.loosingDate && (
            <span
              title={`Loosing of the Bond to ${formatSign(period.loosingSign || period.sign)} on ${formatDate(period.loosingDate)}`}
              style={{
                display: 'inline-block',
                fontSize: '0.85rem',
                color: '#CC4422',
                fontWeight: 'bold',
              }}
            >
              LB
            </span>
          )}
          {period.modalityMatch && (
            <span
              title="Modality matches Lot sign"
              style={{
                display: 'inline-block',
                marginLeft: '0.3rem',
                fontSize: '0.75rem',
                color: '#4A6B8A',
              }}
            >
              M
            </span>
          )}
        </td>
      </tr>
      {expanded && hasSubs && period.subPeriods!.map((sub, j) => (
        <PeriodRow
          key={j}
          period={sub}
          currentDate={currentDate}
          depth={depth + 1}
        />
      ))}
    </>
  );
};

// --- Formatting Helpers ---

function formatSign(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(days: number, level: number): string {
  if (level === 1) {
    const years = days / 365.25;
    return `${years.toFixed(0)}y`;
  }
  if (level === 2) {
    const months = days / 30.4375;
    if (months >= 1) return `${months.toFixed(1)}mo`;
    return `${days.toFixed(0)}d`;
  }
  if (level === 3) {
    const weeks = days / 7;
    if (weeks >= 1) return `${weeks.toFixed(1)}w`;
    return `${days.toFixed(1)}d`;
  }
  // L4
  return `${days.toFixed(1)}d`;
}
