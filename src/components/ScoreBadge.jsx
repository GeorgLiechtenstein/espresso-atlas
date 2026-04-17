import React from 'react';
import { useLang } from '../context/LangContext';
import { scoreLabel as scoreLabelI18n } from '../lib/i18n';

export function scoreColor(s) {
  if (s === null || s === undefined) return '#9CA3AF';
  const n = parseFloat(s);
  if (n <= 4)   return '#E53935';
  if (n < 7)    return '#FFC107';
  if (n <= 8)   return '#43A047';
  return '#F59E0B';
}

/** Kept as named export for callers that need a pure function — pass lang explicitly */
export function scoreLabel(s, lang = 'de') {
  return scoreLabelI18n(s, lang);
}

export default function ScoreBadge({ score = null, size = 64, showLabel = false, className = '' }) {
  const { lang } = useLang();
  const color = scoreColor(score);
  const label = scoreLabel(score, lang);
  const displayScore = score !== null && score !== undefined
    ? parseFloat(score).toFixed(1)
    : '—';

  const fontSize  = size * 0.34;
  const labelSize = Math.max(10, size * 0.16);

  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`}>
      <div
        style={{
          width: size, height: size,
          backgroundColor: color,
          borderRadius: '50%',
          boxShadow: `0 2px 10px ${color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{
          color: '#ffffff', fontSize,
          fontWeight: 700, fontFamily: '"DM Sans", system-ui, sans-serif',
          lineHeight: 1, letterSpacing: '-0.03em',
        }}>
          {displayScore}
        </span>
      </div>

      {showLabel && size >= 80 && label && (
        <span style={{
          fontSize: labelSize, color,
          fontWeight: 600, fontFamily: '"DM Sans", system-ui, sans-serif',
          textAlign: 'center', letterSpacing: '0.01em',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
