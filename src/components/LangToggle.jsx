import React from 'react';
import { useLang } from '../context/LangContext';

/**
 * LangToggle – minimal DE / EN switch.
 * Reads and writes from the global LangContext.
 *
 * @param {string} [className] – extra Tailwind classes
 */
export default function LangToggle({ className = '' }) {
  const { lang, setLang } = useLang();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
      className={`text-xs font-semibold font-sans px-2.5 py-1 rounded-lg border border-border
        text-gray-400 hover:text-ink hover:border-gray-400 transition-colors ${className}`}
      aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
    >
      {lang === 'de' ? 'EN' : 'DE'}
    </button>
  );
}
