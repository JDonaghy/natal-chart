import React, { useState, useEffect, useRef, useCallback } from 'react';

const TIME_STEPS = [
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 300_000 },
  { label: '10m', ms: 600_000 },
  { label: '15m', ms: 900_000 },
  { label: '30m', ms: 1_800_000 },
  { label: '1h', ms: 3_600_000 },
  { label: '12h', ms: 43_200_000 },
  { label: '24h', ms: 86_400_000 },
] as const;

interface TransitAnimationControlsProps {
  transitDateStr: string;
  onStep: (newDateStr: string, newDate: Date) => void;
  onPlayingChange?: (playing: boolean) => void;
  isMobile?: boolean;
  /** Render transport buttons and pills as a single inline row */
  inline?: boolean;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const TransitAnimationControls: React.FC<TransitAnimationControlsProps> = ({
  transitDateStr,
  onStep,
  onPlayingChange,
  isMobile,
  inline,
}) => {
  const [stepIndex, setStepIndex] = useState(5); // default 1h
  const [playing, setPlaying] = useState<'forward' | 'backward' | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dateRef = useRef(transitDateStr);
  const onStepRef = useRef(onStep);
  const stepIndexRef = useRef(stepIndex);

  // Keep refs in sync
  useEffect(() => { dateRef.current = transitDateStr; }, [transitDateStr]);
  useEffect(() => { onStepRef.current = onStep; }, [onStep]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);

  const stepTime = useCallback((direction: 1 | -1) => {
    const current = new Date(dateRef.current);
    if (isNaN(current.getTime())) return;
    const step = TIME_STEPS[stepIndexRef.current];
    if (!step) return;
    const next = new Date(current.getTime() + direction * step.ms);
    const nextStr = formatDateStr(next);
    dateRef.current = nextStr;
    onStepRef.current(nextStr, next);
  }, []);

  // Playback interval — uses refs so no stale closures
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!playing) return;

    const direction = playing === 'forward' ? 1 : -1;
    stepTime(direction);
    intervalRef.current = setInterval(() => stepTime(direction), 1200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, stepTime]);

  // Notify parent of playing state changes
  const onPlayingChangeRef = useRef(onPlayingChange);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => { onPlayingChangeRef.current?.(playing !== null); }, [playing]);

  const handleBack = () => {
    setPlaying(null);
    stepTime(-1);
  };

  const handleForward = () => {
    setPlaying(null);
    stepTime(1);
  };

  const handlePlayDirection = (dir: 'forward' | 'backward') => {
    setPlaying(prev => prev === dir ? null : dir);
  };

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
  };

  const transportBtn = (active?: boolean): React.CSSProperties => ({
    ...btnBase,
    width: isMobile ? 44 : 32,
    height: isMobile ? 44 : 32,
    borderRadius: '50%',
    backgroundColor: active ? '#4A6B8A' : '#F5F0E8',
    color: active ? '#fff' : '#5a4a3a',
    fontSize: isMobile ? '1rem' : '0.85rem',
  });

  const pillStyle = (active: boolean): React.CSSProperties => ({
    ...btnBase,
    padding: isMobile ? '0.4rem 0.65rem' : '0.3rem 0.55rem',
    borderRadius: '999px',
    backgroundColor: active ? '#4A6B8A' : '#F5F0E8',
    color: active ? '#fff' : '#5a4a3a',
    fontSize: isMobile ? '0.8rem' : '0.75rem',
    fontWeight: active ? 700 : 500,
    minWidth: isMobile ? 40 : 34,
  });

  const transportButtons = (
    <>
      <button
        onClick={handleBack}
        style={transportBtn()}
        title="Step backward"
        aria-label="Step backward"
      >
        ◀
      </button>
      <button
        onClick={() => handlePlayDirection('backward')}
        style={transportBtn(playing === 'backward')}
        title={playing === 'backward' ? 'Pause' : 'Play backward'}
        aria-label={playing === 'backward' ? 'Pause' : 'Play backward'}
      >
        {playing === 'backward' ? '⏸' : '⏪'}
      </button>
      <button
        onClick={() => handlePlayDirection('forward')}
        style={transportBtn(playing === 'forward')}
        title={playing === 'forward' ? 'Pause' : 'Play forward'}
        aria-label={playing === 'forward' ? 'Pause' : 'Play forward'}
      >
        {playing === 'forward' ? '⏸' : '⏩'}
      </button>
      <button
        onClick={handleForward}
        style={transportBtn()}
        title="Step forward"
        aria-label="Step forward"
      >
        ▶
      </button>
    </>
  );

  const pills = (
    <>
      {TIME_STEPS.map((step, i) => (
        <button
          key={step.label}
          onClick={() => setStepIndex(i)}
          style={pillStyle(i === stepIndex)}
          aria-label={`Step by ${step.label}`}
        >
          {step.label}
        </button>
      ))}
    </>
  );

  if (inline) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        flexWrap: 'wrap',
      }}>
        {transportButtons}
        <div style={{ width: '0.25rem' }} />
        {pills}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.5rem 0',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? '0.5rem' : '0.35rem',
      }}>
        {transportButtons}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem',
        flexWrap: 'wrap',
      }}>
        {pills}
      </div>
    </div>
  );
};
