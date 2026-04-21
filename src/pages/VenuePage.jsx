import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';

function bucket(score) {
  if (score === null || score === undefined) return null;
  const n = parseFloat(score);
  if (n >= 8.5) return 'excellent';
  if (n >= 7)   return 'good';
  if (n >= 4)   return 'meh';
  return 'avoid';
}

const BUCKET_META = {
  excellent: { color: '#1a1714', label: { de: 'Exzellent', en: 'Excellent' } },
  good:      { color: '#6B4A2A', label: { de: 'Gut',       en: 'Good' } },
  meh:       { color: '#6B4A2A', label: { de: 'Mittel',    en: 'Mediocre' } },
  avoid:     { color: '#8B2A2A', label: { de: 'Meiden',    en: 'Avoid' } },
};

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F3EC' }}>
        <p style={{ color: '#555555', fontSize: 14 }} className="font-sans">{tr.loading}</p>
      </div>
    );
  }

  if (notFound || !venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
           style={{ background: '#F7F3EC' }}>
        <p className="text-5xl">☕</p>
        <p className="font-semibold font-sans" style={{ color: '#1a1714' }}>{tr.venueNotFound}</p>
        <button onClick={() => navigate('/')}
          className="text-sm font-semibold font-sans hover:underline min-h-[44px]"
          style={{ color: '#6B4A2A' }}>
          {tr.backToMap}
        </button>
      </div>
    );
  }

  const score      = venue.avg_score != null ? parseFloat(venue.avg_score) : null;
  const b          = bucket(score);
  const meta       = b ? BUCKET_META[b] : null;
  const hasRating  = venue.body && venue.balance && venue.crema;
  const scoreColor = meta ? meta.color : '#9CA3AF';
  const chipLabel  = meta ? meta.label[lang] : null;

  const ratedDate = venue.rated_at
    ? new Date(venue.rated_at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name} ${venue.city} ${venue.country}`
  )}`;

  const criteria = hasRating ? [
    { label: lang === 'de' ? 'Körper'  : 'Body',    hint: lang === 'de' ? 'Vollmundig vs. dünn'  : 'Full-bodied vs. thin',  val: venue.body },
    { label: 'Balance',                              hint: lang === 'de' ? 'Bitter / Säure'       : 'Bitter / Acid',         val: venue.balance },
    { label: 'Crema',                                hint: lang === 'de' ? 'Dick, haselnussbraun' : 'Thick, hazelnut-brown', val: venue.crema },
  ] : null;

  const divider = <div style={{ height: 1, background: 'rgba(26,23,20,0.10)', margin: '20px 0' }} />;

  return (
    <div className="min-h-screen" style={{ background: '#F7F3EC', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-2 px-4 py-3"
              style={{ background: '#F7F3EC', borderBottom: '1px solid rgba(26,23,20,0.10)' }}>
        <button onClick={() => navigate('/?tab=map')} style={{ fontSize: 18, lineHeight: 1, marginRight: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>☕</button>
        <button
          onClick={() => navigate('/?tab=map')}
          className="min-h-[44px] -ml-2 flex items-center gap-1 px-2 rounded-xl"
          style={{ color: '#6B4A2A', fontSize: 13, fontWeight: 600 }}
          aria-label={tr.backToMap}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {lang === 'de' ? 'Karte' : 'Map'}
        </button>
        <div className="flex-1" />
        {user && (
          <button
            onClick={() => navigate(`/review/${id}`)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl"
            style={{ color: '#555555' }}
            aria-label={tr.editRating}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <LangToggle />
      </header>

      <div className="max-w-lg mx-auto px-5 py-6">

        {/* Bucket chip */}
        {chipLabel && (
          <div className="mb-3">
            <span style={{
              display: 'inline-block', padding: '3px 10px',
              fontSize: 10, fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase', color: scoreColor,
              border: `1px solid ${scoreColor}`, borderRadius: 2,
            }}>{chipLabel}</span>
          </div>
        )}

        {/* City + date */}
        <p style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 13, letterSpacing: '1.5px', textTransform: 'uppercase',
          color: '#555555', marginBottom: 6,
        }}>
          {venue.city}{ratedDate ? ` · ${ratedDate}` : ''}
        </p>

        {/* Café name */}
        <h1 style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 38, fontWeight: 700, color: '#1a1714',
          letterSpacing: -0.8, lineHeight: 1.05, marginBottom: 6,
        }}>{venue.name}</h1>

        {/* Address */}
        {venue.address && (
          <p style={{ fontSize: 14, color: '#555555', marginBottom: 2 }}>{venue.address}</p>
        )}
        {venue.roastery && (
          <p style={{ fontSize: 13, color: '#555555', marginBottom: 2 }}>☕ {venue.roastery}</p>
        )}
        {venue.ceramic_cup && (
          <p style={{ fontSize: 13, color: '#555555', marginBottom: 2 }}>🍵 {tr.ceramicCupLabel}</p>
        )}

        {divider}

        {/* Big score */}
        {score !== null && (
          <div style={{ paddingBottom: 20, borderBottom: '1px solid rgba(26,23,20,0.10)', marginBottom: 20 }}>
            <div style={{
              fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase',
              color: '#555555', marginBottom: 4,
            }}>{lang === 'de' ? 'Score' : 'Score'}</div>
            <div style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontSize: 72, fontWeight: 700, color: scoreColor,
              lineHeight: 0.9, letterSpacing: -2,
            }}>{score.toFixed(1)}</div>
          </div>
        )}

        {/* Pull quote */}
        {venue.comment && (
          <div style={{ borderLeft: '3px solid #6B4A2A', paddingLeft: 14, marginBottom: 24 }}>
            <p style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontStyle: 'italic', fontSize: 20, lineHeight: 1.35,
              color: '#1a1714', margin: 0,
            }}>„{venue.comment}"</p>
          </div>
        )}

        {/* Price */}
        {venue.price != null && (
          <p style={{ fontSize: 14, fontWeight: 600, color: '#6B4A2A', marginBottom: 20 }}>
            {parseFloat(venue.price).toFixed(2)} {venue.currency || 'EUR'}
          </p>
        )}

        {/* Photo */}
        {venue.photo_url && (
          <img src={venue.photo_url} alt={venue.name}
            className="w-full rounded-xl object-cover max-h-64 mb-6" loading="lazy" />
        )}

        {/* The three criteria */}
        {criteria ? (
          <>
            <div style={{
              fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase',
              color: '#555555', marginBottom: 14, fontWeight: 700,
            }}>{lang === 'de' ? 'Die drei Kriterien' : 'The three criteria'}</div>
            <div className="flex flex-col gap-4 mb-6">
              {criteria.map(({ label, hint, val }) => (
                <div key={label}>
                  <div className="flex items-baseline mb-1.5">
                    <span style={{
                      fontFamily: '"DM Serif Display", Georgia, serif',
                      fontSize: 17, fontWeight: 700, color: '#1a1714', flex: 1,
                    }}>{label}</span>
                    <span style={{ fontSize: 11, color: '#555555', marginRight: 10 }}>{hint}</span>
                    <span style={{
                      fontFamily: '"DM Serif Display", Georgia, serif',
                      fontSize: 16, color: '#1a1714', fontWeight: 700,
                    }}>{val}<span style={{ color: '#555555', fontWeight: 400, fontSize: 13 }}>/10</span></span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(26,23,20,0.10)', borderRadius: 2, position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${((val ?? 0) / 10) * 100}%`,
                      background: '#6B4A2A', borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mb-6 text-center">
            <p style={{ fontSize: 14, color: '#555555', fontStyle: 'italic' }}>{tr.noRating}</p>
            {user && (
              <button
                onClick={() => navigate(`/review/${id}`)}
                className="mt-4 rounded-xl px-5 py-3 text-sm font-semibold font-sans hover:opacity-90 transition-opacity min-h-[48px]"
                style={{ background: '#6B4A2A', color: '#F7F3EC' }}
              >
                {tr.editRating}
              </button>
            )}
          </div>
        )}

        {divider}

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-8">
          <a
            href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold font-sans min-h-[48px]"
            style={{
              border: '1px solid rgba(26,23,20,0.15)',
              color: '#1a1714', textDecoration: 'none',
            }}
          >
            🗺 Google Maps ↗
          </a>
          {user && hasRating && (
            <button
              onClick={() => navigate(`/review/${id}`)}
              className="w-full rounded-xl px-5 py-3 text-sm font-semibold font-sans hover:opacity-90 transition-opacity min-h-[48px]"
              style={{ background: '#6B4A2A', color: '#F7F3EC' }}
            >
              {tr.editRating}
            </button>
          )}
        </div>

        {/* Signature */}
        <div style={{
          paddingTop: 18, borderTop: '1px solid rgba(26,23,20,0.10)',
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontStyle: 'italic', fontSize: 15, color: '#4a4340',
        }}>— Georg, vor Ort</div>

      </div>
    </div>
  );
}
