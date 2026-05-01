import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const tr = t(lang);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  // Map Supabase auth error messages (always English from the API) to a
  // localized string. Default falls back to a generic 'login failed' so
  // users never see raw English in DE mode.
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
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
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
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="text-gray-400 text-sm">{tr.loading}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      {/* Lang toggle — top right */}
      <div className="absolute top-4 right-4">
        <LangToggle />
      </div>

      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-4xl">☕</span>
        <h1 className="font-serif text-3xl text-ink mt-2">Espresso Atlas</h1>
        <p className="text-sm text-gray-400 mt-1 font-sans">{tr.loginSubtitle}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-ink mb-5 font-sans">{tr.loginCard}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-gray-500 uppercase tracking-wide font-sans">
              {tr.emailLabel}
            </label>
            <input id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]"
              placeholder={tr.emailPlaceholder} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-gray-500 uppercase tracking-wide font-sans">
              {tr.passwordLabel}
            </label>
            <input id="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-3 text-sm text-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-coffee/40 font-sans min-h-[48px]"
              placeholder="••••••••" />
          </div>

          {error && (
            <p className="text-sm text-score-red bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-sans">
              {error}
            </p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-ink text-white rounded-xl py-3.5 text-sm font-semibold font-sans disabled:opacity-50 transition-opacity hover:opacity-90 mt-1 min-h-[48px]">
            {saving ? tr.loggingIn : tr.loginButton}
          </button>
        </form>
      </div>

      <Link to="/" className="mt-5 text-sm text-gray-400 hover:text-coffee transition-colors font-sans">
        {tr.backToMapLink}
      </Link>
    </div>
  );
}
