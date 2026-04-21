/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coffee: '#6B4A2A',
        ink:    '#1a1714',
        surface:'#F7F3EC',
        border: '#E0D8CC',
        score: {
          red:   '#E53935',
          amber: '#FFC107',
          green: '#43A047',
          gold:  '#F59E0B',
          avoid: '#8B2A2A',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
