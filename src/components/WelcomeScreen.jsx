import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from './LangToggle';
import CupLogo from './CupLogo';

/**
 * First-visit onboarding. Shown over the rest of the app whenever the
 * 'ea_welcomed' localStorage flag is missing. Two outcomes:
 *   - Allow:  triggers Geolocation.getCurrentPosition synchronously from
 *             this user gesture (Safari needs that), then dismisses.
 *   - Later:  dismisses without asking the browser. Map stays at the
 *             Europe-default view.
 *
 * onAllow gets the resolved coords or null if the user denied in the
 * native dialog.
 */
export default function WelcomeScreen({ onAllow, onLater }) {
  const { lang } = useLang();
  const tr = t(lang);

  function handleAllow() {
    if (!navigator.geolocation) {
      onAllow(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onAllow({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn('[welcome] geolocation', err && err.code, err && err.message);
        onAllow(null);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: '#FAF0E6',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      paddingLeft: 24, paddingRight: 24,
      maxWidth: '100vw', overflowX: 'hidden',
    }}>
      {/* Lang toggle, top right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LangToggle />
      </div>

      <main style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        maxWidth: 420, width: '100%', marginInline: 'auto', textAlign: 'center',
      }}>
        <p style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: 11, fontWeight: 600,
          letterSpacing: '3px', textTransform: 'uppercase',
          color: '#6F4E37', margin: 0, marginBottom: 28,
        }}>
          Espresso Atlas
        </p>

        <div style={{ marginBottom: 28 }}>
          <CupLogo size={72} interactive={false} />
        </div>

        <h1 style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: 36, fontWeight: 700,
          color: '#1a1714', lineHeight: 1.15, letterSpacing: -0.5,
          margin: 0, marginBottom: 22,
          maxWidth: 360,
        }}>
          {tr.welcomeTitle}
        </h1>

        <p style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontStyle: 'italic', fontSize: 16,
          color: '#888888', lineHeight: 1.5,
          margin: 0, marginBottom: 44,
          maxWidth: 340,
        }}>
          {tr.welcomeQuote}
        </p>

        <button
          type="button"
          onClick={handleAllow}
          style={{
            width: '100%', maxWidth: 320,
            background: '#1a1714', color: '#FAF0E6',
            border: 'none', borderRadius: 12,
            padding: '16px 24px', minHeight: 52,
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: 15, fontWeight: 600, letterSpacing: '0.3px',
            cursor: 'pointer',
            marginBottom: 14,
          }}
        >
          {tr.welcomeAllow}
        </button>

        <button
          type="button"
          onClick={onLater}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 12px', minHeight: 36,
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: 13, color: '#888888',
          }}
        >
          {tr.welcomeLater}
        </button>
      </main>
    </div>
  );
}
