import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import LangToggle from '../components/LangToggle';
import { supabase } from '../lib/supabase';

export default function AboutPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const tr = t(lang);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 18, lineHeight: 1 }}>☕</span>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm hover:text-ink transition-colors font-sans" style={{ color: '#555555' }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              {tr.backToMap}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LangToggle />
            {user && (
              <button
                onClick={handleSignOut}
                style={{ fontSize: 12, color: '#555555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                className="font-sans hover:text-ink transition-colors"
              >
                {tr.signOut}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 py-12 pb-24">
        <p className="text-sm font-sans mb-10 tracking-wide uppercase" style={{ color: '#555555' }}>
          {tr.aboutTagline}
        </p>

        <div className="space-y-10">
          {tr.aboutSections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-serif text-2xl text-ink mb-3 leading-tight">{s.heading}</h2>
              {s.body.split('\n\n').map((para, i) => (
                <p key={i} className="text-[15px] text-gray-600 font-sans leading-relaxed mb-3 last:mb-0">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 font-serif text-xl text-ink">{tr.aboutSignature}</p>

        <div className="mt-14 pt-8 border-t border-border">
          <Link to="/" className="text-sm text-coffee hover:underline font-sans">
            {tr.backToMap}
          </Link>
        </div>
      </main>
    </div>
  );
}
