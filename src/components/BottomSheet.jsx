import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import ScoreBadge from './ScoreBadge';

/**
 * BottomSheet — venue detail panel that slides up from the bottom.
 *
 * @param {object}      props
 * @param {object|null} props.venue       – venue object (or null)
 * @param {object|null} props.lastReview  – most recent review (or null)
 * @param {boolean}     props.isOpen
 * @param {function}    props.onClose
 */
export default function BottomSheet({ venue, isOpen, onClose }) {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { lang }     = useLang();
  const tr           = t(lang);
  const sheetRef     = useRef(null);
  const dragStart    = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Drag to dismiss ───────────────────────────────────────────────────────
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

  const score    = venue.avg_score != null ? parseFloat(venue.avg_score) : null;
  const hasRating = venue.body && venue.balance && venue.crema && venue.overall;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name} ${venue.city} ${venue.country}`
  )}`;

  const subScores = hasRating
    ? [
        { label: tr.body,    val: venue.body },
        { label: tr.balance, val: venue.balance },
        { label: tr.crema,   val: venue.crema },
        { label: tr.overall, val: venue.overall },
      ]
    : null;

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
        }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pt-2 pb-4">

          {/* ── Header: name + score ─────────────────────────────────── */}
          <div className="flex items-start gap-3 mb-1">
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-[22px] text-ink leading-tight">{venue.name}</h3>
              <p className="text-sm font-sans mt-0.5" style={{ color: '#666' }}>
                {venue.city}, {venue.country}
              </p>
              {venue.roastery && (
                <p className="text-xs text-gray-400 font-sans mt-0.5">☕ {venue.roastery}</p>
              )}
            </div>
            <ScoreBadge score={score} size={58} showLabel />
          </div>

          {/* ── Sub-scores breakdown ─────────────────────────────────── */}
          {subScores ? (
            <div className="bg-surface rounded-xl px-4 py-3 mt-4 flex flex-col gap-2.5">
              {subScores.map(({ label, val }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 font-sans w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-coffee rounded-full" style={{ width: `${((val ?? 0) / 10) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-coffee font-sans w-8 text-right shrink-0">{val ?? '—'}/10</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-xl px-4 py-3 mt-4">
              <p className="text-sm text-gray-400 font-sans italic">{tr.noRating}</p>
            </div>
          )}

          {/* Comment + price */}
          {(venue.comment || venue.price != null) && (
            <div className="mt-3 px-4 py-3 bg-surface rounded-xl">
              {venue.comment && (
                <p className="text-sm text-gray-600 font-sans italic leading-snug">„{venue.comment}"</p>
              )}
              {venue.price != null && (
                <p className="text-xs text-coffee font-sans font-medium mt-2">
                  {parseFloat(venue.price).toFixed(2)} {venue.currency || 'EUR'}
                </p>
              )}
            </div>
          )}

          {/* ── Google Maps link ─────────────────────────────────────── */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 px-4 py-3 border border-border rounded-xl
              text-sm font-semibold font-sans text-ink hover:bg-surface active:bg-gray-100
              transition-colors min-h-[44px]"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {lang === 'de' ? 'Auf Google Maps öffnen' : 'Open in Google Maps'}
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 text-gray-300">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>

          {/* ── CTAs ─────────────────────────────────────────────────── */}
          <div className={`mt-3 grid gap-2.5 ${user ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              onClick={() => { onClose(); navigate(`/venue/${venue.id}`); }}
              className="flex items-center justify-center gap-1.5 bg-ink text-white rounded-xl py-3.5
                text-sm font-semibold font-sans hover:opacity-90 active:opacity-80 transition-opacity min-h-[44px]"
            >
              {lang === 'de' ? 'Details' : 'Details'}
              <svg width={14} height={14} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {user && (
              <button
                onClick={() => { onClose(); navigate(`/review/${venue.id}`); }}
                className="flex items-center justify-center gap-1.5 bg-coffee text-white rounded-xl py-3.5
                  text-sm font-semibold font-sans hover:opacity-90 active:opacity-80 transition-opacity min-h-[44px]"
              >
                ✏️ {lang === 'de' ? 'Bearbeiten' : 'Edit'}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
