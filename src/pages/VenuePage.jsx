import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import ScoreBadge from '../components/ScoreBadge';

export default function VenuePage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLang();
  const tr       = t(lang);

  const [venue,    setVenue]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase.from('venues').select('*').eq('id', id).single();
      if (error || !data) setNotFound(true);
      else setVenue(data);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-gray-400 text-sm font-sans">{tr.loading}</p>
      </div>
    );
  }

  if (notFound || !venue) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-5xl">☕</p>
        <p className="text-ink font-semibold font-sans">{tr.venueNotFound}</p>
        <button onClick={() => navigate('/')}
          className="text-sm text-coffee font-semibold font-sans hover:underline min-h-[44px]">
          {tr.backToMap}
        </button>
      </div>
    );
  }

  const score        = venue.avg_score != null ? parseFloat(venue.avg_score) : null;
  const hasRating    = venue.body && venue.balance && venue.crema && venue.overall;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + venue.city)}`;

  const subScores = hasRating ? [
    { label: tr.body,    val: venue.body },
    { label: tr.balance, val: venue.balance },
    { label: tr.crema,   val: venue.crema },
    { label: tr.overall, val: venue.overall },
  ] : null;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="min-h-[44px] -ml-2 flex items-center gap-1 px-2 rounded-xl hover:bg-gray-100 transition-colors text-coffee font-semibold text-sm font-sans"
          aria-label={tr.backToMap}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {lang === 'de' ? 'Karte' : 'Map'}
        </button>
        <h2 className="text-base font-semibold text-ink truncate font-sans flex-1">{venue.name}</h2>
        {user && (
          <button
            onClick={() => navigate(`/review/${id}`)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-ink transition-colors rounded-xl hover:bg-gray-100"
            aria-label={tr.editRating}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <LangToggle />
      </header>

      <div className="animate-fade-up">
        {/* Hero */}
        <div className="bg-ink text-white px-5 py-8">
          <div className="max-w-lg mx-auto flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-3xl leading-tight mb-1">{venue.name}</h1>
              <p className="text-gray-400 text-sm font-sans">{venue.city}, {venue.country}</p>
              {venue.roastery && (
                <p className="text-gray-500 text-xs font-sans mt-1">☕ {venue.roastery}</p>
              )}
              {venue.ceramic_cup && (
                <p className="text-gray-500 text-xs font-sans mt-0.5">🍵 {tr.ceramicCupLabel}</p>
              )}
            </div>
            <div className="shrink-0 mt-1">
              <ScoreBadge score={score} size={80} showLabel />
            </div>
          </div>
        </div>

        {/* Sub-scores */}
        {subScores && (
          <div className="bg-white border-b border-border px-5 py-4">
            <div className="max-w-lg mx-auto flex flex-col gap-2.5">
              {subScores.map(({ label, val }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide font-sans w-20 shrink-0">
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-coffee rounded-full" style={{ width: `${((val ?? 0) / 10) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-coffee font-sans ml-2 shrink-0">{val ?? '—'}/10</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment + price */}
        {(venue.comment || venue.price != null) && (
          <div className="bg-white border-b border-border px-5 py-4">
            <div className="max-w-lg mx-auto flex flex-col gap-2">
              {venue.comment && (
                <p className="text-sm text-gray-600 italic font-sans leading-relaxed">
                  „{venue.comment}"
                </p>
              )}
              {venue.price != null && (
                <p className="text-sm font-semibold text-coffee font-sans">
                  {parseFloat(venue.price).toFixed(2)} {venue.currency || 'EUR'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Photo */}
        {venue.photo_url && (
          <div className="max-w-lg mx-auto px-5 pt-4">
            <img src={venue.photo_url} alt={venue.name}
              className="w-full rounded-2xl object-cover max-h-64" loading="lazy" />
          </div>
        )}

        {/* No rating yet */}
        {!hasRating && (
          <div className="px-5 py-8 max-w-lg mx-auto text-center">
            <p className="text-gray-400 text-sm font-sans">{tr.noRating}</p>
            {user && (
              <button
                onClick={() => navigate(`/review/${id}`)}
                className="mt-4 bg-coffee text-white rounded-xl px-5 py-3 text-sm font-semibold font-sans hover:opacity-90 transition-opacity min-h-[48px]"
              >
                {tr.editRating}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 max-w-lg mx-auto flex flex-col gap-3">
          <a
            href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-surface border border-border text-ink rounded-xl px-5 py-3 text-sm font-semibold font-sans hover:bg-gray-50 transition-colors min-h-[48px]"
          >
            🗺 Google Maps
          </a>
          {user && hasRating && (
            <button
              onClick={() => navigate(`/review/${id}`)}
              className="w-full bg-coffee text-white rounded-xl px-5 py-3 text-sm font-semibold font-sans hover:opacity-90 transition-opacity min-h-[48px]"
            >
              {tr.editRating}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
