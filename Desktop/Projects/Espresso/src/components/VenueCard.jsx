import React from 'react';
import { useNavigate } from 'react-router-dom';
import ScoreBadge, { scoreLabel } from './ScoreBadge';
import { useLang } from '../context/LangContext';

export default function VenueCard({ venue, onClick }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { id, name, city, country, avg_score } = venue;

  const score = avg_score != null ? parseFloat(avg_score) : null;
  const label = scoreLabel(score, lang);

  return (
    <button
      type="button"
      onClick={onClick ?? (() => navigate(`/venue/${id}`))}
      className="w-full flex items-center gap-3 bg-white border border-border rounded-xl px-3 py-3 text-left
        transition-all duration-150 hover:shadow-md hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee min-h-[64px]"
    >
      <ScoreBadge score={score} size={44} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate font-sans text-sm leading-snug">{name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate font-sans">{city}, {country}</p>
        {label && <p className="text-xs text-gray-500 font-medium font-sans mt-0.5">{label}</p>}
      </div>

      <svg className="shrink-0 text-gray-300" width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
