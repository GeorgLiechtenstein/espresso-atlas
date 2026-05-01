import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

function bucket(score) {
  if (score === null || score === undefined) return null;
  const n = parseFloat(score);
  if (n >= 8.5) return 'excellent';
  if (n >= 7)   return 'good';
  if (n >= 4)   return 'meh';
  return 'avoid';
}

const BUCKET_META = {
  excellent: { color: '#1a1714', textColor: '#1a1714', label: { de: 'Exzellent', en: 'Excellent' } },
  good:      { color: '#6B4A2A', textColor: '#6B4A2A', label: { de: 'Gut',       en: 'Good' } },
  meh:       { color: '#C4B5A0', textColor: '#8A7A62', label: { de: 'Mittel',    en: 'Mediocre' } },
  avoid:     { color: '#8B2A2A', textColor: '#8B2A2A', label: { de: 'Meiden',    en: 'Avoid' } },
};

const BALANCE_META = {
  balanced:     { color: '#6F4E37', label: { de: 'Ausgewogen',    en: 'Balanced' } },
  slightAcidic: { color: '#888888', label: { de: 'Leicht sauer',  en: 'Slightly acidic' } },
  slightBitter: { color: '#888888', label: { de: 'Leicht bitter', en: 'Slightly bitter' } },
  tooAcidic:    { color: '#A94442', label: { de: 'Zu sauer',      en: 'Too acidic' } },
  tooBitter:    { color: '#A94442', label: { de: 'Zu bitter',     en: 'Too bitter' } },
};

function balanceMeta(val) {
  if (val == null) return null;
  const a = Math.abs(val);
  if (a <= 1) return BALANCE_META.balanced;
  if (a <= 3) return val > 0 ? BALANCE_META.slightBitter : BALANCE_META.slightAcidic;
  return val > 0 ? BALANCE_META.tooBitter : BALANCE_META.tooAcidic;
}

function criteriaBarColor(val) {
  if (val >= 8) return '#6F4E37';
  if (val >= 4) return '#C4B5A0';
  return '#A94442';
}

export default function BottomSheet({ venue, isOpen, onClose }) {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { lang }  = useLang();
  const sheetRef  = useRef(null);
  const dragStart = useRef(null);
  const [dragging,   setDragging]   = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onTouchStart(e) {
    dragStart.current = e.touches[0].clientY;
    setDragging(true);
    setDragOffset(0);
  }
  function onTouchMove(e) {
    if (dragStart.current === null) return;
    const delta = Math.max(0, e.touches[0].clientY - dragStart.current);
    setDragOffset(delta);
  }
  function onTouchEnd() {
    if (dragOffset > 72) onClose();
    dragStart.current = null;
    setDragging(false);
    setDragOffset(0);
  }

  if (!venue) return null;

  const score     = venue.avg_score != null ? parseFloat(venue.avg_score) : null;
  const b         = bucket(score);
  const meta      = b ? BUCKET_META[b] : null;
  const hasRating = venue.body != null && venue.balance != null && venue.crema != null;

  const scoreColor = meta ? meta.textColor : '#9CA3AF';
  const chipLabel  = meta ? meta.label[lang] : null;
  const displayComment = (lang === 'de' ? venue.comment_de : venue.comment_en)
                       || venue.comment_de || venue.comment_en || venue.comment;

  const barScores = hasRating ? [
    { key: 'body',  label: lang === 'de' ? 'Körper' : 'Body', val: venue.body },
    { key: 'crema', label: 'Crema',                            val: venue.crema },
  ] : null;
  const bMeta = hasRating ? balanceMeta(venue.balance) : null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name} ${venue.city} ${venue.country}`
  )}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ zIndex: 460 }}
        className={`fixed inset-0 bg-black/20 transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          zIndex: 470,
          transform: isOpen
            ? `translateY(${dragging ? dragOffset : 0}px)`
            : 'translateY(100%)',
          transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom))',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: '#FAF0E6',
        }}
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl shadow-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 sticky top-0 z-10"
             style={{ background: '#FAF0E6' }}>
          <div style={{ width: 48, height: 4, borderRadius: 4, background: 'rgba(26,23,20,0.18)' }} />
        </div>

        <div className="px-5 pb-5">

          {/* Bucket chip */}
          {chipLabel && (
            <div className="mb-2">
              <span style={{
                display: 'inline-block', padding: '3px 9px',
                fontSize: 9, fontWeight: 700, letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: b === 'meh' ? '#1a1714' : '#FAF0E6',
                background: meta.color,
                borderRadius: 2,
              }}>{chipLabel}</span>
            </div>
          )}

          {/* Name + score */}
          <div className="flex items-baseline gap-3 mb-0.5">
            <h3 style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontSize: 26, fontWeight: 700, color: '#1a1714',
              lineHeight: 1.1, letterSpacing: -0.3,
              flex: 1, minWidth: 0, margin: 0,
            }}>{venue.name}</h3>
            {score !== null && (
              <div className="animate-score-pulse" style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontSize: 42, fontWeight: 700, color: scoreColor,
                lineHeight: 0.9, letterSpacing: -1, flexShrink: 0,
              }}>{score.toFixed(1)}</div>
            )}
          </div>

          {/* Location */}
          <p style={{ fontSize: 13, color: '#555555', marginBottom: 14, marginTop: 4 }}>
            {venue.address ? `${venue.address} · ` : ''}{venue.city}
          </p>

          {/* Pull quote */}
          {displayComment && (
            <div style={{ borderLeft: '2px solid #6B4A2A', paddingLeft: 12, marginBottom: 14 }}>
              <p style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontStyle: 'italic', fontSize: 15, lineHeight: 1.45,
                color: '#1a1714', margin: 0,
              }}>„{displayComment}"</p>
            </div>
          )}

          {/* Sub-scores */}
          {hasRating ? (
            <div className="flex flex-col gap-1.5 mb-4">
              {barScores.map(({ key, label, val }) => (
                <div key={key} className="flex items-center gap-2">
                  <span style={{ fontSize: 11, color: '#555555', width: 52, flexShrink: 0, letterSpacing: 0.2 }}>
                    {label}
                  </span>
                  <div className="flex-1 rounded-full overflow-hidden"
                       style={{ height: 8, background: '#E0E0E0' }}>
                    <div className="h-full rounded-full"
                         style={{ width: `${((val ?? 0) / 10) * 100}%`, background: criteriaBarColor(val) }} />
                  </div>
                  <span style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontSize: 11, color: '#4a4340',
                    width: 28, textAlign: 'right', flexShrink: 0,
                  }}>{val}<span style={{ color: '#555555', fontWeight: 400 }}>/10</span></span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: '#555555', width: 52, flexShrink: 0, letterSpacing: 0.2 }}>
                  Balance
                </span>
                <span style={{
                  flex: 1,
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontStyle: 'italic', fontSize: 13, fontWeight: 700,
                  color: bMeta.color,
                }}>{bMeta.label[lang]}</span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#555555', fontStyle: 'italic', marginBottom: 14 }}>
              {lang === 'de' ? 'Noch keine Bewertung.' : 'No rating yet.'}
            </p>
          )}

          {/* Price */}
          {venue.price != null && (
            <p style={{ fontSize: 12, color: '#6B4A2A', fontWeight: 600, marginBottom: 12 }}>
              {parseFloat(venue.price).toFixed(2)} {venue.currency || 'EUR'}
            </p>
          )}

          {/* Footer: text links */}
          <div style={{
            display: 'flex', alignItems: 'center',
            borderTop: '1px solid rgba(26,23,20,0.10)',
            paddingTop: 14, gap: 16,
          }}>
            <button
              onClick={() => { onClose(); navigate(`/venue/${venue.id}`); }}
              style={{
                fontSize: 13, fontWeight: 600, color: '#1a1714',
                textDecoration: 'underline', textUnderlineOffset: 3,
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', letterSpacing: 0.3,
              }}
            >
              {lang === 'de' ? 'Ganze Bewertung lesen →' : 'Full review →'}
            </button>

            {user && (
              <button
                onClick={() => { onClose(); navigate(`/review/${venue.id}`); }}
                style={{
                  fontSize: 13, fontWeight: 600, color: '#6B4A2A',
                  textDecoration: 'underline', textUnderlineOffset: 3,
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                }}
              >
                {lang === 'de' ? 'Bearbeiten' : 'Edit'}
              </button>
            )}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 'auto', fontSize: 13, color: '#555555',
                letterSpacing: 0.3, textDecoration: 'none',
              }}
            >
              Google Maps ↗
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
