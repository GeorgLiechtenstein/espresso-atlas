import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t, scoreLabel } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import CupLogo from '../components/CupLogo';

const CURRENCIES = ['EUR', 'CHF', 'USD', 'GBP', 'TRY', 'IQD'];

const INPUT_BG   = '#EDE4D3';
const SURFACE    = '#FAF0E6';
const INK        = '#1a1714';
const MUTED      = '#666666';
const COFFEE     = '#6B4A2A';
const AVOID      = '#8B2A2A';
const BORDER_C   = '#E0D8CC';

const BALANCE_META = {
  balanced:     { color: '#43A047', label: { de: 'Ausgewogen',    en: 'Balanced' } },
  slightAcidic: { color: '#F59E0B', label: { de: 'Leicht sauer',  en: 'Slightly acidic' } },
  slightBitter: { color: '#F59E0B', label: { de: 'Leicht bitter', en: 'Slightly bitter' } },
  tooAcidic:    { color: '#E53935', label: { de: 'Zu sauer',      en: 'Too acidic' } },
  tooBitter:    { color: '#E53935', label: { de: 'Zu bitter',     en: 'Too bitter' } },
};

function balanceMeta(val) {
  if (val == null) return null;
  const a = Math.abs(val);
  if (a <= 1) return BALANCE_META.balanced;
  if (a <= 3) return val > 0 ? BALANCE_META.slightBitter : BALANCE_META.slightAcidic;
  return val > 0 ? BALANCE_META.tooBitter : BALANCE_META.tooAcidic;
}

function bucketColor(score) {
  if (score === null || score === undefined) return '#9CA3AF';
  const n = parseFloat(score);
  if (n >= 8.5) return INK;
  if (n >= 7)   return COFFEE;
  if (n >= 4)   return '#8A7A62';
  return AVOID;
}

// Beige card with a CAPS label + arbitrary children
function InputCard({ label, children, style }) {
  return (
    <div style={{ background: INPUT_BG, borderRadius: 14, padding: '12px 16px', ...style }}>
      <div style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: MUTED, fontWeight: 700, fontFamily: '"DM Sans", system-ui, sans-serif', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function CardInput({ value, onChange, placeholder, onKeyDown }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 16, color: INK, fontFamily: '"DM Sans", system-ui, sans-serif', padding: 0 }}
    />
  );
}

async function geocode(name, city, country) {
  const q = [name, city, country].filter(Boolean).join(', ');
  try {
    const r1 = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
    const d1 = await r1.json();
    if (d1?.length > 0) return { lat: parseFloat(d1[0].lat), lng: parseFloat(d1[0].lon) };
    const r2 = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent([city, country].join(', '))}&format=json&limit=1`);
    const d2 = await r2.json();
    if (d2?.length > 0) return { lat: parseFloat(d2[0].lat), lng: parseFloat(d2[0].lon) };
  } catch { /* silent */ }
  return { lat: 0, lng: 0 };
}

export default function ReviewPage() {
  const { venueId: preVenueId } = useParams();
  const navigate                = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLang();
  const tr = t(lang);
  const isEdit = Boolean(preVenueId);

  const [step, setStep] = useState(1);

  // ── Venue fields ────────────────────────────────────────────────────────────
  const [name,    setName]    = useState('');
  const [city,    setCity]    = useState('');
  const [country, setCountry] = useState('');
  const [lat,     setLat]     = useState(null);
  const [lng,     setLng]     = useState(null);
  const [locSearch, setLocSearch] = useState('');
  const [locSugg,   setLocSugg]   = useState([]);
  const [locating,  setLocating]  = useState(false);
  const locTimer        = useRef(null);
  const locJustSelected = useRef(false);

  // ── Rating fields ───────────────────────────────────────────────────────────
  const [body,       setBody]       = useState(5);
  const [balance,    setBalance]    = useState(0);
  const [crema,      setCrema]      = useState(5);
  
  const [ceramicCup, setCeramicCup] = useState(false);
  const [openInfo,   setOpenInfo]   = useState(null);

  // ── Details ─────────────────────────────────────────────────────────────────
  const [ratedAt,  setRatedAt]  = useState(() => new Date().toISOString().split('T')[0]);
  const [comment,  setComment]  = useState('');
  const [roastery, setRoastery] = useState('');
  const [price,    setPrice]    = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [photo,    setPhoto]    = useState(null);
  const [photoPreview,     setPhotoPreview]     = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
  const [showDetails,      setShowDetails]      = useState(false);

  // ── Submit state ────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error,     setError]     = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!preVenueId) return;
    supabase.from('venues').select('*').eq('id', preVenueId).single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name || '');
        setCity(data.city || '');
        setCountry(data.country || '');
        setLat(data.lat ? parseFloat(data.lat) : null);
        setLng(data.lng ? parseFloat(data.lng) : null);
        if (data.address) setLocSearch(data.address);
        setBody(data.body || 5);
        setBalance(data.balance ?? 0);
        setCrema(data.crema || 5);

        setCeramicCup(data.ceramic_cup || false);
        setRoastery(data.roastery || '');
        setRatedAt(data.rated_at ? data.rated_at.split('T')[0] : new Date().toISOString().split('T')[0]);
        setComment(data.comment || '');
        setPrice(data.price != null ? String(data.price) : '');
        setCurrency(data.currency || 'EUR');
        setExistingPhotoUrl(data.photo_url || null);
        if (data.photo_url) setPhotoPreview(data.photo_url);
        if (data.comment || data.price || data.photo_url || data.roastery || data.ceramic_cup) setShowDetails(true);
      });
  }, [preVenueId]);

  useEffect(() => {
    if (locJustSelected.current) { locJustSelected.current = false; return; }
    if (locSearch.length < 3 || locSearch.startsWith('📍')) { setLocSugg([]); return; }
    clearTimeout(locTimer.current);
    locTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locSearch)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': lang === 'de' ? 'de' : 'en' } },
        );
        setLocSugg((await res.json()) || []);
      } catch { /* silent */ }
    }, 350);
    return () => clearTimeout(locTimer.current);
  }, [locSearch, lang]);

  useEffect(() => {
    if (!openInfo) return;
    function onDocClick(e) {
      if (!e.target.closest('[data-info-ui]')) setOpenInfo(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [openInfo]);

  function applyLocSuggestion(s) {
    locJustSelected.current = true;
    const addr     = s.address || {};
    const vName    = addr.amenity || addr.name || addr.shop || addr.cafe || addr.restaurant || s.display_name.split(',')[0].trim();
    const vCity    = addr.city || addr.town || addr.village || addr.municipality || '';
    const vCountry = addr.country || '';
    setLat(parseFloat(s.lat));
    setLng(parseFloat(s.lon));
    if (!name    && vName)    setName(vName);
    if (!city    && vCity)    setCity(vCity);
    if (!country && vCountry) setCountry(vCountry);
    setLocSearch(s.display_name.split(',').slice(0, 2).join(', '));
    setLocSugg([]);
  }

  async function handleGPS() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: gLat, longitude: gLng } = pos.coords;
        setLat(gLat); setLng(gLng);
        setLocSearch(`📍 ${gLat.toFixed(5)}, ${gLng.toFixed(5)}`);
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${gLat}&lon=${gLng}&format=json&addressdetails=1`, { headers: { 'Accept-Language': lang === 'de' ? 'de' : 'en' } });
          const data = await res.json();
          const addr = data.address || {};
          if (!city    && (addr.city || addr.town || addr.village)) setCity(addr.city || addr.town || addr.village);
          if (!country && addr.country) setCountry(addr.country);
        } catch { /* silent */ }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }
  function removePhoto() {
    setPhoto(null); setPhotoPreview(''); setExistingPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const step1Valid = Boolean(name.trim() && city.trim() && country.trim());
  const balanceScore = 10 - 2 * Math.abs(balance);
  const liveScore  = Math.round(((body + balanceScore + crema) / 3) * 10) / 10;

  async function handleSubmit() {
    setError('');
    if (!name.trim() || !city.trim() || !country.trim()) { setError(tr.errFillVenue); return; }
    setSaving(true);
    try {
      let resolvedLat = lat, resolvedLng = lng;
      if (!resolvedLat || !resolvedLng) {
        setGeocoding(true);
        const coords = await geocode(name, city, country);
        setGeocoding(false);
        resolvedLat = coords.lat; resolvedLng = coords.lng;
      }
      let photoUrl = existingPhotoUrl;
      if (photo) {
        const ext  = photo.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('review-photos').upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadErr) throw new Error(uploadErr.message);
        const { data: { publicUrl } } = supabase.storage.from('review-photos').getPublicUrl(path);
        photoUrl = publicUrl;
      }
      const addressVal = locSearch.startsWith('📍') ? null : locSearch.trim() || null;
      const payload = {
        name: name.trim(), city: city.trim(), country: country.trim(),
        address: addressVal, lat: resolvedLat, lng: resolvedLng,
        body, balance, crema,
        ceramic_cup: ceramicCup || null,
        roastery: roastery.trim() || null,
        comment:  comment.trim() || null,
        price:    price ? parseFloat(price) : null,
        currency, photo_url: photoUrl,
        rated_at: new Date(ratedAt + 'T12:00:00.000Z').toISOString(),
      };
      if (isEdit) {
        const { error: err } = await supabase.from('venues').update(payload).eq('id', preVenueId);
        if (err) throw new Error(err.message);
        navigate(`/venue/${preVenueId}`, { replace: true });
      } else {
        const { data: newVenue, error: err } = await supabase.from('venues').insert(payload).select().single();
        if (err) throw new Error(err.message);
        navigate(`/venue/${newVenue.id}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Error');
      setSaving(false); setGeocoding(false);
    }
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: MUTED, fontSize: 14 }}>{tr.loading}</p>
    </div>
  );

  const stepSubtitle = step === 1
    ? (lat && lng ? tr.step1SubtitleGPS : tr.step1Subtitle)
    : step === 2 ? tr.step2Subtitle : tr.step3Subtitle;

  const subScores = [
    { key: 'body',    label: tr.bodyLabel,    hint: tr.bodyHint,    info: tr.bodyInfo,    val: body,    set: setBody },
    { key: 'balance', label: tr.balanceLabel, hint: tr.balanceHint, info: tr.balanceInfo, val: balance, set: setBalance },
    { key: 'crema',   label: tr.cremaLabel,   hint: tr.cremaHint,   info: tr.cremaInfo,   val: crema,   set: setCrema },
  ];

  return (
    <div style={{ minHeight: '100vh', background: SURFACE, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `calc(env(safe-area-inset-top) + 12px) 20px 12px`,
        background: SURFACE, borderBottom: `1px solid ${BORDER_C}`,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ fontSize: 14, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: '"DM Sans", system-ui, sans-serif', minWidth: 70 }}
        >
          {tr.cancelWizard}
        </button>

        <span style={{ fontSize: 15, fontWeight: 700, color: INK, fontFamily: '"DM Sans", system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CupLogo />
          {isEdit ? tr.editPageTitle : (lang === 'de' ? 'Neuer Espresso' : 'New Espresso')}
        </span>

        <span style={{ fontSize: 13, color: MUTED, fontFamily: '"DM Sans", system-ui, sans-serif', minWidth: 70, textAlign: 'right' }}>
          {tr.stepOf} {step}/3
        </span>
      </header>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, padding: '0 20px', paddingTop: 12, paddingBottom: 4, background: SURFACE }}>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{
            flex: 1, height: 2, borderRadius: 2,
            background: n <= step ? COFFEE : 'rgba(26,23,20,0.12)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 120px' }}>

          {/* Step title + subtitle */}
          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 34, fontWeight: 700, color: INK,
            letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 6,
          }}>
            {[tr.step1Title, tr.step2Title, tr.step3Title][step - 1]}
          </h1>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 28, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            {stepSubtitle}
          </p>

          {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* CAFÉ */}
              <InputCard label={lang === 'de' ? 'Café' : 'Café'}>
                <CardInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tr.namePlaceholder}
                />
              </InputCard>

              {/* ADRESSE with GPS */}
              <InputCard label={lang === 'de' ? 'Adresse' : 'Address'} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    value={locSearch}
                    onChange={(e) => setLocSearch(e.target.value)}
                    placeholder={lang === 'de' ? 'Adresse suchen…' : 'Search address…'}
                    style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: 16, color: INK, fontFamily: '"DM Sans", system-ui, sans-serif', padding: 0 }}
                  />
                  <button
                    type="button"
                    onClick={handleGPS}
                    disabled={locating}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: lat && lng ? COFFEE : MUTED, flexShrink: 0 }}
                    title={lang === 'de' ? 'GPS' : 'GPS'}
                  >
                    {locating ? (
                      <svg style={{ animation: 'spin 1s linear infinite' }} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Autocomplete */}
                {locSugg.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 30, background: 'white', border: `1px solid ${BORDER_C}`, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginTop: 4, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                    {locSugg.map((s, i) => (
                      <button key={i} type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyLocSuggestion(s)}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER_C}`, cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: INK, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display_name.split(',')[0]}</p>
                        <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display_name.split(',').slice(1, 3).join(',').trim()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </InputCard>

              {/* STADT + LAND side by side */}
              <div style={{ display: 'flex', gap: 10 }}>
                <InputCard label={lang === 'de' ? 'Stadt' : 'City'} style={{ flex: 1 }}>
                  <CardInput value={city} onChange={(e) => setCity(e.target.value)} placeholder={tr.cityPlaceholder} />
                </InputCard>
                <InputCard label={lang === 'de' ? 'Land' : 'Country'} style={{ flex: 1 }}>
                  <CardInput value={country} onChange={(e) => setCountry(e.target.value)} placeholder={tr.countryPlaceholder} />
                </InputCard>
              </div>

            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {subScores.map(({ key, label, hint, info, val, set }) => {
                const isBalance = key === 'balance';
                const pct = isBalance ? null : (val / 10) * 100;
                const bMeta = isBalance ? balanceMeta(val) : null;
                return (
                  <div key={key}>
                    {/* Label row */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 19, fontWeight: 700, color: INK }}>{label}</span>
                        <button
                          type="button"
                          data-info-ui
                          onClick={() => setOpenInfo(openInfo === key ? null : key)}
                          aria-label="Info"
                          style={{
                            width: 22, height: 22, borderRadius: '50%',
                            border: `1.5px solid ${openInfo === key ? COFFEE : MUTED}`,
                            background: openInfo === key ? COFFEE : 'transparent',
                            color: openInfo === key ? '#FAF0E6' : MUTED,
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
                          fontStyle: 'italic', fontSize: 19, fontWeight: 700,
                          color: bMeta.color, lineHeight: 1,
                        }}>
                          {bMeta.label[lang]}
                        </span>
                      ) : (
                        <span style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 22, fontWeight: 700, color: INK, lineHeight: 1 }}>
                          {val}<span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}>/10</span>
                        </span>
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

                    {isBalance ? (
                      <>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          marginBottom: 6, fontSize: 11, color: MUTED, letterSpacing: 0.3,
                          fontFamily: '"DM Sans", system-ui, sans-serif',
                        }}>
                          <span>{lang === 'de' ? 'Sauer' : 'Acidic'}</span>
                          <span>{lang === 'de' ? 'Ausgewogen' : 'Balanced'}</span>
                          <span>{lang === 'de' ? 'Bitter' : 'Bitter'}</span>
                        </div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 32 }}>
                          <div style={{
                            position: 'absolute', left: 0, right: 0, top: '50%',
                            transform: 'translateY(-50%)', height: 4, borderRadius: 2,
                            pointerEvents: 'none',
                            background: 'linear-gradient(to right, #F59E0B 0%, #43A047 50%, #6B4A2A 100%)',
                          }} />
                          <input
                            type="range" min={-5} max={5} step={1} value={val}
                            onChange={(e) => set(Number(e.target.value))}
                            className="ea-slider"
                            style={{ position: 'relative', zIndex: 1, width: '100%' }}
                          />
                        </div>
                      </>
                    ) : (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 32 }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 3, borderRadius: 2, pointerEvents: 'none', background: `linear-gradient(to right, ${COFFEE} ${pct}%, rgba(26,23,20,0.12) ${pct}%)` }} />
                        <input
                          type="range" min={1} max={10} step={1} value={val}
                          onChange={(e) => set(Number(e.target.value))}
                          className="ea-slider"
                          style={{ position: 'relative', zIndex: 1, width: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Live score */}
              <div style={{ textAlign: 'center', padding: '16px 0 4px', borderTop: '1px solid rgba(26,23,20,0.10)' }}>
                <div style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 56, fontWeight: 700, lineHeight: 0.9, color: bucketColor(liveScore), letterSpacing: -2 }}>
                  {liveScore.toFixed(1)}
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 8, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {scoreLabel(liveScore, lang)}
                </div>
              </div>

              {/* Ceramic cup */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minHeight: 44 }}>
                <input type="checkbox" checked={ceramicCup} onChange={(e) => setCeramicCup(e.target.checked)} style={{ width: 20, height: 20, accentColor: COFFEE, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: INK, fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {tr.ceramicCupLabel}
                  <span style={{ display: 'block', fontSize: 12, color: MUTED }}>{tr.ceramicCupHint}</span>
                </span>
              </label>
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Date */}
              <InputCard label={tr.dateLabel}>
                <input
                  type="date"
                  value={ratedAt}
                  onChange={(e) => setRatedAt(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: INK, fontFamily: '"DM Sans", system-ui, sans-serif', padding: 0, width: '100%' }}
                />
              </InputCard>

              {/* Comment textarea */}
              <div style={{ background: INPUT_BG, borderRadius: 14, padding: '14px 16px', minHeight: 140 }}>
                <textarea
                  rows={5}
                  maxLength={500}
                  placeholder={tr.commentPlaceholder}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                    fontSize: 18, color: INK, lineHeight: 1.5,
                    fontFamily: '"DM Serif Display", Georgia, serif', fontStyle: 'italic',
                    padding: 0,
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: 11, color: MUTED, marginTop: 4, fontFamily: '"DM Sans", system-ui, sans-serif' }}>{comment.length}/500</div>
              </div>

              {/* Optional details */}
              {!showDetails ? (
                <button type="button" onClick={() => setShowDetails(true)}
                  style={{ textAlign: 'left', fontSize: 14, color: COFFEE, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  + {tr.addDetails}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <InputCard label={tr.roasteryLabel}>
                    <CardInput value={roastery} onChange={(e) => setRoastery(e.target.value)} placeholder={tr.roasteryPlaceholder} />
                  </InputCard>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <InputCard label={tr.priceLabel} style={{ flex: 1 }}>
                      <CardInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1.80" />
                    </InputCard>
                    <InputCard label={lang === 'de' ? 'Währung' : 'Currency'} style={{ flex: 1 }}>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: INK, fontFamily: '"DM Sans", system-ui, sans-serif', width: '100%', padding: 0 }}>
                        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </InputCard>
                  </div>
                  {/* Photo */}
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: MUTED, fontWeight: 700, fontFamily: '"DM Sans", system-ui, sans-serif', marginBottom: 8 }}>
                      {tr.photoLabel}
                    </div>
                    {photoPreview ? (
                      <div style={{ position: 'relative' }}>
                        <img src={photoPreview} alt="preview" style={{ width: '100%', borderRadius: 14, objectFit: 'cover', maxHeight: 200 }} />
                        <button type="button" onClick={removePhoto} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ width: '100%', background: INPUT_BG, border: '2px dashed #C4B9A8', borderRadius: 14, padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', color: MUTED, fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: 14 }}>
                        <span style={{ fontSize: 28 }}>📷</span>
                        {tr.addPhoto}
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#991B1B', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', bottom: 0, background: SURFACE,
        borderTop: `1px solid ${BORDER_C}`,
        padding: `14px 20px calc(env(safe-area-inset-bottom) + 14px)`,
        display: 'flex', alignItems: 'center',
        justifyContent: step === 1 ? 'flex-end' : 'space-between',
      }}>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            style={{ fontSize: 15, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"DM Sans", system-ui, sans-serif', padding: '10px 0' }}
          >
            ← {lang === 'de' ? 'Zurück' : 'Back'}
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && !step1Valid}
            style={{
              background: step === 1 && !step1Valid ? 'rgba(26,23,20,0.25)' : INK,
              color: '#FAF0E6', border: 'none', borderRadius: 14,
              padding: '14px 28px', fontSize: 15, fontWeight: 700,
              fontFamily: '"DM Sans", system-ui, sans-serif',
              cursor: step === 1 && !step1Valid ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {tr.nextStep} →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!step1Valid || saving}
            style={{
              background: !step1Valid || saving ? 'rgba(26,23,20,0.25)' : INK,
              color: '#FAF0E6', border: 'none', borderRadius: 14,
              padding: '14px 28px', fontSize: 15, fontWeight: 700,
              fontFamily: '"DM Sans", system-ui, sans-serif',
              cursor: !step1Valid || saving ? 'default' : 'pointer',
            }}
          >
            {geocoding ? tr.geocoding : saving ? tr.saving : tr.submitReview}
          </button>
        )}
      </div>
    </div>
  );
}
