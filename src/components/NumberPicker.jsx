/**
 * NumberPicker — 1–10 tap-to-select rating input for mobile.
 * Numbers up to and including `value` are highlighted in coffee colour.
 */
export default function NumberPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold font-sans transition-all select-none
            ${n === value
              ? 'bg-coffee text-white shadow-sm scale-105'
              : n < (value ?? 0)
              ? 'bg-coffee/20 text-coffee'
              : 'bg-gray-100 text-gray-400'
            }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
