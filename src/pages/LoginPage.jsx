import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';

const ADMIN_EMAIL = 'espresso.bu90h@passmail.net';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const tr = t(lang);

  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  function localizeAuthError(err) {
    const msg = err?.message || '';
    if (/invalid login credentials/i.test(msg)) return tr.errInvalidCredentials;
    return tr.errLoginFailed;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password,
      });
      if (authError) {
        console.warn('[login]', authError.message);
        setError(localizeAuthError(authError));
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.warn('[login]', err);
      setError(tr.errUnknown);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#888888', fontSize: 14, fontFamily: '"DM Sans", system-ui, sans-serif' }}>{tr.loading}</span>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF0E6',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      paddingLeft: 24, paddingRight: 24,
      maxWidth: '100vw', overflowX: 'hidden',
    }}>
      {/* Top bar — back link + lang toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => navigate('/?tab=map')}
          style={{
            background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
            color: '#555555', fontSize: 14,
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          {lang === 'de' ? '← Zurück' : '← Back'}
        </button>
        <LangToggle />
      </div>

      <main style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        maxWidth: 380, width: '100%', marginInline: 'auto', textAlign: 'center',
        paddingTop: 24, paddingBottom: 24,
      }}>
        {/* Caps header */}
        <p style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: 11, fontWeight: 600,
          letterSpacing: '3px', textTransform: 'uppercase',
          color: '#888888', margin: 0, marginBottom: 18,
        }}>
          {tr.loginJournal}
        </p>

        {/* Italic tagline */}
        <p style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontStyle: 'italic', fontSize: 17,
          color: '#4a4340', lineHeight: 1.5,
          margin: 0, marginBottom: 32, maxWidth: 320,
        }}>
          {tr.loginTagline}
        </p>

        {/* Coffee bean in circle */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '1px solid rgba(26,23,20,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
        }}>
          <svg
            width={36}
            height={36}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a837e"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="12" cy="12" rx="6" ry="9" transform="rotate(-20 12 12)" />
            <path d="M9.5 4 Q15 12 14.5 20" />
          </svg>
        </div>

        {/* Georg in handwritten script */}
        <h1 style={{
          fontFamily: '"Caveat", "DM Serif Display", cursive',
          fontWeight: 600, fontSize: 56,
          color: '#1a1714', lineHeight: 1,
          margin: 0, marginBottom: 32,
        }}>
          Georg
        </h1>

        {/* "Logged in as" */}
        <p style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: 10, fontWeight: 600,
          letterSpacing: '2.5px', textTransform: 'uppercase',
          color: '#888888', margin: 0, marginBottom: 6,
        }}>
          {tr.loginLoggedInAs}
        </p>
        <p style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: 13, color: '#555555',
          margin: 0, marginBottom: 28,
        }}>
          {ADMIN_EMAIL}
        </p>

        {/* Password form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <label style={{
            display: 'block', textAlign: 'left',
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: 10, fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: '#888888', marginBottom: 8,
          }}>
            {tr.passwordLabel}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(26,23,20,0.25)',
              padding: '8px 0',
              fontSize: 18, color: '#1a1714',
              fontFamily: '"DM Sans", system-ui, sans-serif',
              letterSpacing: '4px',
              outline: 'none', borderRadius: 0,
            }}
          />

          {error && (
            <p style={{
              marginTop: 12, marginBottom: 0,
              color: '#A94442', fontSize: 13,
              fontFamily: '"DM Sans", system-ui, sans-serif',
              textAlign: 'left',
            }}>
              {error}
            </p>
          )}

          <div style={{ height: 24 }} />

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !password}
            style={{
              width: '100%',
              background: '#1a1714', color: '#FAF0E6',
              border: 'none', borderRadius: 12,
              padding: '16px 24px',
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: 15, fontWeight: 600, letterSpacing: '0.3px',
              cursor: (saving || !password) ? 'default' : 'pointer',
              opacity: (saving || !password) ? 0.45 : 1,
              transition: 'opacity 0.15s',
              minHeight: 52,
            }}
          >
            {saving ? tr.loggingIn : tr.loginSubmit}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: 36, marginBottom: 0,
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontStyle: 'italic', fontSize: 14,
          color: '#888888', lineHeight: 1.5,
        }}>
          {tr.loginFooter}
        </p>
      </main>
    </div>
  );
}
