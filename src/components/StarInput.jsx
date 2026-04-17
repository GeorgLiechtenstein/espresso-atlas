import React, { useState } from 'react';

/**
 * StarInput – interactive star rating input
 *
 * @param {object} props
 * @param {number}   props.value     – currently selected value (0 = none)
 * @param {function} props.onChange  – called with new value (1-5)
 * @param {number}   [props.size=40] – px size of each star button
 */
export default function StarInput({ value = 0, onChange, size = 40 }) {
  const [hovered, setHovered] = useState(0);

  const active = hovered || value;

  return (
    <span className="inline-flex items-center gap-1" role="group">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} Stern${n > 1 ? 'e' : ''}`}
          style={{ fontSize: size, lineHeight: 1, width: size, height: size }}
          className="flex items-center justify-center transition-transform duration-100 hover:scale-110 active:scale-95 select-none focus:outline-none"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange && onChange(n)}
        >
          <span
            style={{
              color: n <= active ? '#F59E0B' : '#D1D5DB',
              transition: 'color 0.1s',
            }}
          >
            {n <= active ? '★' : '☆'}
          </span>
        </button>
      ))}
    </span>
  );
}
