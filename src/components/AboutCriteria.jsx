import { useState } from 'react';
import { useLang } from '../context/LangContext';

export default function AboutCriteria() {
  const { lang } = useLang();
  const [body, setBody]       = useState(7);
  const [crema, setCrema]     = useState(7);
  const [balance, setBalance] = useState(0);

  const heading = lang === 'de' ? 'Wie ich bewerte' : 'How I rate';
  const lead = lang === 'de'
    ? 'Drei Kriterien, ehrlich vergeben. Schiebe die Regler, um zu sehen wie ich Espresso einstufe.'
    : 'Three criteria, honestly applied. Move the sliders to see how I think about espresso.';

  const balanceM = balanceMeta(balance, lang);

  return (
    <section>
      <h2 className="font-serif text-2xl text-ink mb-3 leading-tight">{heading}</h2>
      <p className="text-[15px] text-gray-600 font-sans leading-relaxed mb-8">{lead}</p>

      <CritBlock
        title={lang === 'de' ? 'Körper' : 'Body'}
        type="bar"
        value={body}
        onChange={setBody}
        descriptor={bodyDescription(body, lang)}
      />
      <Divider />

      <CritBlock
        title="Crema"
        type="bar"
        value={crema}
        onChange={setCrema}
        descriptor={cremaDescription(crema, lang)}
      />
      <Divider />

      <CritBlock
        title="Balance"
        type="spectrum"
        value={balance}
        onChange={setBalance}
        descriptor={balanceM.label}
        descriptorColor={balanceM.color}
        lang={lang}
      />
    </section>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(26,23,20,0.10)', margin: '32px 0' }} />;
}

function CritBlock({ title, type, value, onChange, descriptor, descriptorColor, lang }) {
  const isSpectrum = type === 'spectrum';

  const trackBg = isSpectrum
    ? 'linear-gradient(to right, #F59E0B 0%, #43A047 50%, #6B4A2A 100%)'
    : `linear-gradient(to right, ${criteriaBarColor(value)} ${(value / 10) * 100}%, #E0E0E0 ${(value / 10) * 100}%)`;

  return (
    <div>
      <h3 style={{
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontSize: 22, fontWeight: 700, color: '#1a1714',
        margin: 0, lineHeight: 1.2, letterSpacing: -0.3,
        marginBottom: 14,
      }}>{title}</h3>

      {isSpectrum && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 6, fontSize: 11, color: '#666666', letterSpacing: 0.3,
          fontFamily: '"DM Sans", system-ui, sans-serif',
        }}>
          <span>{lang === 'de' ? 'Sauer' : 'Acidic'}</span>
          <span>{lang === 'de' ? 'Ausgewogen' : 'Balanced'}</span>
          <span>{lang === 'de' ? 'Bitter' : 'Bitter'}</span>
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 32 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%',
          transform: 'translateY(-50%)',
          height: isSpectrum ? 4 : 4, borderRadius: 2,
          pointerEvents: 'none',
          background: trackBg,
        }} />
        <input
          type="range"
          min={isSpectrum ? -5 : 1}
          max={isSpectrum ? 5 : 10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ea-slider"
          style={{ position: 'relative', zIndex: 1, width: '100%' }}
        />
      </div>

      <p style={{
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontStyle: 'italic', fontSize: 16, fontWeight: 700,
        color: descriptorColor || '#1a1714',
        marginTop: 14, marginBottom: 0, lineHeight: 1.4,
        transition: 'color 0.18s ease',
      }}>{descriptor}</p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function criteriaBarColor(val) {
  if (val >= 8) return '#6F4E37';
  if (val >= 4) return '#C4B5A0';
  return '#A94442';
}

function bodyDescription(val, lang) {
  if (val <= 2) return lang === 'de' ? 'Wässrig. Wie heißes Wasser mit Kaffeefarbe.' : 'Watery. Like hot water with coffee coloring.';
  if (val <= 4) return lang === 'de' ? 'Dünn. Schmeckt verdünnt, wenig Substanz.'    : 'Thin. Tastes diluted, little substance.';
  if (val <= 6) return lang === 'de' ? 'Ordentlich. Spürbarer Körper, aber kein Wow.' : 'Decent. Noticeable body, but no wow.';
  if (val <= 8) return lang === 'de' ? 'Vollmundig. Dicht, substanziell, so soll es sein.' : 'Full-bodied. Dense, substantial, as it should be.';
  return            lang === 'de' ? 'Sirupartig. Schwer, cremig, perfekte Extraktion.'    : 'Syrupy. Heavy, creamy, perfect extraction.';
}

function cremaDescription(val, lang) {
  if (val <= 2) return lang === 'de' ? 'Keine Crema. Oder dünner Schaum der sofort verschwindet.' : 'No crema. Or thin foam that disappears instantly.';
  if (val <= 4) return lang === 'de' ? 'Dünn und blass. Löst sich in Sekunden auf.'                : 'Thin and pale. Dissolves in seconds.';
  if (val <= 6) return lang === 'de' ? 'Vorhanden, aber nicht überzeugend.'                        : 'Present, but not convincing.';
  if (val <= 8) return lang === 'de' ? 'Schön. Haselnussbraun, gleichmässig, hält gut.'            : 'Nice. Hazelnut-brown, even, holds well.';
  return            lang === 'de' ? 'Perfekt. Dicht, tiger-gestreift, hält 30+ Sekunden.'         : 'Perfect. Dense, tiger-striped, holds 30+ seconds.';
}

function balanceMeta(val, lang) {
  const a = Math.abs(val);
  if (a <= 1) {
    return { color: '#6F4E37', label: lang === 'de' ? 'Ausgewogen' : 'Balanced' };
  }
  if (a <= 3) {
    return {
      color: '#888888',
      label: val > 0
        ? (lang === 'de' ? 'Leicht bitter' : 'Slightly bitter')
        : (lang === 'de' ? 'Leicht sauer'  : 'Slightly acidic'),
    };
  }
  return {
    color: '#A94442',
    label: val > 0
      ? (lang === 'de' ? 'Zu bitter' : 'Too bitter')
      : (lang === 'de' ? 'Zu sauer'  : 'Too acidic'),
  };
}
