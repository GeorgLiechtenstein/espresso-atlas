import React from 'react';
import Stars from './Stars';
import { scoreColor } from './ScoreBadge';
import { useLang } from '../context/LangContext';
import { t } from '../lib/i18n';

const MONTHS_DE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso, lang) {
  if (!iso) return '';
  const d     = new Date(iso);
  const day   = String(d.getDate()).padStart(2, '0');
  const months = lang === 'en' ? MONTHS_EN : MONTHS_DE;
  const month = months[d.getMonth()];
  const year  = d.getFullYear();
  return `${day}. ${month} ${year}`;
}

export default function ReviewCard({ review }) {
  const { lang } = useLang();
  const tr = t(lang);
  const { optics, taste, verdict, avg_score, comment, photo_url, price, currency, created_at } = review;
  const score = avg_score !== null && avg_score !== undefined ? parseFloat(avg_score) : null;
  const color = scoreColor(score);

  return (
    <div className="animate-fade-up bg-white rounded-xl border border-border p-4 flex flex-col gap-3">
      {/* Top row: sub-scores + big avg */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 text-sm text-gray-500 font-sans">
          {[
            [tr.optics,  optics],
            [tr.taste,   taste],
            [tr.verdict, verdict],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-20 text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
              <Stars score={val} size={13} />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-3xl font-bold leading-none"
            style={{ color, fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {score !== null ? score.toFixed(1) : '—'}
          </span>
          <span className="text-xs text-gray-400">{formatDate(created_at, lang)}</span>
        </div>
      </div>

      {photo_url && (
        <img src={photo_url} alt="Espresso"
          className="w-full rounded-lg object-cover max-h-48" loading="lazy" />
      )}

      {comment && (
        <p className="text-sm text-gray-600 italic leading-relaxed font-sans">„{comment}"</p>
      )}

      {price != null && (
        <span className="text-sm font-medium text-coffee">
          {parseFloat(price).toFixed(2)} {currency || 'EUR'}
        </span>
      )}
    </div>
  );
}
