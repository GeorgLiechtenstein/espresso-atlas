// Central design tokens — colours, fonts, score thresholds, bucket /
// balance / come-back metadata, plus the small helpers that derive
// labels and bar colours from numeric values. Components import from
// here instead of duplicating the same constants and bucket logic.
//
// Keep this file dependency-free; it must be safe to import from any
// JSX/JS file in the project without circular issues.

// ─── Colours ────────────────────────────────────────────────────────────────
export const COLORS = {
  // Surfaces
  surface:    '#FAF0E6',  // warm-cream page background
  surfaceAlt: '#EDE4D3',  // sunken input / card background
  border:     '#E0D8CC',  // hairline borders

  // Text
  ink:        '#1a1714',  // strongest text
  textMuted:  '#555555',  // secondary text
  textSubtle: '#666666',  // tertiary text
  textHint:   '#888888',  // hints / placeholders / disabled

  // Brand accents
  coffee:    '#6B4A2A',   // primary coffee brown (used for "good" bucket etc.)
  coffeeAlt: '#6F4E37',   // slightly warmer brown (used for bars / Caveat tagline)

  // Score-bucket display colours
  bucketExcellent: '#1a1714',
  bucketGood:      '#6B4A2A',
  bucketMehText:   '#8A7A62',
  bucketMehFill:   '#C4B5A0',
  bucketAvoid:     '#8B2A2A',

  // Criterion-bar fill colours (body / crema 1..10, balance |val|)
  barBrown:    '#6F4E37',  // 8..10 or |balance| ≤ 1
  barSand:     '#C4B5A0',  // 4..7  or |balance| 2..3
  barMutedRed: '#A94442',  // 1..3  or |balance| 4..5
  barTrack:    '#E0E0E0',  // empty bar background

  // Balance descriptor colours (text only — separate from bar fills)
  balanceOk:   '#6F4E37',  // Ausgewogen / Balanced
  balanceMeh:  '#888888',  // Leicht sauer / bitter
  balanceWarn: '#A94442',  // Zu sauer / bitter
};

// ─── Fonts ─────────────────────────────────────────────────────────────────
export const FONTS = {
  serif:  '"DM Serif Display", Georgia, serif',
  sans:   '"DM Sans", system-ui, sans-serif',
  script: '"Caveat", "DM Serif Display", cursive',
};

// ─── Score thresholds ─────────────────────────────────────────────────────
export const SCORE_THRESHOLDS = {
  excellent: 8.5,
  good:      7,
  meh:       4,
};

// ─── Score buckets ────────────────────────────────────────────────────────
// Single source of truth used by the legend, the chip, the score number,
// and the pin colour on the map. Keys ordered from best to worst.
export const BUCKETS = {
  excellent: {
    fill:      COLORS.bucketExcellent,
    textColor: COLORS.bucketExcellent,
    label:     { de: 'Exzellent', en: 'Excellent' },
  },
  good: {
    fill:      COLORS.bucketGood,
    textColor: COLORS.bucketGood,
    label:     { de: 'Gut', en: 'Good' },
  },
  meh: {
    fill:      COLORS.bucketMehFill,
    textColor: COLORS.bucketMehText,
    label:     { de: 'Mittel', en: 'Average' },
  },
  avoid: {
    fill:      COLORS.bucketAvoid,
    textColor: COLORS.bucketAvoid,
    label:     { de: 'Meiden', en: 'Avoid' },
  },
};

export const BUCKET_KEYS = ['excellent', 'good', 'meh', 'avoid'];

export function scoreBucket(score) {
  if (score === null || score === undefined) return null;
  const n = parseFloat(score);
  if (n >= SCORE_THRESHOLDS.excellent) return 'excellent';
  if (n >= SCORE_THRESHOLDS.good)      return 'good';
  if (n >= SCORE_THRESHOLDS.meh)       return 'meh';
  return 'avoid';
}

// ─── Balance descriptors (-5..+5 spectrum) ────────────────────────────────
export const BALANCE_META = {
  balanced: {
    color: COLORS.balanceOk,
    label: { de: 'Ausgewogen', en: 'Balanced' },
  },
  slightAcidic: {
    color: COLORS.balanceMeh,
    label: { de: 'Leicht sauer', en: 'Slightly acidic' },
  },
  slightBitter: {
    color: COLORS.balanceMeh,
    label: { de: 'Leicht bitter', en: 'Slightly bitter' },
  },
  tooAcidic: {
    color: COLORS.balanceWarn,
    label: { de: 'Zu sauer', en: 'Too acidic' },
  },
  tooBitter: {
    color: COLORS.balanceWarn,
    label: { de: 'Zu bitter', en: 'Too bitter' },
  },
};

export function balanceMeta(val) {
  if (val == null) return null;
  const a = Math.abs(val);
  if (a <= 1) return BALANCE_META.balanced;
  if (a <= 3) return val > 0 ? BALANCE_META.slightBitter : BALANCE_META.slightAcidic;
  return val > 0 ? BALANCE_META.tooBitter : BALANCE_META.tooAcidic;
}

// Body / crema bar fill colour by raw 1..10 value.
export function criteriaBarColor(val) {
  if (val >= 8) return COLORS.barBrown;
  if (val >= 4) return COLORS.barSand;
  return COLORS.barMutedRed;
}

// ─── Wiederkommen / Come-back ─────────────────────────────────────────────
// Currently not rendered in the UI (the bucket chip already says it), but
// kept here as a single source of truth for any future overlay or badge.
// Levels collapse to three steps derived from avg_score:
//   ≥7  → Jederzeit / Anytime    (good or excellent)
//   ≥4  → Geht so   / So-so      (mediocre)
//   <4  → Meiden    / Avoid      (avoid)
export const COMEBACK = {
  good:  {
    color: COLORS.ink,
    label: { de: 'Jederzeit', en: 'Anytime' },
  },
  meh: {
    color: COLORS.barSand,
    label: { de: 'Geht so', en: 'So-so' },
  },
  avoid: {
    color: COLORS.barMutedRed,
    label: { de: 'Meiden', en: 'Avoid' },
  },
};

export function comebackFromScore(score) {
  if (score === null || score === undefined) return null;
  const n = parseFloat(score);
  if (n >= SCORE_THRESHOLDS.good) return COMEBACK.good;
  if (n >= SCORE_THRESHOLDS.meh)  return COMEBACK.meh;
  return COMEBACK.avoid;
}
