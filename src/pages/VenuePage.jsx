import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import CupLogo from '../components/CupLogo';
import { venueCity } from '../lib/localize';

import {
  BUCKETS as BUCKET_META,
  scoreBucket as bucket,
  balanceMeta,
  criteriaBarColor,
} from '../design-tokens';

export default function VenuePage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLang();
  const tr       = t(lang);

  const [venue,    setVenue]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openInfo, setOpenInfo] = useState(null);

  useEffect(() => {
    if (!id) return;
    // Remember the last venue the user looked at so the map tab can
    // re-anchor on it the next time they switch back.
    try { sessionStorage.setItem('ea_last_venue', id); } catch {}
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase.from('venues').select('*').eq('id', id).single();
      if (error || !data) setNotFound(true);
      else setVenue(data);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!openInfo) return;
    function onDocClick(e) {
      if (!e.target.closest('[data-info-ui]')) setOpenInfo(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [openInfo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF0E6' }}>
        <p style={{ color: '#555555', fontSize: 14 }} className="font-sans">{tr.loading}</p>
      </div>
    );
  }

  if (notFound || !venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
           style={{ background: '#FAF0E6' }}>
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
  const hasRating  = venue.body != null && venue.balance != null && venue.crema != null;
  const scoreColor = meta ? meta.textColor : '#9CA3AF';
  const chipLabel  = meta ? meta.label[lang] : null;
  const displayComment = (lang === 'de' ? venue.comment_de : venue.comment_en)
                       || venue.comment_de || venue.comment_en || venue.comment;

  const ratedDate = venue.rated_at
    ? new Date(venue.rated_at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
        month: 'long', year: 'numeric',
      })
    : null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name} ${venue.city} ${venue.country}`
  )}`;

  const criteria = hasRating ? [
    { key: 'body',    label: lang === 'de' ? 'Körper'  : 'Body',    hint: lang === 'de' ? 'Sirupartig vs. wässrig'        : 'Syrupy vs. watery',         info: tr.bodyInfo,    val: venue.body },
    { key: 'crema',   label: 'Crema',                                hint: lang === 'de' ? 'Dicht und beständig vs. dünn' : 'Dense and lasting vs. thin', info: tr.cremaInfo,   val: venue.crema },
    { key: 'balance', label: 'Balance',                              hint: lang === 'de' ? 'Harmonisch vs. bitter/sauer'   : 'Balanced vs. bitter/sour',   info: tr.balanceInfoDetail, val: venue.balance },
  ] : null;

  const divider = <div style={{ height: 1, background: 'rgba(26,23,20,0.10)', margin: '14px 0' }} />;

  return (
    <div className="min-h-screen" style={{ background: '#FAF0E6', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-2 px-4 py-3"
              style={{ background: '#FAF0E6', borderBottom: '1px solid rgba(26,23,20,0.10)' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CupLogo />
          <span
            onClick={() => {
              try {
                sessionStorage.removeItem('ea_last_venue');
                sessionStorage.removeItem('ea_last_tab');
                sessionStorage.setItem('ea_reset_map', '1');
              } catch {}
              navigate('/?tab=map');
            }}
            className="font-serif text-[19px] text-ink leading-tight"
            style={{ cursor: 'pointer' }}
          >
            Espresso Atlas
          </span>
        </div>
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

      <div className="max-w-lg mx-auto px-5 pt-5 pb-6">

        {/* Bucket badge + city + date — single tight caps row */}
        <p style={{
          marginBottom: 8,
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 13, letterSpacing: '1.5px',
          textTransform: 'uppercase', color: '#555555',
        }}>
          {chipLabel && (
            <span style={{
              display: 'inline-block', padding: '3px 10px',
              fontSize: 10, fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase',
              color: b === 'meh' ? '#1a1714' : '#FAF0E6',
              background: meta.fill,
              borderRadius: 2,
              verticalAlign: 'middle',
            }}>{chipLabel}</span>
          )}
          <span style={{ verticalAlign: 'middle' }}>
            {chipLabel ? ' · ' : ''}{[venueCity(venue, lang), ratedDate].filter(Boolean).join(' · ')}
          </span>
        </p>

        {/* Café name */}
        <h1 style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 30, fontWeight: 700, color: '#1a1714',
          letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 4,
        }}>{venue.name}</h1>

        {/* Address + roastery — tight subline directly under the name */}
        {venue.address && (
          <p style={{ fontSize: 13, color: '#555555', marginBottom: 2, lineHeight: 1.35 }}>{venue.address}</p>
        )}
        {venue.roastery && (
          <p style={{ fontSize: 13, color: '#555555', marginBottom: 0, lineHeight: 1.35 }}>☕ {venue.roastery}</p>
        )}

        {/* Score / cup type / price — three caps-labelled columns. The
            row only renders when there's a score; an unrated venue has
            its own fallback block further down. */}
        {score !== null && (() => {
          const cupLabel = {
            ceramic: tr.cupCeramic,
            glass:   tr.cupGlass,
            paper:   tr.cupPaper,
          }[venue.cup_type];
          const priceLabel = lang === 'de' ? 'Preis' : 'Price';
          const capsLabel = {
            fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase',
            color: '#555555', marginBottom: 4,
          };
          return (
            <div style={{
              paddingTop: 14, paddingBottom: 16, marginTop: 14, marginBottom: 16,
              borderTop: '1px solid rgba(26,23,20,0.10)',
              borderBottom: '1px solid rgba(26,23,20,0.10)',
              display: 'flex', alignItems: 'flex-start', gap: 28,
            }}>
              {/* SCORE — left, large */}
              <div>
                <div style={capsLabel}>Score</div>
                <div className="animate-score-pulse" style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 64, fontWeight: 700, color: scoreColor,
                  lineHeight: 0.9, letterSpacing: -2,
                }}>{score.toFixed(1)}</div>
              </div>

              {/* CUP + PRICE clustered to the right of the score, not
                  spread across the full width — keeps the eye in one
                  zone instead of scanning across the whole row. */}
              {cupLabel && (
                <div>
                  <div style={capsLabel}>{tr.cupSection}</div>
                  <div style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontStyle: 'italic', fontSize: 20, fontWeight: 700,
                    color: '#1a1714', lineHeight: 1.1,
                  }}>{cupLabel}</div>
                </div>
              )}

              {venue.price != null && (
                <div>
                  <div style={capsLabel}>{priceLabel}</div>
                  <div style={{
                    fontFamily: '"DM Serif Display", Georgia, serif',
                    fontSize: 20, fontWeight: 700, color: '#1a1714', lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                  }}>
                    {parseFloat(venue.price).toFixed(2)}
                    <span style={{ color: '#555555', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>
                      {venue.currency || 'EUR'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Pull quote — the visual anchor of the page below the score.
            Generous vertical padding makes it sit as its own block
            instead of running into the criteria below. */}
        {displayComment && (
          <div style={{
            borderLeft: '3px solid #6B4A2A',
            paddingLeft: 18, paddingTop: 24, paddingBottom: 24,
            marginTop: 0, marginBottom: 16,
          }}>
            <p style={{
              fontFamily: '"DM Serif Display", Georgia, serif',
              fontStyle: 'italic', fontSize: 20, lineHeight: 1.45,
              color: '#1a1714', margin: 0,
            }}>„{displayComment}"</p>
          </div>
        )}

        {/* Photo */}
        {venue.photo_url && (
          <img src={venue.photo_url} alt={venue.name}
            className="w-full rounded-xl object-cover max-h-64 mb-5" loading="lazy" />
        )}

        {/* The three criteria */}
        {criteria ? (
          <>
            <div style={{
              fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase',
              color: '#555555', marginBottom: 10, fontWeight: 700,
            }}>{lang === 'de' ? 'Die drei Kriterien' : 'The three criteria'}</div>
            <div className="flex flex-col mb-5" style={{ gap: 10 }}>
              {criteria.map(({ key, label, hint, info, val }) => {
                const isBalance = key === 'balance';
                const bMeta = isBalance ? balanceMeta(val) : null;
                return (
                  <div key={key}>
                    <div className="flex items-baseline mb-1.5">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <span style={{
                          fontFamily: '"DM Serif Display", Georgia, serif',
                          fontSize: 17, fontWeight: 700, color: '#1a1714',
                        }}>{label}</span>
                        <button
                          type="button"
                          data-info-ui
                          onClick={() => setOpenInfo(openInfo === key ? null : key)}
                          aria-label="Info"
                          style={{
                            width: 22, height: 22, borderRadius: '50%',
                            border: `1.5px solid ${openInfo === key ? '#6B4A2A' : '#555555'}`,
                            background: openInfo === key ? '#6B4A2A' : 'transparent',
                            color: openInfo === key ? '#FAF0E6' : '#555555',
                            fontSize: 13, fontWeight: 700, fontStyle: 'italic',
                            fontFamily: '"DM Serif Display", Georgia, serif',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, cursor: 'pointer', lineHeight: 1,
                            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                          }}
                        >i</button>
                      </div>
                      {isBalance ? (
                        <span style={{
                          fontFamily: '"DM Serif Display", Georgia, serif',
                          fontStyle: 'italic', fontSize: 16, fontWeight: 700,
                          color: bMeta.color,
                        }}>{bMeta.label[lang]}</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 11, color: '#555555', marginRight: 10 }}>{hint}</span>
                          <span style={{
                            fontFamily: '"DM Serif Display", Georgia, serif',
                            fontSize: 16, color: '#1a1714', fontWeight: 700,
                          }}>{val}<span style={{ color: '#555555', fontWeight: 400, fontSize: 13 }}>/10</span></span>
                        </>
                      )}
                    </div>
                    {openInfo === key && (
                      <div data-info-ui style={{
                        background: '#F5F0E8', border: '1px solid #E0D5C7',
                        borderRadius: 12, padding: '12px 14px', marginBottom: 10,
                        fontSize: 13, color: '#444444', lineHeight: 1.5,
                        fontFamily: '"DM Sans", system-ui, sans-serif',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}>
                        {info}
                      </div>
                    )}
                    {!isBalance && (
                      <div style={{ height: 8, background: '#E0E0E0', borderRadius: 4, position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${((val ?? 0) / 10) * 100}%`,
                          background: criteriaBarColor(val),
                          borderRadius: 4,
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mb-6 text-center">
            <p style={{ fontSize: 14, color: '#555555', fontStyle: 'italic' }}>{tr.noRating}</p>
            {user && (
              <button
                onClick={() => navigate(`/review/${id}`)}
                className="mt-4 rounded-xl px-5 py-3 text-sm font-semibold font-sans hover:opacity-90 transition-opacity min-h-[48px]"
                style={{ background: '#6B4A2A', color: '#FAF0E6' }}
              >
                {tr.editRating}
              </button>
            )}
          </div>
        )}

        {divider}

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-6">
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
              style={{ background: '#6B4A2A', color: '#FAF0E6' }}
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
